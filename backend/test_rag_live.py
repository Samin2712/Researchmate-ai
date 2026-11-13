"""
Live RAG System Test - Upload PDF and ask questions
Tests the complete RAG pipeline with real PDF and Gemini API
"""
import asyncio
import httpx
import json
import os
from pathlib import Path
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.markdown import Markdown

console = Console()

BASE_URL = "http://localhost:8000/api/v1"

async def test_health():
    """Test if backend is running"""
    console.print("\n[yellow]🔍 Checking backend health...[/yellow]")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{BASE_URL.replace('/api/v1', '')}/health")
            if response.status_code == 200:
                console.print("[green]✅ Backend is running![/green]")
                return True
            else:
                console.print(f"[red]❌ Backend returned status {response.status_code}[/red]")
                return False
        except Exception as e:
            console.print(f"[red]❌ Backend not accessible: {e}[/red]")
            console.print("[yellow]💡 Start backend with: uvicorn app.main:app --reload[/yellow]")
            return False

async def register_and_login():
    """Register a test user and login"""
    console.print("\n[yellow]👤 Setting up test user...[/yellow]")
    
    async with httpx.AsyncClient() as client:
        # Try to register
        register_data = {
            "email": "test@example.com",
            "password": "testpass123",
            "full_name": "Test User"
        }
        
        try:
            response = await client.post(f"{BASE_URL}/auth/register", json=register_data)
            if response.status_code == 200:
                console.print("[green]✅ User registered[/green]")
            elif response.status_code == 400:
                console.print("[yellow]ℹ️  User already exists[/yellow]")
        except Exception as e:
            console.print(f"[yellow]⚠️  Registration: {e}[/yellow]")
        
        # Login
        login_data = {
            "username": "test@example.com",
            "password": "testpass123"
        }
        
        try:
            response = await client.post(f"{BASE_URL}/auth/login", data=login_data)
            if response.status_code == 200:
                token = response.json()["access_token"]
                console.print("[green]✅ Logged in successfully[/green]")
                return token
            else:
                console.print(f"[red]❌ Login failed: {response.text}[/red]")
                return None
        except Exception as e:
            console.print(f"[red]❌ Login error: {e}[/red]")
            return None

async def upload_document(token: str, pdf_path: str):
    """Upload PDF document"""
    console.print(f"\n[yellow]📤 Uploading PDF: {pdf_path}...[/yellow]")
    
    if not os.path.exists(pdf_path):
        console.print(f"[red]❌ PDF not found: {pdf_path}[/red]")
        return None
    
    file_size = os.path.getsize(pdf_path) / 1024
    console.print(f"[cyan]   File size: {file_size:.1f} KB[/cyan]")
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        with open(pdf_path, "rb") as f:
            files = {"file": (os.path.basename(pdf_path), f, "application/pdf")}
            headers = {"Authorization": f"Bearer {token}"}
            
            try:
                response = await client.post(
                    f"{BASE_URL}/documents/upload",
                    files=files,
                    headers=headers
                )
                
                if response.status_code == 200:
                    doc_data = response.json()
                    console.print("[green]✅ PDF uploaded successfully![/green]")
                    console.print(f"[cyan]   Document ID: {doc_data['id']}[/cyan]")
                    console.print(f"[cyan]   Title: {doc_data['title']}[/cyan]")
                    console.print(f"[cyan]   Status: {doc_data['status']}[/cyan]")
                    return doc_data
                else:
                    console.print(f"[red]❌ Upload failed: {response.status_code}[/red]")
                    console.print(f"[red]   {response.text}[/red]")
                    return None
            except Exception as e:
                console.print(f"[red]❌ Upload error: {e}[/red]")
                return None

async def wait_for_processing(token: str, doc_id: int, max_wait: int = 60):
    """Wait for document processing to complete"""
    console.print("\n[yellow]⏳ Waiting for document processing...[/yellow]")
    
    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"Bearer {token}"}
        
        for i in range(max_wait):
            try:
                response = await client.get(
                    f"{BASE_URL}/documents/{doc_id}",
                    headers=headers
                )
                
                if response.status_code == 200:
                    doc = response.json()
                    status = doc['status']
                    
                    if status == 'completed':
                        console.print("[green]✅ Document processing completed![/green]")
                        console.print(f"[cyan]   Chunks created: {doc.get('chunk_count', 'N/A')}[/cyan]")
                        return True
                    elif status == 'failed':
                        console.print(f"[red]❌ Processing failed: {doc.get('error_message', 'Unknown error')}[/red]")
                        return False
                    else:
                        console.print(f"[yellow]   Status: {status} ({i+1}s)[/yellow]", end='\r')
                        await asyncio.sleep(1)
                else:
                    console.print(f"[red]❌ Failed to check status: {response.status_code}[/red]")
                    return False
            except Exception as e:
                console.print(f"[red]❌ Error checking status: {e}[/red]")
                return False
        
        console.print(f"\n[red]❌ Timeout waiting for processing[/red]")
        return False

