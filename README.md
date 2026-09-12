# DDAS — Data Download Duplication Alert System

DDAS is a deterministic security, compliance, auditing, and storage optimization platform designed to regulate corporate file downloads and storage workflows. It features a hardened multi-tenant architecture, cryptographic file deduplication, near-duplicate content fingerprinting via MinHash LSH, perceptual image deduplication via dHash, and real-time Data Loss Prevention (DLP) compliance alerting.

> **Deterministic Security Guarantee:** DDAS operates strictly on deterministic algorithms (SHA-256 cryptographic hashing, MinHash LSH, dHash perceptual hashing, AES-256-GCM, regex with Luhn checksum verification). It does **NOT** use machine learning, deep learning, LLMs, or AI agents. (ML/AI classification is reserved for future roadmap exploration).

> **⚠️ Security Notice:** If you are deploying from a cloned repository, you MUST rotate ALL secrets in your `.env` file before production use. Generate new values using: `python -c "import secrets; print(secrets.token_urlsafe(48))"` for `JWT_SECRET` and `python -c "import secrets; print(secrets.token_hex(32))"` for `ENCRYPTION_MASTER_KEY`.

---

## 🏗️ System Architecture

DDAS leverages a modular, production-hardened backend built with FastAPI, connected to a MongoDB document registry and an encrypted-at-rest storage vault. It services a modern, responsive React Web application.

```mermaid
graph TD
    subgraph Client Layer
        WebUI[React Web UI]
    end

    subgraph API Layer [FastAPI Versioned Routers]
        Router["/api/v1/* (and Root Aliases)"]
        RateLimit["Rate Limiter (SlowAPI)"]
        AuthMW["Auth & RBAC Dependency Injection"]
    end

    subgraph Service Layer
        AuthService[Auth Service]
        FileService[File Orchestration Service]
        DedupService[Dedup Service]
        DLPService[DLP Engine]
        EncService[AES-256-GCM Encryption Service]
        QuarantineService[Quarantine Remediation Service]
        AuditService[Audit Service]
    end

    subgraph Algorithm Layer
        SHA256[SHA-256 Digest]
        MinHash[MinHash Signature]
        LSH[MinHashLSH Candidate Discovery]
        Jaccard[Exact Jaccard Verifier]
        MIMECheck[libmagic & Extension Filter]
        Luhn[Luhn Checksum Verifier]
    end

    subgraph Repository Layer
        FileRepo[Tenant-Scoped File Repository]
        BlobRepo[Atomic Ref-Counting Blob Repository]
        UserRepo[Tenant-Scoped User Repository]
        AuditRepo[Tenant-Scoped Audit Repository]
    end

    subgraph Data Tier
        DB[(MongoDB - ddas_db)]
        Vault[(Encrypted Storage Vault - AES-256-GCM)]
    end

    WebUI --> Router
    Router --> RateLimit --> AuthMW
    AuthMW --> Service Layer
    Service Layer --> Algorithm Layer
    Service Layer --> Repository Layer
    Repository Layer --> DB
    BlobRepo --> Vault
```

---

## 🔒 Multi-Tenant Data Isolation & Security

1. **Logical Isolation (Database Scoping & IDOR Prevention):**
   Every resource (users, files, audit logs, and settings) is strictly scoped with a `company` tenant identifier. All queries, reads, writes, and deletions explicitly verify the user's verified tenant context. Cross-tenant access (`/files/download/{id}`, `/files/text/{id}`, `/files/{id}`, `/files/summary/{id}`) returns strict `404 Not Found`.

2. **Concurrency-Safe Atomic Deduplication:**
   Files are stored globally in the encrypted vault based on their SHA-256 hash. When multiple companies upload identical files:
   - **Atomic Reference Counting:** A dedicated `blobs` collection uses atomic `$inc` updates to prevent race conditions during concurrent deletions.
   - **No Data Loss on Delete:** A physical file is only deleted from disk when the global reference count reaches `0`.
   - **Isolated Redaction:** When an admin redacts sensitive content, the system creates a new encrypted file with a new hash. Other tenants referencing the original file remain completely unaffected.

3. **Near-Duplicate Detection via MinHash LSH:**
   Documents are tokenized into MinHash signatures (128 permutations). An in-memory Locality-Sensitive Hashing (LSH) index quickly filters candidates, followed by exact Jaccard similarity verification. Near-duplicate queries are scoped strictly to the tenant to eliminate metadata leakage.

4. **Deep Data Loss Prevention (DLP):**
   Deterministic pattern matching for Credit Cards (with Luhn checksum validation), AWS Access Keys, GitHub Tokens, generic API keys, US SSNs, IBANs, Phone Numbers, and Emails. Findings are classified into severity levels (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), automatically quarantining documents exceeding policy thresholds.

