"""
Comprehensive tests for Learning Assistance:
Feature 1: "Explain simply" mode + terminology help
Feature 2: Three paper-specific starter questions
"""
import json
from datetime import datetime
import pytest
from unittest.mock import patch, AsyncMock
from sqlalchemy import select, update
from httpx import AsyncClient

from app.models import Document, Chunk, ChatSession, ChatMessage
from app.models.document import DocumentStatus
from app.models.chat import MessageRole
from app.models.learning import (
    DocumentQuestionSet,
    DocumentGlossaryTerm,
    QuestionCategory,
    QuestionGenerationStatus,
)
from app.services.llm_service import llm_service
from app.services.learning_service import learning_service
from tests.test_collections_citations import _create_test_user, _create_test_doc


@pytest.fixture(autouse=True)
def mock_embedding_services():
    """Mock embedder and vector store so tests don't require external ChromaDB/HuggingFace."""
    mock_results = [
        {
            "id": "chunk_1",
            "text": "In a trial of 40 adults, accuracy improved by 5 percentage points (p < 0.05). Limitation: single-site trial.",
            "distance": 0.1,
            "metadata": {
                "document_id": "1",
                "page_number": 1,
                "title": "Test Paper",
                "authors": "Smith et al."
            }
        }
    ]
    with patch("app.services.rag.engine.embedder.embed_query", return_value=[0.1] * 384), \
         patch("app.services.rag.engine.vector_store.search", return_value=mock_results), \
         patch.object(learning_service, "_generate_questions_task", new_callable=AsyncMock):
        yield


class MockLearningLLM:
    """Deterministic LLM for learning assistance testing."""
    def __init__(self):
        self.generate_calls = []
        self.structured_calls = []
        self.fail_generation = False
        self.malformed_json = False

    async def generate(self, prompt, system_prompt, temperature=0.7, max_tokens=2000, stream=False):
        self.generate_calls.append({"prompt": prompt, "system_prompt": system_prompt})
        if self.fail_generation:
            raise RuntimeError("Provider connection failed")

        # Simple mode answer simulation
        if "EXPLANATION STYLE: EXPLAIN SIMPLY" in prompt or "BEGINNER MODE" in prompt:
            return (
                "Here is a plain-language summary of the findings:\n\n"
                "In a trial of 40 adults, accuracy improved by 5 percentage points (p < 0.05) [Page 1]. "
                "The authors noted this preliminary correlation does not establish definitive causation.\n\n"
                "*Analogy:* Think of the algorithm like a student practicing with flashcards.\n\n"
                "Citation: [Page 1]."
            )

        # Standard mode answer simulation
        if "Context from research papers" in prompt:
            return (
                "According to the experimental evaluation, accuracy increased by 5 percentage points [Page 1] "
                "across a sample size of 40 adults (p < 0.05). Single-site limitations were noted [Page 1]."
            )

        # Term explanation
        if "Explain what" in prompt or "Explain the term" in prompt:
            return "Support Vector Machine (SVM) is a machine learning method that finds the optimal boundary to classify data points into distinct categories."

        # General scientific definition
        if "not found in the analyzed excerpts" in prompt:
            return "A quantum bit (qubit) is the basic unit of quantum information, analogous to a classical digital bit."

        return "Default test response [Page 1]."

    async def stream_generate(self, prompt, system_prompt, temperature=0.7, max_tokens=2000):
        self.generate_calls.append({"prompt": prompt, "system_prompt": system_prompt})
        if self.fail_generation:
            raise RuntimeError("Streaming provider failed")
        yield "In a trial of 40 adults, "
        yield "accuracy improved by 5 percentage points [Page 1]. "
        yield "*Analogy:* Like a tuning fork."

    async def generate_structured_response(self, prompt, schema, max_tokens=None, temperature=None):
        self.structured_calls.append({"prompt": prompt, "schema": schema})
        if self.fail_generation:
            raise RuntimeError("Structured LLM generation failed")
        if self.malformed_json:
            return {"corrupted": True}

        return {
            "questions": [
                {
                    "category": "comprehension",
                    "question": "What is the primary cognitive accuracy gain reported in the 40-adult cohort?",
                    "evidence_quote": "accuracy improved by 5 percentage points",
                    "page_number": 1,
                },
                {
                    "category": "methodology",
                    "question": "How did the randomized trial design control for adult participant baseline variance?",
                    "evidence_quote": "In a trial of 40 adults",
                    "page_number": 1,
                },
                {
                    "category": "critical_thinking",
                    "question": "How does the single-site limitation constrain generalizability across broader populations?",
                    "evidence_quote": "Limitation: single-site trial",
                    "page_number": 1,
                },
            ]
        }

    def get_provider_info(self):
        return {"provider": "mock-learning-llm", "model": "mock-v1"}


