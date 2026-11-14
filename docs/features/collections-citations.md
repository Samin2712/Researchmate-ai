# Collections & Citations Feature

## Overview

Feature 1 (Collections/Tags) and Feature 2 (Citation metadata / BibTeX export) for ResearchMate AI.

---

## Schema Migration

### Startup and explicit migrations

Startup calls `upgrade_schema`: it inspects the existing database, adds missing nullable citation columns without resetting documents, creates missing tables, and repairs the timestamp omitted by the original migration. `create_all` alone does **not** add columns to existing tables.

For both SQLite and PostgreSQL, with dependencies installed:

```sh
cd backend
python -m alembic upgrade head
```

Alembic reads the same `DATABASE_URL` settings as the API, including managed PostgreSQL URLs. Revision `0002_collections_citations` bootstraps fresh or legacy stores; `0003_citation_validation` upgrades stores already stamped with the original revision. Repeated startup and `upgrade head` are safe. Back up production before an upgrade; downgrade deliberately fails instead of deleting citation data. No legacy author strings are parsed into invented structured facts.

### New columns on `documents`

| Column | Type | Notes |
|---|---|---|
| `structured_authors` | JSON | Ordered `[{"family":"García","given":"Jane"}]`; nullable, legacy `authors` remains |
| `doi` | String | Digital Object Identifier |
| `journal` | String | Journal / venue name |
| `volume` | String | Volume number |
| `issue` | String | Issue / number |
| `pages` | String | Page range e.g. `"123–145"` |
| `publisher` | String | Publisher name |
| `url` | String | Landing page URL |
| `document_type` | String | `article` (default) \| `book` \| `inproceedings` \| `misc` |

### New tables

- **`collections`** — user-owned named groups, unique per (user_id, name).
- **`collection_documents`** — many-to-many join; tracks `added_at`.
- **`tags`** — user-owned labels with optional hex `color`, unique per (user_id, name).
- **`document_tags`** — many-to-many join.

---

## API Contracts

All endpoints require a valid JWT (`Authorization: Bearer <token>`).

### Collections

#### `GET /api/v1/collections`
List the current user's collections.

**Response** `200 application/json`
```json
[
  {
    "id": 1,
    "user_id": 7,
    "name": "Deep Learning Papers",
    "description": null,
    "created_at": "2026-11-14T08:00:00Z",
    "updated_at": null,
    "document_count": 12
  }
]
```

---

#### `POST /api/v1/collections`
Create a collection.

**Body**
```json
{ "name": "NLP Papers", "description": "Optional long description" }
```

**Response** `201` — `CollectionResponse`
**Errors** `409` duplicate name.

---

#### `GET /api/v1/collections/{id}`
Get a single collection including its `document_ids`.

**Response** `200`
```json
{
  "id": 1,
  "user_id": 7,
  "name": "NLP Papers",
  "description": null,
  "created_at": "...",
  "updated_at": null,
  "document_count": 3,
  "document_ids": [4, 9, 11]
}
```

---

#### `PATCH /api/v1/collections/{id}`
Rename or update description.

**Body** (all fields optional)
```json
{ "name": "New Name", "description": "Updated desc" }
```

**Response** `200` — `CollectionResponse`

---

#### `DELETE /api/v1/collections/{id}`
Delete a collection. The documents themselves are **not** deleted.

**Response** `204 No Content`

---

#### `POST /api/v1/collections/{id}/documents`
Bulk-add documents to a collection. All documents must be owned by the caller — **atomic**: if any doc is not found/not owned, the whole request is rejected.

**Body**
```json
{ "document_ids": [1, 2, 3] }
```

**Response** `204 No Content`
**Errors** `404` if any doc not found or not owned.

---

#### `DELETE /api/v1/collections/{id}/documents`
Bulk-remove documents from a collection (documents are not deleted).

**Body**
```json
{ "document_ids": [1, 2] }
```

**Response** `204 No Content`

---

#### `GET /api/v1/collections/{id}/documents`
List documents in a collection. Same shape as the global document list.

**Response** `200` — `List[DocumentResponse]`

---

### Tags

#### `GET /api/v1/tags`
List current user's tags.

**Response** `200`
```json
[{ "id": 3, "user_id": 7, "name": "survey", "color": "#3498db" }]
```

---

#### `POST /api/v1/tags`
Create a tag.

**Body**
```json
{ "name": "survey", "color": "#3498db" }
```

**Response** `201` — `TagResponse`
**Errors** `409` duplicate name.

---

#### `PATCH /api/v1/tags/{id}`
Update tag name or color.

**Body** (all optional)
```json
{ "name": "meta-analysis", "color": "#e74c3c" }
```

**Response** `200` — `TagResponse`

---

#### `DELETE /api/v1/tags/{id}`
Delete tag and remove it from all documents.

**Response** `204 No Content`

---

### Document ↔ Tag

#### `POST /api/v1/documents/{id}/tags`
Add a tag to a document. Idempotent (no error if already tagged).

**Body**
```json
{ "tag_id": 3 }
```

**Response** `204 No Content`
**Errors** `404` if document or tag not found / not owned.

---

#### `DELETE /api/v1/documents/{id}/tags/{tag_id}`
Remove a tag from a document.

**Response** `204 No Content`

---

### Documents — extended

`GET /api/v1/documents` now accepts two optional query parameters:

| Parameter | Type | Description |
|---|---|---|
| `collection_id` | int | Filter to documents in this collection |
| `tag_id` | int | Filter to documents with this tag |

