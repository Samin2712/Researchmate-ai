"""
Analysis API endpoints for comparison matrix and literature review.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, AnalysisKind, AnalysisStatus
from app.schemas.analysis import (
    AnalysisRunCreate,
    AnalysisRunResponse,
    ReviewEditCreate,
    ReviewEditResponse,
    CandidateReviewUpdate,
    CandidateReviewResponse,
    ProjectBriefCreate,
    ProjectBriefResponse,
    SaveRelationshipEvidenceRequest,
)
from app.services.analysis_service import AnalysisService

router = APIRouter(prefix="/analysis", tags=["analysis"])


async def get_analysis_service(db: AsyncSession = Depends(get_db),
                               user: User = Depends(get_current_user)) -> AnalysisService:
    from app.services.ai_credentials import resolve_llm
    return AnalysisService(db, await resolve_llm(db, user.id))


async def execute_analysis(run_id: int, user_id: int, request_llm=None):
    # A worker owns its session, independently of the completed HTTP request.
    from app.core.database import AsyncSessionLocal
    from app.services.llm_service import llm_service
    async with AsyncSessionLocal() as db:
        service = AnalysisService(db, request_llm or llm_service)
        run = await service.get_run(run_id, user_id)
        if run and run.status == AnalysisStatus.PENDING:
            await service.run_analysis(run)


@router.post('/runs', response_model=AnalysisRunResponse, status_code=201)
async def create_analysis_run(
    request: AnalysisRunCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    service: AnalysisService = Depends(get_analysis_service),
):
    try:
        run = await service.create_run(current_user.id, request.kind,
            request.document_ids, request.parameters, force=request.force)
        if run.status == AnalysisStatus.PENDING:
            background_tasks.add_task(execute_analysis, run.id, current_user.id, service.llm)
        return AnalysisRunResponse.model_validate(run)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@router.get("/runs", response_model=List[AnalysisRunResponse])
async def list_analysis_runs(
    kind: Optional[AnalysisKind] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    service: AnalysisService = Depends(get_analysis_service),
):
    """List user's analysis runs, optionally filtered by kind."""
    runs = await service.list_runs(current_user.id, kind=kind, limit=limit)
    return [AnalysisRunResponse.model_validate(run) for run in runs]


@router.get("/runs/{run_id}", response_model=AnalysisRunResponse)
async def get_analysis_run(
    run_id: int,
    current_user: User = Depends(get_current_user),
    service: AnalysisService = Depends(get_analysis_service),
):
    """Get analysis run by ID with status and results."""
    run = await service.get_run(run_id, current_user.id)
    if not run:
        raise HTTPException(status_code=404, detail="Analysis run not found")

    return AnalysisRunResponse.model_validate(run)


@router.post("/runs/{run_id}/cancel", status_code=204)
async def cancel_analysis_run(
    run_id: int,
    current_user: User = Depends(get_current_user),
    service: AnalysisService = Depends(get_analysis_service),
):
    """Cancel a running analysis."""
    success = await service.cancel_run(run_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=400,
            detail="Analysis cannot be cancelled (not found or already completed)"
        )