# ---------------------------------------------------------------------------
# Feature 1: Explain Simply & Terminology Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_chat_ask_default_mode_is_standard(client: AsyncClient, test_db):
    user, headers = await _create_test_user(test_db, "user-mode-default@example.com")
    doc = await _create_test_doc(test_db, user.id, title="Cognitive Accuracy Trial", content_hash="hash1")
    test_db.add(Chunk(document_id=doc.id, text="Accuracy improved by 5 percentage points.", chunk_index=0, page_number=1))
    await test_db.commit()

    mock_llm = MockLearningLLM()
    with patch("app.services.rag.engine.llm_service.generate", side_effect=mock_llm.generate), \
         patch("app.services.rag.engine.llm_service.get_provider_info", side_effect=mock_llm.get_provider_info):
        res = await client.post(
            "/api/v1/chat/ask",
            json={"message": "What did the trial find?", "document_ids": [doc.id]},
            headers=headers,
        )
        assert res.status_code == 200
        data = res.json()
        assert data["message"]["explanation_mode"] == "standard"
        assert "5 percentage points" in data["message"]["content"]


@pytest.mark.asyncio
async def test_chat_ask_explicit_override_simple_mode(client: AsyncClient, test_db):
    user, headers = await _create_test_user(test_db, "user-mode-simple@example.com")
    doc = await _create_test_doc(test_db, user.id, title="Cognitive Accuracy Trial", content_hash="hash2")
    test_db.add(Chunk(document_id=doc.id, text="Accuracy improved by 5 percentage points.", chunk_index=0, page_number=1))
    await test_db.commit()

    mock_llm = MockLearningLLM()
    with patch("app.services.rag.engine.llm_service.generate", side_effect=mock_llm.generate), \
         patch("app.services.rag.engine.llm_service.get_provider_info", side_effect=mock_llm.get_provider_info):
        res = await client.post(
            "/api/v1/chat/ask",
            json={"message": "Explain the findings", "document_ids": [doc.id], "explanation_mode": "simple"},
            headers=headers,
        )
        assert res.status_code == 200
        data = res.json()
        assert data["message"]["explanation_mode"] == "simple"
        # Preserves exact numerical finding
        assert "5 percentage points" in data["message"]["content"]
        assert "40 adults" in data["message"]["content"]
        # Clearly marked analogy
        assert "*Analogy:*" in data["message"]["content"]
        # Preserves scientific qualifiers / uncertainty
        assert "preliminary correlation" in data["message"]["content"]


