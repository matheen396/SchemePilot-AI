# SchemePilot AI

An AI-assisted discovery app for public-benefit programs. Search uses local sentence embeddings with PostgreSQL/pgvector, combines semantic similarity with PostgreSQL full-text ranking, and can produce source-grounded answers through an OpenAI-compatible LLM endpoint. The UI is Next.js + React + TypeScript; the API is Node.js + Express + TypeScript.

> **Prototype data:** the included seed records are illustrative demo records, not verified government guidance. Replace them with reviewed official source data before inviting applicants to rely on results. The repository is not yet a deployed service and has no real-user count.

## What this project demonstrates

- Full-stack TypeScript: Next.js App Router frontend and typed Express REST/SSE API
- PostgreSQL schema design, parameterized queries, full-text search, GIN/B-tree indexes, and pgvector HNSW cosine index
- Supabase-ready managed Postgres connection using `DATABASE_URL`, with SQL migrations and Row Level Security notes
- Local embedding inference with Hugging Face Transformers.js (`all-MiniLM-L6-v2`, 384 dimensions)
- Hybrid semantic + lexical retrieval, category/state filters, profile-based eligibility ranking, and observable latency
- Grounded streaming RAG chat (Groq-compatible or other OpenAI-compatible provider) with retrieved source citations
- JWT authentication, password hashing, profile CRUD, saved programs, request validation, rate limiting, and security headers
- Unit/integration tests, GitHub Actions, Docker Compose, and AWS deployment notes

## Architecture

```text
Next.js / React web client
        │ HTTPS / JSON / Server-Sent Events
        ▼
Express API (stateless, horizontally scalable)
   ├── Transformers.js local embedding model
   ├── PostgreSQL: hybrid search + profiles + saved items + events
   └── optional OpenAI-compatible LLM (Groq, OpenAI, or compatible provider)
        │
        └── Supabase Postgres with pgvector, or local pgvector container
```

The API connects directly to Postgres with `pg`. Supabase supplies managed Postgres and the `vector` extension; the same migrations work against local Docker Postgres and a Supabase project. Search embeddings are created by a fixed 384-dimensional model. Do not change the model without rebuilding stored embeddings.

## Run locally

Requirements: Node.js 20.18+ and Docker Desktop. The embedding model is downloaded on first use, so the first search may take longer and needs internet access.

1. Copy `.env.example` to `.env` and keep the local defaults.
2. Start Postgres with pgvector:

   ```powershell
   docker compose up -d db
   ```

3. Install packages, migrate, and load the clearly marked demo data:

   ```powershell
   npm install
   npm run db:migrate
   npm run db:seed
   ```

4. Start web and API in separate terminals:

   ```powershell
   npm run dev:api
   npm run dev:web
   ```

5. Open `http://localhost:3000`. API health is at `http://localhost:4000/api/health`.

To run checks:

```powershell
npm test
npm run typecheck
npm run build
```

To use an LLM for the chat endpoint, set `LLM_API_KEY`, `LLM_BASE_URL` (for example `https://api.groq.com/openai/v1`), and `LLM_MODEL` in `.env`. Without those values, chat returns a clearly marked extractive answer from retrieved evidence. Never put the LLM key in `NEXT_PUBLIC_*` variables.

## Supabase setup

1. Create a Supabase project and enable the `vector` extension.
2. Copy the project database connection URI into `DATABASE_URL`; use the pooler URI if your runtime cannot keep direct connections. Keep credentials server-side.
3. Run `npm run db:migrate` against that database. Seed demo rows only in a non-production project.
4. For a production Supabase project, follow `docs/supabase.md` to enable RLS and use a dedicated restricted application role where supported. The API uses its own JWT-based application accounts in the starter; Supabase Auth integration is documented as a follow-up, not falsely presented as implemented.

## REST API overview

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | liveness/readiness |
| `POST` | `/api/auth/register` | create demo account |
| `POST` | `/api/auth/login` | issue access token |
| `GET`, `PUT` | `/api/me/profile` | read or update eligibility profile (auth) |
| `POST` | `/api/search` | hybrid search with optional state/category filters |
| `POST` | `/api/chat` | grounded response as Server-Sent Events |
| `GET`, `POST`, `DELETE` | `/api/saved` | list, save, unsave a program (auth) |
| `GET` | `/api/metrics/search` | search count and observed p50/p95 latency |

API requests and sample payloads are in `docs/api.md`. Search is public for the demo; personal profiles and saved programs require a token. This is a portfolio starter, not a production authorization review.

## Search quality and performance

Each program has a normalized text document embedded at ingestion. Queries use the same model. PostgreSQL ranks cosine distance with `<=>`, combines it with `ts_rank_cd`, filters structured fields, and uses an HNSW index plus a GIN full-text index. The application records each request duration so you can measure p50/p95 on the data and hardware you actually deploy. Do not advertise benchmark values before measuring them. Use `docs/search-benchmark.md` to compare vector-only, lexical-only, and hybrid retrieval, record recall@k against a small reviewed query set, and report results with dataset size and hardware.

## GitHub and deployment

The GitHub Actions workflow runs tests, type checks, and production builds. The API and web app have separate Dockerfiles. `docs/aws-deploy.md` gives a concrete AWS path using ECR + App Runner for the API and AWS Amplify or an App Runner web service for Next.js, with Supabase as the database. Deployment still requires your AWS/Supabase accounts, secrets, and a public domain; this repository does not claim it has been deployed.

## Before real users

- Replace demo records with sourced and human-reviewed program data; retain source URLs and review dates.
- Add official data ingestion, freshness checks, audit logs, backups, privacy policy, abuse monitoring, and accessibility testing.
- Integrate Supabase Auth (or a production identity provider), rotate secrets, use TLS, and review authorization/RLS.
- Deploy to AWS, monitor cold starts/model memory and database connections, then invite testers with consent.
- Only add user counts, latency numbers, and a live demo link to your resume after measuring them.

## License

MIT.