Every `DocumentResponse` now includes:
```json
{
  "tag_ids": [3, 5],
  "collection_ids": [1],
  "doi": "10.1000/xyz123",
  "journal": "Nature",
  "volume": "12",
  "issue": "3",
  "pages": "100-110",
  "publisher": "Springer",
  "url": "https://doi.org/10.1000/xyz123",
  "document_type": "article"
}
```

Citation fields can also be updated via `PATCH /api/v1/documents/{id}`.

---

### BibTeX Export

#### `GET /api/v1/documents/{id}/bibtex`
Download a single BibTeX entry.

**Response** `200 text/plain; charset=utf-8`
```
Content-Disposition: attachment; filename="reference.bib"
```

---

#### `POST /api/v1/documents/bibtex-export`
Bulk BibTeX download. All documents must be owned by the caller (atomic).

**Body**
```json
{ "document_ids": [1, 2, 3] }
```

**Response** `200 text/plain; charset=utf-8`
```
Content-Disposition: attachment; filename="references.bib"
```

**Errors** `404` if any document not found or not owned.

---

## BibTeX Format Spec

### Entry types

| `document_type` | BibTeX entry |
|---|---|
| `article` | `@article` |
| `book` | `@book` |
| `inproceedings` | `@inproceedings` |
| `misc` | `@misc` |
| anything else | `@misc` |

### Citation key

Format: `firstAuthorLastName_year_titleFirstWord` (lowercase ASCII)

- First author: structured family name when supplied; otherwise the legacy first-author heuristic.
- Year: `nd` if unknown.
- First significant word of title.
- Collision suffix: `_1`, `_2`, … added when duplicate keys would otherwise occur in a bulk export.

### Special character escaping

Characters `{ } \ % $ # & ^ _ ~` are escaped per BibTeX convention.

Unicode is preserved inside `{}` field braces (UTF-8 output).

### Field mapping per type

**@article**: title, author, year, abstract, doi, url, journal, volume, number (issue), pages, publisher

**@book**: title, author, year, abstract, doi, url, publisher, volume, pages

**@inproceedings**: title, author, year, abstract, doi, url, booktitle (from `journal` field), pages, publisher

**@misc**: title, author, year, abstract, doi, url

Structured authors are separated with BibTeX `and`. Legacy semicolon/`and` separators are normalized; ambiguous comma-only legacy names remain unchanged. Missing optional fields are omitted — data is never invented.

---

## Limitations

- Metadata updates validate document type (`article`, `book`, `inproceedings`, `misc`), nonempty titles, years 1–9999, DOI syntax, and absolute HTTP(S) URLs. Unknown legacy entry types export as `misc`. Empty optional fields clear to null.
- `issue` maps to BibTeX `number` field for `@article` entries.
- For `@inproceedings`, the `journal` column is reused as the conference/booktitle; a dedicated `booktitle` column may be warranted in a future migration.
- Bulk membership operations are atomic at the application layer (a single transaction). Database-level rollback is used on any ownership check failure.
- Citation metadata is not auto-extracted from PDFs — fields must be populated manually via `PATCH /api/v1/documents/{id}` or by extending the ingestion pipeline.
- Tags and collections are user-scoped; there is no sharing across accounts in this release.


---

## Shared selection and navigation contract

`frontend/src/components/collections/selection.ts` exports `PaperSelection { version: 1, document_ids: number[] }` and `resolvePaperSelection`. IDs are explicit, sorted and copied; removed papers are dropped. Pass `readyOnly=true` when preparing analyses, then revalidate ownership/readiness on the analysis API. Save the resulting IDs with an analysis; never save a live collection query. Empty UI selection means no action, never all papers. Bulk API endpoints reject empty arrays with 422. Membership is allowed for processing papers, but analysis selection excludes them.

Library URL parameters are `collection`, `tag`, `q`, `status`, `sort`, and optional `document`; they are personal navigation state, not public sharing. Collection transitions reset selection. All document mutations invalidate both global and collection query caches. Collections poll while papers are processing.

Bulk export de-duplicates IDs and sorts numerically before generating collision suffixes, so reversed/repeated requests produce deterministic output. Single downloads use `reference.bib`, bulk downloads `references.bib`, with UTF-8 `text/plain` attachment responses. The browser may use a title-based single filename.

## Visual review

Retain the existing navy `#1b3e55`, ink `#193a51`, teal `#116e64`, pale teal `#e2f2ef`, white `#ffffff`, and canvas `#f5f8fa`. Keep DM Sans for readable content and Manrope for headings. Collections form a narrow left navigation on desktop and stack above papers on mobile. Filters wrap, details use a scrollable dialog, metadata fields stack on small screens. Existing paper cards are retained. Toolbar transitions last 200 ms; dialogs and toolbar respect reduced motion. Missing metadata uses readable brown hints.

## Verification and limitations (2026-11-14)

See [audit and deployment status](collections-citations-audit.md) for current commands/results and production verification. Earlier implementation claims have been superseded by the independent audit.

APA, MLA, and Chicago are draft string templates incorporating available venue, publisher and DOI/URL metadata. They are **not full CSL/style-compliance implementations**. No facts are generated by an LLM. Structured authors schema is version 1 by this API contract; the legacy text field is preserved. The browser editor accepts ordered `family; given` lines.

External AI generation and embeddings require working provider access or downloaded local embedding weights. Collection/tag CRUD, metadata editing, and BibTeX export do not require AI. Original PDF persistence on free hosting still requires a persistent disk or an object-storage integration; extracted text and database vectors persist in PostgreSQL. Do not run the deterministic browser harness in production.
