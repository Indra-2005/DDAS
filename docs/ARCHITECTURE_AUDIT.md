# DDAS Architecture Audit

> **Audit Date:** 2026-09-12
> **Auditor:** Automated Architecture Review
> **Status:** Post-Refinement Assessment — Production-Hardened

---

## 1. Repository Structure Overview

```
DDAS_UI2/
├── backend/
│   ├── app/
│   │   ├── __init__.py          (Backward-compat re-exports)
│   │   ├── main.py              (FastAPI entry, lifecycle, middleware)
│   │   ├── core/
│   │   │   ├── config.py        (Pydantic BaseSettings centralized config)
│   │   │   ├── security.py      (JWT, bcrypt, RBAC, UserRole enum)
│   │   │   ├── dependencies.py  (Auth dependency injection)
│   │   │   └── logging.py       (Structured logging with sensitive scrubbing)
│   │   ├── db/
│   │   │   └── database.py      (MongoDB client, collections, index creation)
│   │   ├── algorithms/
│   │   │   ├── hashing.py       (SHA-256, filename sanitization, safe ObjectId)
│   │   │   ├── minhash.py       (MinHash signature computation)
│   │   │   ├── lsh.py           (LSH index + exact Jaccard verification)
│   │   │   ├── similarity.py    (Jaccard from stored hash values)
│   │   │   ├── perceptual_hash.py (dHash image near-duplicate detection)
│   │   │   ├── text_extraction.py (Multi-format text extraction)
│   │   │   └── mime_validation.py (libmagic MIME + extension blocklist)
│   │   ├── schemas/
│   │   │   ├── auth.py          (Register, Login, Token models)
│   │   │   ├── files.py         (FileOut, UploadResponse, BulkDelete)
│   │   │   ├── dlp.py           (DLPFinding, DLPScanResult, severity enum)
│   │   │   ├── users.py         (UserOut, profile, password change)
│   │   │   ├── audit.py         (AuditLogOut)
│   │   │   └── common.py        (MessageResponse, Pagination, PaginatedResponse)
│   │   ├── repositories/
│   │   │   ├── file_repository.py  (Tenant-scoped file CRUD, aggregation metrics)
│   │   │   ├── blob_repository.py  (Atomic ref-counting for physical blobs)
│   │   │   ├── user_repository.py  (Tenant-scoped user management)
│   │   │   └── audit_repository.py (Tenant-scoped audit log CRUD)
│   │   ├── services/
│   │   │   ├── file_service.py     (Upload/download/delete orchestrator)
│   │   │   ├── auth_service.py     (Registration, login, password management)
│   │   │   ├── dedup_service.py    (SHA-256 + MinHash/LSH + dHash dedup)
│   │   │   ├── dlp_service.py      (8-rule regex DLP engine with Luhn)
│   │   │   ├── encryption_service.py (AES-256-GCM encrypt/decrypt)
│   │   │   ├── quarantine_service.py (Approve, purge, redact workflows)
│   │   │   ├── storage_service.py  (Storage I/O abstraction layer)
│   │   │   └── webhook_service.py  (Slack/Discord/Teams notifications)
│   │   └── api/v1/
│   │       ├── auth.py           (Register/login with rate limiting)
│   │       ├── files.py          (Upload/download/list/delete with rate limiting)
│   │       ├── admin.py          (User mgmt, quarantine, audit, settings)
│   │       ├── dashboard.py      (Aggregated analytics)
│   │       └── users.py          (Profile, password change)
│   ├── tests/
│   │   ├── conftest.py           (Multi-tenant fixtures, auth token generation)
│   │   ├── test_unit/            (DLP, encryption, hashing, MinHash, similarity, text extraction, perceptual hash)
│   │   ├── test_integration/     (Auth, files, dedup, dashboard lifecycle)
│   │   └── test_security/        (IDOR, RBAC, JWT, file security, tenant isolation)
│   ├── app.py                    (Thin re-export layer for backward compat)
│   ├── seed_db.py                (Initial tenant/company seeder)
│   ├── requirements.txt          (26 dependencies, no unused packages)
│   ├── Dockerfile                (Multi-stage, non-root, healthcheck)
│   ├── .env.example              (Template with generation instructions)
│   └── .gitignore                (Blocks .env, .pem, .key, storage dirs)
├── frontend/
│   ├── src/
│   │   ├── App.jsx               (Routing + nav + layout)
│   │   ├── api.js                (Axios client with JWT interceptors)
│   │   ├── pages/                (11 page components)
│   │   ├── components/           (3 shared components)
│   │   ├── context/              (ThemeContext)
│   │   └── lib/                  (cn() utility)
│   ├── package.json
│   └── vite.config.js
├── docs/
│   └── ARCHITECTURE_AUDIT.md     (This file)
└── README.md
```

---

## 2. Security Posture

### 2.1 Resolved Issues (Previously Critical)

