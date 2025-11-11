# Open CDS Mapping Toolkit — Dev Skeleton (Aligned)

This repo follows the **MVP plan** in `docs/`:

- Single **Next.js 14** app (TypeScript, Tailwind, TanStack Table) with **Route Handlers** for `/api/*` in the target deploy.
- **Local dev (today):** separate FastAPI + Next.js just to get moving; we will converge to the single-app plan soon.

**Key ideas from the docs**

- Inputs: `ecc_extractors.csv` (required) + optional `s4_cds.csv` override; both include `fields_json` with field objects.
- Matcher: heuristics-first (name/meta + **field-coverage**); optional LLM re-rank via Groq; bundled **CDS Registry** (mergeable by CSV delta).
- Working mode: step-by-step, checklists, full-file outputs; keep artifacts separate from other threads (learnings only).
- Repo hygiene: conventional commits; small PRs.

See:

- `docs/PROJECT_OVERVIEW.md` (MVP inputs/outputs)
- `docs/ARCHITECTURE_AND_HOSTING.md` (Next.js single-app plan)
- `docs/TECH_STACK_AND_DECISIONS.md` (Route Handlers, registry, scoring)
- `docs/ASSISTANT_WORKING_MODE.md` (process)
- `docs/REPO_AND_GIT_PRACTICES.md` (commits/PRs)

> Citations: PROJECT_OVERVIEW, TECH_STACK_AND_DECISIONS, ARCHITECTURE_AND_HOSTING, ASSISTANT_WORKING_MODE, REPO_AND_GIT_PRACTICES.

---

## Repo layout (current)

web/ # Next.js app (App Router, Tailwind, TanStack Table)
api/ # FastAPI stub (temporary for local dev)
data/ # placeholder
docs/ # planning docs

### Status

- API: `/health` works; `/match/` returns a placeholder (no matcher yet).
- Web: Home page renders; **Upload (stub)** and **Placeholder Table** show.

---

## Run locally

### 1) API (FastAPI, temporary for local dev)

```powershell
cd api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8000
```