5. **Encryption-at-Rest:**
   Files are encrypted using AES-256-GCM with fresh 96-bit nonces per write. The master encryption key is independent from the JWT secret and validated on startup.

6. **Defensive Ingestion:**
   Enforces upload size caps (default 500MB, configurable), filename sanitization (protecting against path traversal, null bytes, and control characters), content validation (blocking executables via `libmagic`), and RFC 6266 compliant Content-Disposition headers.

7. **Image Perceptual Deduplication (dHash):**
   Image files (JPG, PNG, GIF, WebP, BMP, TIFF) are fingerprinted using a 16×16 difference hash. Hamming distance comparison detects visually near-identical images independent of the text MinHash/LSH pipeline.

8. **Storage Abstraction:**
   All physical file I/O is isolated behind `StorageService` (`save/read/delete/exists`), enabling future migration to S3 or cloud object stores without modifying business logic.

---

## 🚀 Setup & Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB (Running locally on `mongodb://localhost:27017` or configured via `.env`)

### 1. Central API Backend Setup
1. Navigate to `backend/`:
   ```bash
   cd backend
   ```
2. Activate your virtual environment:
   - **Windows (PowerShell):**
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **macOS/Linux:**
     ```bash
     source venv/bin/activate
     ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment:
   ```bash
   cp .env.example .env
   ```
   *Verify that `JWT_SECRET` (min 32 chars) and `ENCRYPTION_MASTER_KEY` (64 hex characters) are configured.*

5. Seed initial organization:
   ```bash
   python seed_db.py
   ```
6. Start the development API server:
   ```bash
   uvicorn app:app --reload --host 127.0.0.1 --port 8000
   ```

### 2. Web Frontend Setup
1. Navigate to `frontend/`:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Access the web interface at `http://localhost:5173`.

---

## 🧪 Running Automated Tests

DDAS includes a comprehensive automated test suite (63+ tests) across unit, integration, and security/isolation suites:

```bash
cd backend

# Run the complete test suite
python -m pytest tests/ -v

# Run unit tests (DLP, encryption, hashing, minhash, similarity, text extraction)
python -m pytest tests/test_unit/ -v

# Run security & tenant isolation tests (RBAC, IDOR, JWT, company boundaries)
python -m pytest tests/test_security/ -v

# Run integration tests (lifecycle, files, dedup, dashboard)
python -m pytest tests/test_integration/ -v
```

---

## 🐳 Docker Deployment

To build and run the backend using Docker:

```bash
cd backend
docker build -t ddas-backend .
docker run -d -p 8000:8000 --env-file .env ddas-backend
```

---

## 📡 API Reference Overview

The API supports both the modern versioned `/api/v1/*` routes and backward-compatible root aliases:

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/v1/health` | GET | Liveness probe | No |
| `/api/v1/ready` | GET | Readiness probe (MongoDB ping) | No |
| `/api/v1/register` | POST | User registration | No |
| `/api/v1/login` | POST | Authenticate & issue JWT | No |
| `/api/v1/users/me` | GET | Profile & personal metrics | Yes |
| `/api/v1/users/change-password` | POST | Update user password | Yes |
| `/api/v1/files/upload` | POST | Upload document with DLP & Dedup | Yes |
| `/api/v1/files` | GET | List tenant documents (supports pagination) | Yes |
| `/api/v1/files/download/{id}` | GET | Download decrypted document | Yes |
| `/api/v1/files/text/{id}` | GET | Extracted plain-text for diffs | Yes |
| `/api/v1/files/summary/{id}` | GET | Deterministic compliance summary | Yes |
| `/api/v1/files/{id}` | DELETE | Concurrency-safe document delete | Yes |
| `/api/v1/files/bulk-delete` | POST | Batch document delete | Yes |
| `/api/v1/dashboard/stats` | GET | Aggregated dashboard analytics | Yes |
| `/api/v1/admin/users` | GET | List company users | Admin |
| `/api/v1/admin/invite-code` | GET | Retrieve company invite code | Admin |
| `/api/v1/admin/quarantined-files` | GET | List quarantined files | Admin |
| `/api/v1/admin/quarantine/remediate` | POST | Remediate (approve/purge/redact) | Admin |
| `/api/v1/admin/logs` | GET | Tenant audit logs | Admin |
| `/api/v1/admin/settings` | GET/POST | Notification webhook settings | Admin |

*(Root routes `/login`, `/register`, `/upload`, `/files`, etc. are fully aliased for backward compatibility).*
