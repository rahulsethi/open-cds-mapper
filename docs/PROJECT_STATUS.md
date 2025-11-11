# Open CDS Mapping Toolkit — Project Status & Checklist

> Authoritative tracker for this repo. Mirrors the high-level tasks and our step-by-step working mode.

## 1) Tools & IDE Setup — ✅ Completed

All items below were confirmed in this thread.

- [x] **T1. VS Code installed**
- [x] **T2. Core extensions installed** (Python, Pylance, Jupyter, ESLint, Prettier, Tailwind CSS IntelliSense, GitLens, REST Client)
- [x] **T3. Built-in terminal opened**
- [x] **T4. Git installed & verified**
- [x] **T5. Working in `open-cds-mapper` repo window**
- [x] **T6. Node.js LTS installed & verified**
- [x] **T7. Python 3.11 virtualenv created & selected**
- [x] **T8. Comfort settings applied** (Format on Save, Auto Save onFocusChange, default terminal)
- [x] **T9. In-editor AI chat tried (learning aid)**
- [x] **T10. SSH key added to GitHub (verified)**

**Captured versions (for reproducibility):**

- Node: `v24.11.0`, npm: `10.9.4`
- Python (venv): `3.11.9`
- Git: `2.51.2.windows.1`
- Terminal profile: PowerShell

---

## 2) Repository

- **GitHub URL:** https://github.com/rahulsethi/open-cds-mapper
- **Default branch:** `main`
- **Auth:** SSH set up and tested

---

## 3) Next Steps — in order (unchecked until you confirm each)

### Phase A — MVP (v0.1)

- [ ] **A4. Create repo skeleton** (`web/`, `api/`, `data/`, `docs/`, root README, .gitignore, LICENSE). _No business logic; upload form + table stub; FastAPI `/health` and `/match/` placeholder._
- [ ] **A5. Define CSV schemas + sample data.** (`ecc_extractors.csv`, `s4_cds.csv`)
- [ ] **A6. Implement baseline matcher** (RapidFuzz + small synonym packs; heuristics first)
- [ ] **A7. Optional LLM reranker via Groq** (Llama 3.1 8B; strict env vars)
- [ ] **A8. Review UI** (filters, accept/override, CSV/HTML export)
- [ ] **A9. Smoke test + demo script** (repeatable local run)

### Phase B — Nice-to-have (v0.2)

- [ ] **B1. Explain-why panel + confidence badges**
- [ ] **B2. Gold-set evaluator (precision/recall)**

### Ops & Hosting

- [ ] **O1. Review & confirm low-cost architecture/budget plan** (Vercel UI; Fly/Render/Railway API; Neon; Upstash; Vercel Cron)
- [x] **O2a. Create GitHub repository (SSH working)**
- [ ] **O2b. Adopt daily commit practice** (small, atomic commits; Conventional Commits style)

---

## 4) Working Mode

- We go **one tiny step at a time**; only the user marks items **Confirmed** here.
- When a step is done, tick it and add a short note (commit SHA, link, or date).

---

## 5) Notes & Links

- Tech stack decisions: `docs/TECH_STACK_AND_DECISIONS.md`
- Architecture & hosting plan: `docs/ARCHITECTURE_AND_HOSTING.md`
- Imported learnings (no artifacts): `docs/LEARNINGS_FROM_OTHER_THREAD.md`

---

### Change Log

- **2025-11-11** — Tools & IDE setup completed (T1–T10). GitHub repo created and linked via SSH. Recorded versions (Node/Python/Git).
