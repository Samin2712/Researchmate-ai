"""Browser-only API harness: real persistence/auth/PDF parsing, deterministic embeddings.

Never use this module as a production start command.
"""
import os
from pathlib import Path
import sys
import tempfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
scratch = tempfile.TemporaryDirectory(prefix="researchmate-browser-")
os.environ.update(
    DATABASE_URL="sqlite+aiosqlite:///" + (Path(scratch.name) / "browser.db").as_posix(),
    UPLOAD_DIR=str(Path(scratch.name) / "uploads"),
    LOG_FILE=str(Path(scratch.name) / "browser.log"),
    EMBEDDING_PROVIDER="gemini",
    VECTOR_STORE_MODE="database",
    DEBUG="false",
    CORS_ORIGINS="http://localhost:5173,http://127.0.0.1:5173,http://localhost:5175,http://127.0.0.1:5175,http://localhost:5177,http://127.0.0.1:5177",
)

from app.main import app
from app.services.embedder import embedder

embedder._embed_remote = lambda texts, task: [[1.0] + [0.0] * 767 for _ in texts]

# Deterministic generation is isolated to this test server. Retrieval, citations,
# auth, PDF parsing, migrations and note persistence still use the real code.
from app.services.llm_service import llm_service
async def browser_answer(*args, **kwargs):
    return "The paper describes its evidence [Page 2]."
llm_service.generate = browser_answer
async def browser_structured_unavailable(*args, **kwargs):
    raise RuntimeError("Structured generation is disabled in this deterministic browser harness.")
llm_service.generate_structured_response = browser_structured_unavailable

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=int(os.getenv('BROWSER_API_PORT', '8000')))