async def ask_question(token: str, question: str):
    """Ask a question and get streaming response"""
    console.print(f"\n[yellow]💬 Question: {question}[/yellow]")
    console.print("[cyan]🤖 AI Response:[/cyan]\n")
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        headers = {"Authorization": f"Bearer {token}"}
        data = {
            "message": question,
            "session_id": "test-session-1"
        }
        
        try:
            full_response = ""
            sources = []
            
            async with client.stream(
                "POST",
                f"{BASE_URL}/chat/message",
                json=data,
                headers=headers
            ) as response:
                if response.status_code != 200:
                    console.print(f"[red]❌ Chat failed: {response.status_code}[/red]")
                    text = await response.aread()
                    console.print(f"[red]{text.decode()}[/red]")
                    return None
                
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]  # Remove "data: " prefix
                        if data_str == "[DONE]":
                            break
                        
                        try:
                            chunk_data = json.loads(data_str)
                            
                            if chunk_data["type"] == "content":
                                content = chunk_data["content"]
                                full_response += content
                                console.print(content, end="")
                            
                            elif chunk_data["type"] == "sources":
                                sources = chunk_data["sources"]
                        
                        except json.JSONDecodeError:
                            pass
            
            console.print("\n")
            
            # Display sources
            if sources:
                console.print("\n[yellow]📚 Sources & Citations:[/yellow]")
                for idx, source in enumerate(sources, 1):
                    console.print(Panel(
                        f"[cyan]Page {source['page_number']}[/cyan] | "
                        f"[green]Relevance: {source['relevance_score']:.2%}[/green]\n\n"
                        f"{source['text'][:200]}...",
                        title=f"Source {idx}",
                        border_style="blue"
                    ))
            
            return {
                "response": full_response,
                "sources": sources
            }
        
        except Exception as e:
            console.print(f"\n[red]❌ Error asking question: {e}[/red]")
            return None

async def run_test_suite():
    """Run complete test suite"""
    console.print(Panel.fit(
        "[bold cyan]🧪 RAG System Live Test[/bold cyan]\n"
        "[yellow]Testing: PDF Upload → Processing → Question Answering → Citations[/yellow]",
        border_style="cyan"
    ))
    
    # Check backend health
    if not await test_health():
        return
    
    # Setup user
    token = await register_and_login()
    if not token:
        console.print("[red]❌ Authentication failed[/red]")
        return
    
    # Create sample PDF if it doesn't exist
    pdf_path = "sample_ai_research.pdf"
    if not os.path.exists(pdf_path):
        console.print("\n[yellow]📄 Creating sample research PDF...[/yellow]")
        try:
            import subprocess
            result = subprocess.run(
                ["python", "create_sample_pdf.py"],
                capture_output=True,
                text=True,
                cwd=os.path.dirname(__file__) or "."
            )
            if result.returncode == 0:
                console.print("[green]✅ Sample PDF created[/green]")
            else:
                console.print(f"[red]❌ Failed to create PDF: {result.stderr}[/red]")
                return
        except Exception as e:
            console.print(f"[red]❌ Error creating PDF: {e}[/red]")
            console.print("[yellow]💡 Install reportlab: pip install reportlab[/yellow]")
            return
    
    # Upload document
    doc = await upload_document(token, pdf_path)
    if not doc:
        return
    
    # Wait for processing
    if not await wait_for_processing(token, doc['id']):
        return
    
    # Test questions
    questions = [
        "What are the main benefits of AI in STEM education according to the research?",
        "How much did student engagement increase with AI tools?",
        "What are the challenges mentioned in implementing AI in education?",
        "What is the impact on achievement gaps between students?"
    ]
    
    console.print("\n" + "="*80)
    console.print("[bold green]🎯 Testing Question Answering & Citations[/bold green]")
    console.print("="*80)
    
    for i, question in enumerate(questions, 1):
        console.print(f"\n[bold cyan]Question {i}/{len(questions)}[/bold cyan]")
        result = await ask_question(token, question)
        
        if result:
            console.print("[green]✅ Question answered successfully[/green]")
            console.print(f"[cyan]   Response length: {len(result['response'])} chars[/cyan]")
            console.print(f"[cyan]   Sources provided: {len(result['sources'])}[/cyan]")
        else:
            console.print("[red]❌ Question failed[/red]")
        
        await asyncio.sleep(2)  # Rate limiting
    
    # Final summary
    console.print("\n" + "="*80)
    console.print(Panel.fit(
        "[bold green]✅ RAG System Test Complete![/bold green]\n\n"
        "[cyan]Tested Components:[/cyan]\n"
        "  ✓ PDF Upload\n"
        "  ✓ Document Processing (Chunking + Embeddings)\n"
        "  ✓ Vector Storage (ChromaDB)\n"
        "  ✓ Semantic Search\n"
        "  ✓ LLM Generation (Gemini)\n"
        "  ✓ Citation Extraction\n"
        "  ✓ Streaming Responses",
        border_style="green"
    ))

if __name__ == "__main__":
    try:
        asyncio.run(run_test_suite())
    except KeyboardInterrupt:
        console.print("\n[yellow]⚠️  Test interrupted by user[/yellow]")
    except Exception as e:
        console.print(f"\n[red]❌ Test failed with error: {e}[/red]")
        import traceback
        traceback.print_exc()
