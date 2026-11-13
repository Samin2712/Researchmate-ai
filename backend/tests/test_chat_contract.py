"""Serialization regressions for the frontend's persisted conversation contract.

Run independently from the full API stack:
    python -m unittest tests.test_chat_contract
"""
import json
import unittest
from datetime import datetime, timezone
from types import SimpleNamespace

from app.schemas.chat import ChatMessageResponse


class ChatContractTests(unittest.TestCase):
    def message(self, sources):
        return SimpleNamespace(
            id=1, session_id=1, role="assistant", content="An answer [Page 2].",
            sources=sources, confidence_score=92,
            created_at=datetime.now(timezone.utc),
        )

    def test_sources_are_read_from_json_column_list(self):
        sources = [{"document_id": "1", "title": "Paper", "page_number": 2}]
        result = ChatMessageResponse.model_validate(self.message(sources))
        self.assertEqual(result.sources, sources)
        self.assertEqual(result.confidence_score, 92)

    def test_legacy_json_string_sources_are_decoded(self):
        sources = [{"document_id": "1", "title": "Paper", "page_number": 2}]
        result = ChatMessageResponse.model_validate(self.message(json.dumps(sources)))
        self.assertEqual(result.model_dump()["sources"], sources)

    def test_messages_without_sources_remain_valid(self):
        result = ChatMessageResponse.model_validate(self.message(None))
        self.assertIsNone(result.sources)


if __name__ == "__main__":
    unittest.main()
