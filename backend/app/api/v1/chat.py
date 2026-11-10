"""
Chat API endpoints - RAG-powered Q&A
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import json
import logging

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.chat import ChatSession, ChatMessage, MessageRole
from app.schemas.chat import (
    ChatSessionCreate,
    ChatSessionResponse,
    ChatSessionWithMessages,
    ChatRequest,
    ChatResponse,
    ChatMessageResponse
)
from app.services.rag.engine import rag_engine

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/sessions", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_chat_session(
    session_data: ChatSessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new chat session
    """
    chat_session = ChatSession(
        user_id=current_user.id,
        title=session_data.title
    )
    
    db.add(chat_session)
    await db.commit()
    await db.refresh(chat_session)
    
    return chat_session


@router.get("/sessions", response_model=List[ChatSessionResponse])
async def list_chat_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all chat sessions for current user
    """
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.created_at.desc())
    )
    sessions = result.scalars().all()
    
    return sessions


@router.get("/sessions/{session_id}", response_model=ChatSessionWithMessages)
async def get_chat_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a specific chat session with all messages
    """
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id
        )
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    
    # Load messages
    messages_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    )
    messages = messages_result.scalars().all()
    
    return {
        **session.__dict__,
        "messages": messages
    }


@router.post("/ask", response_model=ChatResponse)
async def ask_question(
    chat_request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Ask a question using RAG (Retrieval-Augmented Generation)
    
    Retrieves relevant context from documents and generates answer using LLM
    """
    try:
        # Create or get session
        if chat_request.session_id:
            result = await db.execute(
                select(ChatSession).where(
                    ChatSession.id == chat_request.session_id,
                    ChatSession.user_id == current_user.id
                )
            )
            session = result.scalar_one_or_none()
            
            if not session:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Chat session not found"
                )
        else:
            # Create new session
            session = ChatSession(
                user_id=current_user.id,
                title=chat_request.message[:50] + "..." if len(chat_request.message) > 50 else chat_request.message
            )
            db.add(session)
            await db.commit()
            await db.refresh(session)
        
        # Save user message
        user_message = ChatMessage(
            session_id=session.id,
            role=MessageRole.USER,
            content=chat_request.message
        )
        db.add(user_message)
        await db.commit()
        
        # Get conversation history (last 3 exchanges)
        history_result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session.id)
            .order_by(ChatMessage.created_at.desc())
            .limit(6)  # Last 3 Q&A pairs
        )
        history_messages = history_result.scalars().all()
        
        # Format conversation history
        conversation_history = []
        for i in range(0, len(history_messages), 2):
            if i + 1 < len(history_messages):
                conversation_history.append({
                    "question": history_messages[i+1].content,
                    "answer": history_messages[i].content
                })
        
        # Generate answer using RAG
        logger.info(f"🤖 Processing question: {chat_request.message[:100]}")
        
        rag_response = await rag_engine.answer_question(
            question=chat_request.message,
            user_id=str(current_user.id),
            document_ids=chat_request.document_ids,
            conversation_history=conversation_history[::-1]  # Reverse to chronological order
        )
        
        # Save assistant message
        assistant_message = ChatMessage(
            session_id=session.id,
            role=MessageRole.ASSISTANT,
            content=rag_response['answer'],
            sources=json.dumps(rag_response['sources']) if rag_response['sources'] else None,
            confidence_score=rag_response.get('confidence')
        )
        db.add(assistant_message)
        await db.commit()
        await db.refresh(assistant_message)
        
        logger.info(f"✅ Answer generated with {len(rag_response['sources'])} sources")
        
        return {
            "session_id": session.id,
            "message": assistant_message,
            "sources": rag_response['sources'],
            "metadata": {
                "chunks_retrieved": rag_response.get('chunks_retrieved', 0),
                "provider": rag_response.get('provider', 'unknown')
            }
        }
    
    except Exception as e:
        logger.error(f"❌ Error in ask_question: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate answer: {str(e)}"
        )


@router.post("/stream")
async def stream_answer(
    chat_request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Stream answer using Server-Sent Events (SSE)
    
    Provides real-time streaming of the generated answer
    """
    async def generate():
        try:
            # Create or get session
            if chat_request.session_id:
                result = await db.execute(
                    select(ChatSession).where(
                        ChatSession.id == chat_request.session_id,
                        ChatSession.user_id == current_user.id
                    )
                )
                session = result.scalar_one_or_none()
                
                if not session:
                    yield f"data: {json.dumps({'type': 'error', 'error': 'Session not found'})}\n\n"
                    return
            else:
                session = ChatSession(
                    user_id=current_user.id,
                    title=chat_request.message[:50] + "..."
                )
                db.add(session)
                await db.commit()
                await db.refresh(session)
            
            # Save user message
            user_message = ChatMessage(
                session_id=session.id,
                role=MessageRole.USER,
                content=chat_request.message
            )
            db.add(user_message)
            await db.commit()
            
            # Send session info
            yield f"data: {json.dumps({'type': 'session', 'session_id': session.id})}\n\n"
            
            # Stream answer from RAG engine
            full_answer = ""
            sources = []
            confidence = 0.0
            
            async for chunk in rag_engine.stream_answer(
                question=chat_request.message,
                user_id=str(current_user.id),
                document_ids=chat_request.document_ids
            ):
                if chunk['type'] == 'answer' and not chunk.get('done', False):
                    full_answer += chunk['content']
                    yield f"data: {json.dumps(chunk)}\n\n"
                elif chunk['type'] == 'sources':
                    sources = chunk['sources']
                    confidence = chunk.get('confidence', 0.0)
                    yield f"data: {json.dumps(chunk)}\n\n"
                elif chunk['type'] == 'metadata':
                    yield f"data: {json.dumps(chunk)}\n\n"
                elif chunk['type'] == 'error':
                    yield f"data: {json.dumps(chunk)}\n\n"
                    return
            
            # Save assistant message
            assistant_message = ChatMessage(
                session_id=session.id,
                role=MessageRole.ASSISTANT,
                content=full_answer,
                sources=json.dumps(sources) if sources else None,
                confidence_score=confidence
            )
            db.add(assistant_message)
            await db.commit()
            
            # Send completion
            yield f"data: {json.dumps({'type': 'complete'})}\n\n"
        
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a chat session
    """
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id
        )
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    
    await db.delete(session)
    await db.commit()
    
    return None