@router.delete("/runs/{run_id}", status_code=204)
async def delete_analysis_run(
    run_id: int,
    current_user: User = Depends(get_current_user),
    service: AnalysisService = Depends(get_analysis_service),
):
    """Delete an analysis run and all associated data."""
    try:
        success = await service.delete_run(run_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc
    if not success:
        raise HTTPException(status_code=404, detail="Analysis run not found")


@router.post("/runs/{run_id}/edits", response_model=ReviewEditResponse, status_code=201)
async def save_review_edit(
    run_id: int,
    request: ReviewEditCreate,
    current_user: User = Depends(get_current_user),
    service: AnalysisService = Depends(get_analysis_service),
):
    """
    Save user edits to a literature review.

    Creates a new version while preserving the original generated content.
    """
    try:
        edit = await service.save_review_edit(
            run_id=run_id,
            user_id=current_user.id,
            edited_content=request.edited_content,
            citation_ids=request.citation_ids,
            user_modified_citations=request.user_modified_citations
        )
        return ReviewEditResponse.model_validate(edit)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/runs/{run_id}/edits/latest", response_model=Optional[ReviewEditResponse])
async def get_latest_review_edit(
    run_id: int,
    current_user: User = Depends(get_current_user),
    service: AnalysisService = Depends(get_analysis_service),
):
    """Get the latest saved edit for a literature review."""
    edit = await service.get_latest_edit(run_id, current_user.id)
    if not edit:
        return None
    return ReviewEditResponse.model_validate(edit)


@router.get('/runs/{run_id}/gaps', response_model=List[CandidateReviewResponse])
async def list_candidate_states(
    run_id: int,
    current_user: User = Depends(get_current_user),
    service: AnalysisService = Depends(get_analysis_service),
):
    try:
        return await service.list_candidate_states(run_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc


@router.patch("/runs/{run_id}/gaps/{candidate_id}", response_model=CandidateReviewResponse)
async def update_candidate_state(
    run_id: int,
    candidate_id: str,
    request: CandidateReviewUpdate,
    current_user: User = Depends(get_current_user),
    service: AnalysisService = Depends(get_analysis_service),
):
    """Update user review state (saved/dismissed/comment) for a gap candidate."""
    try:
        review = await service.update_candidate_state(
            run_id=run_id,
            candidate_id=candidate_id,
            user_id=current_user.id,
            status=request.status,
            comment=request.comment,
        )
        return CandidateReviewResponse.model_validate(review)
    except ValueError as exc:
        raise HTTPException(
            status_code=404 if "not found" in str(exc).lower() else 400,
            detail=str(exc),
        )


@router.post("/runs/{run_id}/gaps/{candidate_id}/brief", response_model=ProjectBriefResponse, status_code=201)
async def save_project_brief(
    run_id: int,
    candidate_id: str,
    request: ProjectBriefCreate,
    current_user: User = Depends(get_current_user),
    service: AnalysisService = Depends(get_analysis_service),
):
    """Save a candidate gap as a feasible student project brief."""
    try:
        brief = await service.save_project_brief(
            run_id=run_id,
            candidate_id=candidate_id,
            user_id=current_user.id,
            assumptions=request.assumptions,
            time_budget=request.time_budget,
            resource_budget=request.resource_budget,
        )
        return ProjectBriefResponse.model_validate(brief)
    except ValueError as exc:
        raise HTTPException(
            status_code=404 if "not found" in str(exc).lower() else 400,
            detail=str(exc),
        )


@router.get("/briefs", response_model=List[ProjectBriefResponse])
async def list_project_briefs(
    current_user: User = Depends(get_current_user),
    service: AnalysisService = Depends(get_analysis_service),
):
    """List all project briefs saved by the current user."""
    briefs = await service.list_project_briefs(current_user.id)
    return [ProjectBriefResponse.model_validate(b) for b in briefs]


@router.delete("/briefs/{brief_id}", status_code=204)
async def delete_project_brief(
    brief_id: int,
    current_user: User = Depends(get_current_user),
    service: AnalysisService = Depends(get_analysis_service),
):
    """Delete a saved project brief."""
    success = await service.delete_project_brief(brief_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Project brief not found")


@router.post("/runs/{run_id}/relationships/{relationship_id}/save")
async def save_relationship_evidence(
    run_id: int,
    relationship_id: str,
    request: SaveRelationshipEvidenceRequest,
    current_user: User = Depends(get_current_user),
    service: AnalysisService = Depends(get_analysis_service),
):
    """Save supporting evidence from both sides of a relationship to the evidence notebook."""
    try:
        await service.save_relationship_evidence(
            run_id=run_id,
            relationship_id=relationship_id,
            user_id=current_user.id,
            note=request.note,
        )
        return {"saved": True}
    except ValueError as exc:
        raise HTTPException(
            status_code=404 if "not found" in str(exc).lower() else 400,
            detail=str(exc),
        )
