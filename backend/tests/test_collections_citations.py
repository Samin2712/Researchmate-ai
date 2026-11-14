"""
Tests for Collections, Tags, and BibTeX citation export.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.document import Document, DocumentStatus, Collection, Tag
from app.core.security import get_password_hash, create_access_token


async def _create_test_user(db: AsyncSession, email: str = "researcher@example.com") -> tuple[User, dict]:
    user = User(
        email=email,
        hashed_password=get_password_hash("securepass123"),
        full_name="Dr. Jane Researcher",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    token = create_access_token({"sub": user.email, "id": user.id})
    headers = {"Authorization": f"Bearer {token}"}
    return user, headers


async def _create_test_doc(
    db: AsyncSession,
    user_id: int,
    title: str = "Attention Is All You Need",
    authors: str = "Vaswani et al.",
    year: int = 2017,
    **kwargs,
) -> Document:
    doc = Document(
        user_id=user_id,
        title=title,
        authors=authors,
        year=year,
        file_path="/tmp/fake.pdf",
        status=DocumentStatus.COMPLETED,
        **kwargs,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


@pytest.mark.asyncio
async def test_unauthenticated_access(client: AsyncClient):
    """Ensure collections and tags reject unauthenticated requests."""
    res = await client.get("/api/v1/collections")
    assert res.status_code == 401

    res = await client.post("/api/v1/collections", json={"name": "Machine Learning"})
    assert res.status_code == 401

    res = await client.get("/api/v1/tags")
    assert res.status_code == 401

    res = await client.post("/api/v1/documents/bibtex-export", json={"document_ids": [1]})
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_collections_crud(client: AsyncClient, test_db: AsyncSession):
    """Test full collection CRUD lifecycle."""
    user, headers = await _create_test_user(test_db, "col_user@example.com")

    # 1. Create collection
    res = await client.post(
        "/api/v1/collections",
        json={"name": "Deep Learning", "description": "Papers on neural nets"},
        headers=headers,
    )
    assert res.status_code == 201
    col_data = res.json()
    assert col_data["name"] == "Deep Learning"
    assert col_data["description"] == "Papers on neural nets"
    col_id = col_data["id"]

    # 2. Duplicate collection name for same user fails
    res_dup = await client.post(
        "/api/v1/collections",
        json={"name": "Deep Learning"},
        headers=headers,
    )
    assert res_dup.status_code == 409

    # 3. List collections
    res_list = await client.get("/api/v1/collections", headers=headers)
    assert res_list.status_code == 200
    items = res_list.json()
    assert len(items) == 1
    assert items[0]["name"] == "Deep Learning"
    assert items[0]["document_count"] == 0

    # 4. Update collection
    res_patch = await client.patch(
        f"/api/v1/collections/{col_id}",
        json={"name": "Neural Networks & DL"},
        headers=headers,
    )
    assert res_patch.status_code == 200
    assert res_patch.json()["name"] == "Neural Networks & DL"

    # 5. Delete collection
    res_del = await client.delete(f"/api/v1/collections/{col_id}", headers=headers)
    assert res_del.status_code == 204

    # 6. Verify deleted
    res_get = await client.get(f"/api/v1/collections/{col_id}", headers=headers)
    assert res_get.status_code == 404


@pytest.mark.asyncio
async def test_tags_crud(client: AsyncClient, test_db: AsyncSession):
    """Test tag CRUD lifecycle."""
    user, headers = await _create_test_user(test_db, "tag_user@example.com")

    # 1. Create tag
    res = await client.post(
        "/api/v1/tags",
        json={"name": "NLP", "color": "#116e64"},
        headers=headers,
    )
    assert res.status_code == 201
    tag = res.json()
    assert tag["name"] == "NLP"
    assert tag["color"] == "#116e64"
    tag_id = tag["id"]

    # 2. Duplicate tag name for same user fails
    res_dup = await client.post(
        "/api/v1/tags",
        json={"name": "NLP"},
        headers=headers,
    )
    assert res_dup.status_code == 409

    # 3. List tags
    res_list = await client.get("/api/v1/tags", headers=headers)
    assert res_list.status_code == 200
    assert len(res_list.json()) == 1

    # 4. Update tag
    res_update = await client.patch(
        f"/api/v1/tags/{tag_id}",
        json={"name": "Natural Language Processing", "color": "#218bba"},
        headers=headers,
    )
    assert res_update.status_code == 200
    assert res_update.json()["name"] == "Natural Language Processing"

    # 5. Delete tag
    res_del = await client.delete(f"/api/v1/tags/{tag_id}", headers=headers)
    assert res_del.status_code == 204


@pytest.mark.asyncio
async def test_collection_bulk_membership_and_filtering(client: AsyncClient, test_db: AsyncSession):
    """Test bulk adding/removing papers and filtering library by collection."""
    user, headers = await _create_test_user(test_db, "bulk_user@example.com")
    doc1 = await _create_test_doc(test_db, user.id, title="Paper 1")
    doc2 = await _create_test_doc(test_db, user.id, title="Paper 2")
    doc3 = await _create_test_doc(test_db, user.id, title="Paper 3")

    # Create collection
    col_res = await client.post("/api/v1/collections", json={"name": "Selected Papers"}, headers=headers)
    col_id = col_res.json()["id"]

    # Bulk add doc1 and doc2
    add_res = await client.post(
        f"/api/v1/collections/{col_id}/documents",
        json={"document_ids": [doc1.id, doc2.id]},
        headers=headers,
    )
    assert add_res.status_code == 204

    # Duplicate add is idempotent
    add_dup = await client.post(
        f"/api/v1/collections/{col_id}/documents",
        json={"document_ids": [doc1.id]},
        headers=headers,
    )
    assert add_dup.status_code == 204

    # Check collection document count
    list_col = await client.get("/api/v1/collections", headers=headers)
    assert list_col.json()[0]["document_count"] == 2

    # Filter library by collection_id
    filter_res = await client.get(f"/api/v1/documents?collection_id={col_id}", headers=headers)
    assert filter_res.status_code == 200
    data = filter_res.json()
    assert data["total"] == 2
    filtered_ids = {d["id"] for d in data["documents"]}
    assert filtered_ids == {doc1.id, doc2.id}
    assert col_id in data["documents"][0]["collection_ids"]

    # Bulk remove doc1
    remove_res = await client.request(
        "DELETE",
        f"/api/v1/collections/{col_id}/documents",
        json={"document_ids": [doc1.id]},
        headers=headers,
    )
    assert remove_res.status_code == 204

    # Verify count is now 1
    filter_after = await client.get(f"/api/v1/documents?collection_id={col_id}", headers=headers)
    assert filter_after.json()["total"] == 1

    # Deleting collection does NOT delete the documents
    await client.delete(f"/api/v1/collections/{col_id}", headers=headers)
    all_docs = await client.get("/api/v1/documents", headers=headers)
    assert all_docs.json()["total"] == 3


@pytest.mark.asyncio
async def test_cross_user_isolation(client: AsyncClient, test_db: AsyncSession):
    """Ensure strict multi-tenant boundary checks and atomic rejection."""
    user_a, headers_a = await _create_test_user(test_db, "user_a@example.com")
    user_b, headers_b = await _create_test_user(test_db, "user_b@example.com")

    doc_a = await _create_test_doc(test_db, user_a.id, title="User A Doc")
    doc_b = await _create_test_doc(test_db, user_b.id, title="User B Doc")

    # User A creates collection
    col_a = (await client.post("/api/v1/collections", json={"name": "A's List"}, headers=headers_a)).json()

    # User B cannot view User A's collection
    res_cross_get = await client.get(f"/api/v1/collections/{col_a['id']}", headers=headers_b)
    assert res_cross_get.status_code == 404

    # User A tries to add User B's document to collection -> rejected atomically
    res_cross_add = await client.post(
        f"/api/v1/collections/{col_a['id']}/documents",
        json={"document_ids": [doc_a.id, doc_b.id]},
        headers=headers_a,
    )
    assert res_cross_add.status_code in (403, 404)

    # Verify atomic rejection: doc_a was NOT added
    col_docs = await client.get(f"/api/v1/collections/{col_a['id']}/documents", headers=headers_a)
    assert len(col_docs.json()) == 0

    # User A cannot export BibTeX containing User B's document
    res_cross_bib = await client.post(
        "/api/v1/documents/bibtex-export",
        json={"document_ids": [doc_a.id, doc_b.id]},
        headers=headers_a,
    )
    assert res_cross_bib.status_code == 404


@pytest.mark.asyncio
async def test_document_tags_membership(client: AsyncClient, test_db: AsyncSession):
    """Test assigning tags to documents and filtering by tag."""
    user, headers = await _create_test_user(test_db, "tag_member@example.com")
    doc = await _create_test_doc(test_db, user.id, title="Tagged Document")

    tag_res = await client.post("/api/v1/tags", json={"name": "Urgent Review"}, headers=headers)
    tag_id = tag_res.json()["id"]

    # Add tag to document
    add_tag = await client.post(
        f"/api/v1/documents/{doc.id}/tags",
        json={"tag_id": tag_id},
        headers=headers,
    )
    assert add_tag.status_code == 204

    # Verify document includes tag_id
    doc_get = await client.get(f"/api/v1/documents/{doc.id}", headers=headers)
    assert tag_id in doc_get.json()["tag_ids"]

    # Filter library by tag_id
    filter_tag = await client.get(f"/api/v1/documents?tag_id={tag_id}", headers=headers)
    assert filter_tag.json()["total"] == 1
    assert filter_tag.json()["documents"][0]["id"] == doc.id

    # Remove tag from document
    del_tag = await client.delete(f"/api/v1/documents/{doc.id}/tags/{tag_id}", headers=headers)
    assert del_tag.status_code == 204

    # Verify tag removed
    doc_get_after = await client.get(f"/api/v1/documents/{doc.id}", headers=headers)
    assert tag_id not in doc_get_after.json()["tag_ids"]


@pytest.mark.asyncio
async def test_citation_metadata_update_and_bibtex_export(client: AsyncClient, test_db: AsyncSession):
    """Test updating bibliographic metadata and generating valid BibTeX."""
    user, headers = await _create_test_user(test_db, "bib_user@example.com")
    doc1 = await _create_test_doc(
        test_db,
        user.id,
        title="Attention Is All You Need",
        authors="Ashish Vaswani and Noam Shazeer",
        year=2017,
    )
    doc2 = await _create_test_doc(
        test_db,
        user.id,
        title="Attention Is All You Need: Part 2",
        authors="Ashish Vaswani and Noam Shazeer",
        year=2017,
    )

    # 1. Update citation metadata on doc1
    patch_res = await client.patch(
        f"/api/v1/documents/{doc1.id}",
        json={
            "doi": "10.48550/arXiv.1706.03762",
            "journal": "Advances in Neural Information Processing Systems",
            "volume": "30",
            "pages": "5998--6008",
            "publisher": "Curran Associates, Inc.",
            "url": "https://proceedings.neurips.cc/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf",
            "document_type": "article",
        },
        headers=headers,
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["doi"] == "10.48550/arXiv.1706.03762"
    assert updated["journal"] == "Advances in Neural Information Processing Systems"
    assert updated["pages"] == "5998--6008"

    # 2. Single BibTeX export
    single_res = await client.get(f"/api/v1/documents/{doc1.id}/bibtex", headers=headers)
    assert single_res.status_code == 200
    assert "attachment; filename=" in single_res.headers["content-disposition"]
    bib_text = single_res.text
    assert "@article{" in bib_text
    assert "vaswani_2017_attention" in bib_text
    assert "doi = {10.48550/arXiv.1706.03762}" in bib_text
    assert "pages = {5998--6008}" in bib_text

    # 3. Bulk BibTeX export with collision avoidance
    bulk_res = await client.post(
        "/api/v1/documents/bibtex-export",
        json={"document_ids": [doc1.id, doc2.id]},
        headers=headers,
    )
    assert bulk_res.status_code == 200
    assert "attachment; filename=\"references.bib\"" in bulk_res.headers["content-disposition"]
    bulk_text = bulk_res.text
    assert "vaswani_2017_attention" in bulk_text
    # doc2 has same author, year, and first title word, so key should have suffix
    assert "vaswani_2017_attention_2" in bulk_text or "vaswani_2017_attention_1" in bulk_text


@pytest.mark.asyncio
async def test_bulk_removal_rejects_mixed_owners_atomically(client, test_db):
    user, headers = await _create_test_user(test_db, "remove@example.com")
    other, _ = await _create_test_user(test_db, "other-remove@example.com")
    own = await _create_test_doc(test_db, user.id)
    foreign = await _create_test_doc(test_db, other.id)
    col = (await client.post("/api/v1/collections", headers=headers, json={"name": "Atomic"})).json()
    endpoint = f"/api/v1/collections/{col['id']}/documents"
    assert (await client.post(endpoint, headers=headers, json={"document_ids": [own.id]})).status_code == 204
    result = await client.request("DELETE", endpoint, headers=headers, json={"document_ids": [own.id, foreign.id]})
    assert result.status_code == 404
    assert [d['id'] for d in (await client.get(endpoint, headers=headers)).json()] == [own.id]


@pytest.mark.asyncio
async def test_metadata_validation_and_structured_author_export(client, test_db):
    user, headers = await _create_test_user(test_db, "validated@example.com")
    doc = await _create_test_doc(test_db, user.id)
    endpoint = f"/api/v1/documents/{doc.id}"
    for invalid in ({"title": " "}, {"title": None}, {"year": -1}, {"doi": "fake"}, {"url": "javascript:alert(1)"}, {"document_type": "invalid"}):
        assert (await client.patch(endpoint, headers=headers, json=invalid)).status_code == 422
    response = await client.patch(endpoint, headers=headers, json={"year": None, "document_type": "inproceedings", "structured_authors": [{"given": "Jane", "family": "García"}, {"given": "Ada", "family": "Lovelace"}]})
    assert response.status_code == 200, response.text
    bib = (await client.get(endpoint + "/bibtex", headers=headers)).text
    assert "@inproceedings{garcia_nd_" in bib
    assert "García, Jane and Lovelace, Ada" in bib
    assert "year =" not in bib
    a = await client.post("/api/v1/documents/bibtex-export", headers=headers, json={"document_ids": [doc.id, doc.id]})
    assert a.text.count("@inproceedings") == 1


@pytest.mark.asyncio
async def test_invalid_names_colors_and_empty_selection(client, test_db):
    _, headers = await _create_test_user(test_db, "names@example.com")
    for endpoint, payload in [("collections", {"name": "   "}), ("tags", {"name": "bad", "color": "red"})]:
        assert (await client.post("/api/v1/" + endpoint, headers=headers, json=payload)).status_code == 422
    assert (await client.post("/api/v1/documents/bibtex-export", headers=headers, json={"document_ids": []})).status_code == 422


@pytest.mark.parametrize("entry_type", ["article", "book", "inproceedings", "misc"])
def test_bibtex_entry_types_unicode_braces_quotes_and_author_separators(entry_type):
    from app.api.v1.collections import _build_bibtex_file
    docs = [Document(id=i, title='Unicode {研究} "quoted" 100% & $ # _ ^ ~', authors='Jane Smith; Ada Lovelace', year=None, document_type=entry_type) for i in (1, 2)]
    content = _build_bibtex_file(docs)
    assert content.count('@' + entry_type + '{') == 2
    assert 'Jane Smith and Ada Lovelace' in content
    assert r'\{研究\}' in content
    assert '"quoted"' in content
    assert r'\%' in content and r'\&' in content
    assert 'year =' not in content and 'doi =' not in content
    assert 'smith_nd_unicode_1,' in content