| # | Issue | Resolution |
|---|-------|------------|
| S1 | `.env` committed with real credentials | `.gitignore` blocks `*.env`, `*.pem`, `*.key`; `.env.example` uses placeholders |
| S2 | Hardcoded fallback secrets | Pydantic `BaseSettings` with `min_length` validators; app fails fast without proper config |
| S3 | CORS allows all origins | Configurable `CORS_ORIGINS` via env, no `*` |
| S4 | No tenant isolation on `/files/text/{id}` | All endpoints scoped to `company` via repository layer |
| S5 | Encryption key derived from JWT secret | Independent `ENCRYPTION_MASTER_KEY` (64 hex = 32 bytes AES), validated on startup |
| S6 | No file size limit | Configurable `MAX_UPLOAD_SIZE_MB` (default 500MB) with early rejection |
| S7 | No filename sanitization | `sanitize_filename()` strips traversal, null bytes, control chars, caps at 255 |
| S8 | No rate limiting | SlowAPI: login 5/min, register 3/min, upload 10/min |
| S9 | Bare `except:` clauses | Replaced with specific exception handling throughout |
| S10 | No MIME validation | `libmagic` + extension blocklist in `mime_validation.py` |
| S11 | Internal `file_path` leaked in API responses | Removed from `FileOut` Pydantic response schema |
| S12 | Content-Disposition header injection | RFC 6266 compliant `filename*=UTF-8''` encoding |
| S13 | Quarantine bypass by non-admin | Check uses `UserRole` enum, allows `ADMIN` and `SUPER_ADMIN` only |

### 2.2 Current Security Architecture

- **Authentication**: JWT HS256, 24h expiry, bcrypt password hashing, min 32-char secret
- **Authorization**: `UserRole` enum (`employee`, `admin`, `super_admin`), dependency-injected RBAC
- **Encryption**: AES-256-GCM at rest, independent master key, unique 96-bit nonce per write
- **Tenant Isolation**: All repository queries scoped by `company`, 404 on cross-tenant access
- **DLP**: 8 deterministic regex rules with Luhn validation, severity classification, automatic quarantine
- **Storage**: Abstracted behind `StorageService` — all I/O isolated behind `save/read/delete/exists`
- **Rate Limiting**: Applied to authentication and upload endpoints via SlowAPI

---

## 3. Deduplication Architecture

### 3.1 Exact Deduplication (SHA-256)
- Content-addressed storage: physical filename = SHA-256 digest
- Atomic reference counting via `blobs` collection with `$inc` operations
- Physical deletion only when global ref count reaches 0

### 3.2 Near-Duplicate Detection — Text (MinHash/LSH)
- Word-level shingling with 128 MinHash permutations
- LSH index for sub-linear candidate discovery
- Exact Jaccard verification on LSH candidates
- Scoped to tenant to prevent metadata leakage

### 3.3 Near-Duplicate Detection — Images (Perceptual dHash)
- 16×16 difference hash producing 256-bit perceptual fingerprint
- Hamming distance comparison for O(1) similarity scoring
- Independent pipeline from text MinHash/LSH
- Stored as `image_dhash` field alongside `minhash_values`

---

## 4. Performance Optimizations

- **Dashboard metrics**: MongoDB aggregation pipelines (no full-collection loads)
- **Pagination**: Files, audit logs, quarantined files all paginated
- **MongoDB indexes**: Compound indexes created on startup for all query patterns
- **LSH indexing**: Sub-linear candidate filtering before exact verification

---

## 5. Test Coverage

| Category | Tests | Coverage |
|----------|-------|----------|
| **Unit** | DLP, encryption, hashing, MinHash, similarity, text extraction, perceptual hash | Algorithm correctness |
| **Integration** | Auth flow, file lifecycle, dedup pipeline, dashboard | End-to-end API contracts |
| **Security** | JWT (missing/tampered/expired), RBAC (7 tests), IDOR (7 cross-tenant vectors), file security | Isolation guarantees |

**Total**: 50+ automated tests across 3 categories.

---

## 6. Dependency Audit

| Package | Purpose | Status |
|---------|---------|--------|
| fastapi | Core ASGI framework | ✅ |
| uvicorn[standard] | ASGI server | ✅ |
| pymongo | MongoDB driver | ✅ |
| pydantic / pydantic-settings | Config + schemas | ✅ |
| passlib[bcrypt] / bcrypt | Password hashing | ✅ |
| python-jose[cryptography] | JWT tokens | ✅ |
| cryptography | AES-256-GCM | ✅ |
| python-multipart | File upload parsing | ✅ |
| slowapi | Rate limiting | ✅ |
| python-magic-bin | MIME detection | ✅ |
| numpy / datasketch | MinHash/LSH | ✅ |
| pymupdf / PyPDF2 | PDF text extraction | ✅ |
| python-docx / openpyxl / python-pptx / xlrd / striprtf | Document extraction | ✅ |
| Pillow | Image perceptual hashing | ✅ |
| requests | Webhook HTTP calls | ✅ |
| pytest / httpx | Testing | ✅ |

No unused dependencies. All packages serve a documented purpose.

---

## 7. Constraints Enforced

> **NO ML/AI/LLM** — The system is entirely deterministic:
> - SHA-256 cryptographic hashing
> - MinHash/LSH with exact Jaccard verification
> - dHash perceptual image hashing
> - Regex + Luhn DLP
> - AES-256-GCM encryption
>
> ML/AI is reserved as a future roadmap item only.