@pytest.mark.asyncio
async def test_chat_ask_invalid_mode_rejected(client: AsyncClient, test_db):
    user, headers = await _create_test_user(test_db, "user-invalid-mode@example.com")
    res = await client.post(
        "/api/v1/chat/ask",
        json={"message": "Hello", "explanation_mode": "invalid_experimental_mode"},
        headers=headers,
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_user_preference_persistence_and_precedence(client: AsyncClient, test_db):
    user, headers = await _create_test_user(test_db, "user-pref@example.com")
    doc = await _create_test_doc(test_db, user.id, title="Paper 1")
    test_db.add(Chunk(document_id=doc.id, text="Testing finding.", chunk_index=0, page_number=1))
    await test_db.commit()

    # 1. Verify default is "standard"
    res_me = await client.get("/api/v1/auth/me", headers=headers)
    assert res_me.status_code == 200
    assert res_me.json()["default_explanation_mode"] == "standard"

    # 2. Update default preference to "simple"
    res_patch = await client.patch(
        "/api/v1/auth/me",
        json={"full_name": user.full_name or "Test User", "default_explanation_mode": "simple"},
        headers=headers,
    )
    assert res_patch.status_code == 200
    assert res_patch.json()["default_explanation_mode"] == "simple"

    mock_llm = MockLearningLLM()
    with patch("app.services.rag.engine.llm_service.generate", side_effect=mock_llm.generate), \
         patch("app.services.rag.engine.llm_service.get_provider_info", side_effect=mock_llm.get_provider_info):
        # 3. Request without explanation_mode should inherit user preference "simple"
        res_ask = await client.post(
            "/api/v1/chat/ask",
            json={"message": "Tell me about this paper", "document_ids": [doc.id]},
            headers=headers,
        )
        assert res_ask.status_code == 200
        assert res_ask.json()["message"]["explanation_mode"] == "simple"

        # 4. Request with explicit override "standard" should override user preference
        res_override = await client.post(
            "/api/v1/chat/ask",
            json={"message": "Tell me with full academic rigor", "document_ids": [doc.id], "explanation_mode": "standard"},
            headers=headers,
        )
        assert res_override.status_code == 200
        assert res_override.json()["message"]["explanation_mode"] == "standard"


@pytest.mark.asyncio
async def test_chat_stream_preserves_mode(client: AsyncClient, test_db):
    user, headers = await _create_test_user(test_db, "user-stream-mode@example.com")
    doc = await _create_test_doc(test_db, user.id, title="Stream Paper")
    test_db.add(Chunk(document_id=doc.id, text="Data chunk.", chunk_index=0, page_number=1))
    await test_db.commit()

    mock_llm = MockLearningLLM()
    with patch("app.services.rag.engine.llm_service.stream_generate", side_effect=mock_llm.stream_generate):
        res = await client.post(
            "/api/v1/chat/stream",
            json={"message": "Stream this simply", "document_ids": [doc.id], "explanation_mode": "simple"},
            headers=headers,
        )
        assert res.status_code == 200
        content = res.text
        assert "data:" in content
        assert '"explanation_mode": "simple"' in content


@pytest.mark.asyncio
async def test_legacy_message_history_remains_interpretable(client: AsyncClient, test_db):
    user, headers = await _create_test_user(test_db, "user-legacy@example.com")
    session = ChatSession(user_id=user.id, title="Legacy Session")
    test_db.add(session)
    await test_db.commit()

    # Legacy message without explicit explanation_mode
    legacy_msg = ChatMessage(session_id=session.id, role=MessageRole.ASSISTANT, content="Legacy response text.")
    test_db.add(legacy_msg)
    await test_db.commit()

    res = await client.get(f"/api/v1/chat/sessions/{session.id}", headers=headers)
    assert res.status_code == 200
    msgs = res.json()["messages"]
    assert len(msgs) == 1
    assert msgs[0]["explanation_mode"] == "standard"


@pytest.mark.asyncio
async def test_explain_term_grounded_in_paper(client: AsyncClient, test_db):
    user, headers = await _create_test_user(test_db, "user-term-grounded@example.com")
    doc = await _create_test_doc(test_db, user.id, title="SVM Benchmark Paper", content_hash="svm_rev_1")
    test_db.add(Chunk(
        document_id=doc.id,
        text="We trained a Support Vector Machine classifier with an RBF kernel to separate the classes.",
        chunk_index=0,
        page_number=3
    ))
    await test_db.commit()

    mock_llm = MockLearningLLM()
    with patch("app.services.learning_service.llm_service.generate", side_effect=mock_llm.generate), \
         patch("app.services.learning_service.llm_service.get_provider_info", side_effect=mock_llm.get_provider_info):
        res = await client.post(
            "/api/v1/chat/explain-term",
            json={"document_id": doc.id, "term": "Support Vector Machine"},
            headers=headers,
        )
        assert res.status_code == 200
        data = res.json()
        assert data["term"] == "Support Vector Machine"
        assert data["grounded_in_paper"] is True
        assert data["status"] == "grounded"
        assert data["page_number"] == 3
        assert "Support Vector Machine" in data["source_quote"]

        # Cache check: second call should be served from DB without re-invoking LLM
        initial_call_count = len(mock_llm.generate_calls)
        res_cached = await client.post(
            "/api/v1/chat/explain-term",
            json={"document_id": doc.id, "term": "support vector machine"},
            headers=headers,
        )
        assert res_cached.status_code == 200
        assert len(mock_llm.generate_calls) == initial_call_count


@pytest.mark.asyncio
async def test_explain_term_absent_from_paper_returns_general_definition(client: AsyncClient, test_db):
    user, headers = await _create_test_user(test_db, "user-term-absent@example.com")
    doc = await _create_test_doc(test_db, user.id, title="Classical Physics Paper", content_hash="phys_1")
    test_db.add(Chunk(document_id=doc.id, text="Newtonian mechanics and planetary orbits.", chunk_index=0, page_number=1))
    await test_db.commit()

    mock_llm = MockLearningLLM()
    with patch("app.services.learning_service.llm_service.generate", side_effect=mock_llm.generate), \
         patch("app.services.learning_service.llm_service.get_provider_info", side_effect=mock_llm.get_provider_info):
        res = await client.post(
            "/api/v1/chat/explain-term",
            json={"document_id": doc.id, "term": "qubit"},
            headers=headers,
        )
        assert res.status_code == 200
        data = res.json()
        assert data["term"] == "qubit"
        assert data["grounded_in_paper"] is False
        assert data["status"] == "general"
        assert data["source_quote"] is None
        assert "General definition" in data["explanation"]


@pytest.mark.asyncio
async def test_explain_term_owner_isolation_and_not_found(client: AsyncClient, test_db):
    user_a, headers_a = await _create_test_user(test_db, "owner-term-a@example.com")
    _, headers_b = await _create_test_user(test_db, "owner-term-b@example.com")
    doc = await _create_test_doc(test_db, user_a.id, title="Private Doc")
    test_db.add(Chunk(document_id=doc.id, text="Private research data.", chunk_index=0, page_number=1))
    await test_db.commit()

    # User B cannot explain term on User A's document
    res_b = await client.post(
        "/api/v1/chat/explain-term",
        json={"document_id": doc.id, "term": "research"},
        headers=headers_b,
    )
    assert res_b.status_code == 403

    # Non-existent document
    res_none = await client.post(
        "/api/v1/chat/explain-term",
        json={"document_id": 999999, "term": "research"},
        headers=headers_a,
    )
    assert res_none.status_code == 404


# ---------------------------------------------------------------------------
# Feature 2: Paper-Specific Starter Questions Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_starter_questions_generation_three_categories_and_evidence(client: AsyncClient, test_db):
    user, headers = await _create_test_user(test_db, "user-questions@example.com")
    doc = await _create_test_doc(test_db, user.id, title="Cognitive Accuracy Benchmark", content_hash="rev_questions_1")
    test_db.add(Chunk(document_id=doc.id, text="In a trial of 40 adults, accuracy improved by 5 percentage points. Limitation: single-site trial.", chunk_index=0, page_number=1))
    test_db.add(Chunk(document_id=doc.id, text="The randomized double-blind protocol controlled for baseline variance.", chunk_index=1, page_number=2))
    test_db.add(Chunk(document_id=doc.id, text="Limitation: single-site trial restricts broader demographic inference.", chunk_index=2, page_number=3))
    await test_db.commit()

    mock_llm = MockLearningLLM()
    with patch("app.services.learning_service.llm_service.generate_structured_response", side_effect=mock_llm.generate_structured_response), \
         patch("app.services.learning_service.llm_service.get_provider_info", side_effect=mock_llm.get_provider_info):
        # GET never schedules a paid call. Explicit POST or ingestion schedules work.
        res = await client.get(f"/api/v1/documents/{doc.id}/questions", headers=headers)
        assert res.status_code == 200
        initial_data = res.json()
        assert initial_data["document_id"] == doc.id
        assert initial_data["status"] == "unavailable"
        res = await client.post(f"/api/v1/documents/{doc.id}/questions/regenerate", headers=headers)
        assert res.status_code == 200
        assert res.json()["status"] == "pending"

        # Let background generation complete
        await learning_service._execute_question_generation(test_db, doc.id, user.id, "rev_questions_1")

        # 2. Fetch again - must return ready state with exactly 3 categories
        res_ready = await client.get(f"/api/v1/documents/{doc.id}/questions", headers=headers)
        assert res_ready.status_code == 200
        data = res_ready.json()
        assert data["status"] == "ready"
        assert len(data["questions"]) == 3

        categories = {q["category"] for q in data["questions"]}
        assert categories == {"comprehension", "methodology", "critical_thinking"}

        # Evidence references check
        comp_q = next(q for q in data["questions"] if q["category"] == "comprehension")
        assert "5 percentage points" in comp_q["evidence_quotes"][0]


@pytest.mark.asyncio
async def test_starter_questions_explicit_regenerate(client: AsyncClient, test_db):
    user, headers = await _create_test_user(test_db, "user-regen@example.com")
    doc = await _create_test_doc(test_db, user.id, title="Regen Study", content_hash="rev_regen_1")
    test_db.add(Chunk(document_id=doc.id, text="Evidence chunk text.", chunk_index=0, page_number=1))
    await test_db.commit()

    mock_llm = MockLearningLLM()
    with patch("app.services.learning_service.llm_service.generate_structured_response", side_effect=mock_llm.generate_structured_response), \
         patch("app.services.learning_service.llm_service.get_provider_info", side_effect=mock_llm.get_provider_info):
        res = await client.post(f"/api/v1/documents/{doc.id}/questions/regenerate", headers=headers)
        assert res.status_code == 200
        assert res.json()["status"] in ("pending", "ready")


@pytest.mark.asyncio
async def test_starter_questions_unauthorized_isolation(client: AsyncClient, test_db):
    user_a, headers_a = await _create_test_user(test_db, "user-q-a@example.com")
    _, headers_b = await _create_test_user(test_db, "user-q-b@example.com")
    doc = await _create_test_doc(test_db, user_a.id, title="Private Questions Doc")
    await test_db.commit()

    # User B cannot access User A's questions
    res_get = await client.get(f"/api/v1/documents/{doc.id}/questions", headers=headers_b)
    assert res_get.status_code == 403

    res_regen = await client.post(f"/api/v1/documents/{doc.id}/questions/regenerate", headers=headers_b)
    assert res_regen.status_code == 403


@pytest.mark.asyncio
async def test_question_generation_failure_does_not_fail_document(test_db):
    """Failure of optional question generation must NEVER turn a completed paper into a failure."""
    user, _ = await _create_test_user(test_db, "user-fail-q@example.com")
    doc = await _create_test_doc(test_db, user.id, title="Resilient Document", content_hash="rev_fail_1")
    test_db.add(Chunk(document_id=doc.id, text="Some content.", chunk_index=0, page_number=1))

    q_set = DocumentQuestionSet(
        document_id=doc.id,
        user_id=user.id,
        status="pending",
        document_revision="rev_fail_1",
        prompt_version=learning_service.cache_version()
    )
    test_db.add(q_set)
    await test_db.commit()

    mock_llm = MockLearningLLM()
    mock_llm.fail_generation = True

    with patch("app.services.learning_service.llm_service.generate_structured_response", side_effect=mock_llm.generate_structured_response):
        await learning_service._execute_question_generation(test_db, doc.id, user.id, "rev_fail_1")

    # Document remains COMPLETED
    refreshed_doc = (await test_db.execute(select(Document).where(Document.id == doc.id))).scalar_one()
    assert refreshed_doc.status == DocumentStatus.COMPLETED

    # Question set reflects graceful failure state
    refreshed_q = (await test_db.execute(select(DocumentQuestionSet).where(DocumentQuestionSet.id == q_set.id))).scalar_one()
    assert refreshed_q.status == QuestionGenerationStatus.FAILED.value
    assert "failed" in refreshed_q.error_message.lower()


@pytest.mark.asyncio
async def test_server_restart_marks_pending_questions_interrupted(test_db):
    """Pending questions interrupted by restart must be safely recovered."""
    user, _ = await _create_test_user(test_db, "user-restart@example.com")
    doc = await _create_test_doc(test_db, user.id, title="Interrupted Questions Doc")

    q_set = DocumentQuestionSet(
        document_id=doc.id,
        user_id=user.id,
        status="pending",
        document_revision="rev_restart_1",
        prompt_version="v1"
    )
    test_db.add(q_set)
    await test_db.commit()

    # Simulate lifespan startup recovery
    await test_db.execute(
        update(DocumentQuestionSet).where(
            DocumentQuestionSet.status == QuestionGenerationStatus.PENDING.value
        ).values(
            status=QuestionGenerationStatus.FAILED.value,
            error_message="Question generation was interrupted by a server restart. Click regenerate to retry."
        )
    )
    await test_db.commit()

    refreshed = (await test_db.execute(select(DocumentQuestionSet).where(DocumentQuestionSet.id == q_set.id))).scalar_one()
    assert refreshed.status == "failed"
    assert "server restart" in refreshed.error_message


@pytest.mark.asyncio
async def test_question_reads_do_not_schedule_and_pending_posts_deduplicate(client, test_db):
    user, headers = await _create_test_user(test_db, "read-only-questions@example.com")
    doc = await _create_test_doc(test_db, user.id, content_hash="read-rev")
    for _ in range(3):
        response = await client.get(f"/api/v1/documents/{doc.id}/questions", headers=headers)
        assert response.json()["status"] == "unavailable"
    assert not (await test_db.execute(select(DocumentQuestionSet))).scalars().all()
    learning_service._generate_questions_task.assert_not_called()
    for _ in range(3):
        response = await client.post(f"/api/v1/documents/{doc.id}/questions/regenerate", headers=headers)
        assert response.json()["status"] == "pending"
    import asyncio
    await asyncio.sleep(0)
    learning_service._generate_questions_task.assert_awaited_once()


@pytest.mark.asyncio
async def test_question_cooldown_provider_and_revision_invalidation(client, test_db):
    user, headers = await _create_test_user(test_db, "cooldown-questions@example.com")
    doc = await _create_test_doc(test_db, user.id, content_hash="rev-a")
    record = DocumentQuestionSet(document_id=doc.id, user_id=user.id, status="failed",
        document_revision="rev-a", prompt_version=learning_service.cache_version(), updated_at=datetime.utcnow())
    test_db.add(record)
    await test_db.commit()
    response = await client.post(f"/api/v1/documents/{doc.id}/questions/regenerate", headers=headers)
    assert response.status_code == 429
    assert response.headers["Retry-After"] == "60"
    doc.content_hash = "rev-b"
    await test_db.commit()
    response = await client.get(f"/api/v1/documents/{doc.id}/questions", headers=headers)
    assert response.json()["status"] == "unavailable"
    with patch.object(llm_service, "get_provider_info", return_value={"provider": "none"}):
        response = await client.post(f"/api/v1/documents/{doc.id}/questions/regenerate", headers=headers)
        assert response.status_code == 503


@pytest.mark.parametrize("fault", ["fabricated_quote", "wrong_page", "missing_quote", "duplicate_category", "malformed"])
def test_question_evidence_rejects_unsupported_output(fault):
    chunks = [Chunk(text="A randomized trial of 40 adults improved accuracy by 5 percentage points.", page_number=2)]
    questions = [{"category": cat, "question": "What did this randomized trial show?",
        "evidence_quote": "randomized trial of 40 adults", "page_number": 2}
        for cat in ["comprehension", "methodology", "critical_thinking"]]
    if fault == "fabricated_quote": questions[0]["evidence_quote"] = "The trial cured all diseases."
    elif fault == "wrong_page": questions[0]["page_number"] = 99
    elif fault == "missing_quote": questions[0]["evidence_quote"] = ""
    elif fault == "duplicate_category": questions[0]["category"] = "methodology"
    else: questions[0] = "not an object"
    assert len(learning_service._validate_question_set(questions, chunks)) < 3


@pytest.mark.asyncio
async def test_stale_question_job_avoids_provider_and_deletion_cascades(test_db):
    user, _ = await _create_test_user(test_db, "stale-job@example.com")
    doc = await _create_test_doc(test_db, user.id, content_hash="new-rev")
    record = DocumentQuestionSet(document_id=doc.id, user_id=user.id, status="pending",
        document_revision="old-rev", prompt_version=learning_service.cache_version())
    test_db.add(record)
    await test_db.commit()
    with patch.object(llm_service, "generate_structured_response", new_callable=AsyncMock) as generate:
        await learning_service._execute_question_generation(test_db, doc.id, user.id, "old-rev")
        generate.assert_not_called()
    assert record.status == "unavailable"
    await test_db.delete(doc)
    await test_db.commit()
    assert not (await test_db.execute(select(DocumentQuestionSet))).scalars().all()


@pytest.mark.asyncio
async def test_upload_completion_creates_pending_question_record(test_db, tmp_path):
    from app.api.v1.documents import _process_document
    user, _ = await _create_test_user(test_db, "upload-question-job@example.com")
    doc = await _create_test_doc(test_db, user.id, content_hash="upload-rev")
    pdf = tmp_path / "paper.pdf"
    pdf.write_bytes(b"%PDF-fixture")
    with patch("app.api.v1.documents.ingestion_pipeline.process_document", new_callable=AsyncMock,
               return_value={"success": True, "metadata": {}, "chunks_created": 1}), \
         patch("app.services.evidence.refresh_revision", new_callable=AsyncMock):
        await _process_document(doc.id, str(pdf), user.id, test_db)
    record = (await test_db.execute(select(DocumentQuestionSet))).scalar_one()
    assert record.status == "pending"
    assert doc.status == DocumentStatus.COMPLETED


@pytest.mark.asyncio
@pytest.mark.parametrize("route", ["ask", "stream"])
async def test_both_chat_paths_preserve_chronological_history(client, test_db, route):
    user, headers = await _create_test_user(test_db, f"history-{route}@example.com")
    doc = await _create_test_doc(test_db, user.id)
    test_db.add(Chunk(document_id=doc.id, text="A trial of 40 adults improved accuracy.", chunk_index=0, page_number=1))
    session = ChatSession(user_id=user.id, title="Follow-up")
    test_db.add(session)
    await test_db.flush()
    test_db.add_all([
        ChatMessage(session_id=session.id, role=MessageRole.USER, content="Prior question about accuracy"),
        ChatMessage(session_id=session.id, role=MessageRole.ASSISTANT, content="Prior answer with uncertainty"),
    ])
    await test_db.commit()
    mock = MockLearningLLM()
    with patch.object(llm_service, "generate", side_effect=mock.generate), \
         patch.object(llm_service, "stream_generate", side_effect=mock.stream_generate):
        response = await client.post(f"/api/v1/chat/{route}", headers=headers, json={
            "session_id": session.id, "document_ids": [doc.id], "message": "Current follow-up", "explanation_mode": "simple"})
    assert response.status_code == 200
    prompt = mock.generate_calls[-1]["prompt"]
    assert "Q: Prior question about accuracy" in prompt
    assert "A: Prior answer with uncertainty" in prompt
    assert prompt.count("Current follow-up") == 1
