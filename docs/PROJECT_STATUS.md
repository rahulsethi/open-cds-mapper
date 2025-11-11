# Open CDS Mapping Toolkit — Project Status & Checklist

> Authoritative tracker for this repo. Mirrors the high-level tasks in `docs/TASK_TRACKER.md` and our step-by-step working mode.

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
  _(We’ll update these if we intentionally change versions.)_

---

## 2) Next Steps — in order (unchecked until you confirm each)

### Phase A — MVP (v0.1)

- [ ] **A4. Create repo skeleton** (`web/`, `api/`, `data/`, `docs/`, root README, gitignore, LICENSE). _No business logic; upload form + table stub; FastAPI `/health` and `/match/` placeholder._ :contentReference[oaicite:1]{index=1}
- [ ] **A5. Define CSV schemas + sample data.** (ecc_extractors.csv, s4_cds.csv) :contentReference[oaicite:2]{index=2}
- [ ] **A6. Implement baseline matcher** (RapidFuzz + small synonym packs; heuristics first). :contentReference[oaicite:3]{index=3}
- [ ] **A7. Optional LLM reranker via Groq** (Llama 3.1 8B; strict env vars). :contentReference[oaicite:4]{index=4}
- [ ] **A8. Review UI** (filters, accept/override, CSV/HTML export). :contentReference[oaicite:5]{index=5}
- [ ] **A9. Smoke test + demo script** (repeatable local run). :contentReference[oaicite:6]{index=6}

### Phase B — Nice-to-have (v0.2)

- [ ] **B1. Explain-why panel + confidence badges.**
- [ ] **B2. Gold-set evaluator (precision/recall).** :contentReference[oaicite:7]{index=7}

### Ops & Hosting (docs)

- [ ] **O1. Review & confirm low-cost architecture/budget plan.** (Vercel UI; Fly/Render/Railway API; Neon; Upstash; Vercel Cron). :contentReference[oaicite:8]{index=8}
- [ ] **O2. Confirm Git repo on GitHub + daily commit practice.** :contentReference[oaicite:9]{index=9}

---

## 3) Working Mode (how we update this file)

- We go **one tiny step at a time**; you alone mark items **Confirmed**. :contentReference[oaicite:10]{index=10}
- When a step is done, we’ll tick it here and add any short notes/links (e.g., commit SHA, demo URL).

---

## 4) Notes & Links

- Tech stack decisions (authoritative): see `docs/TECH_STACK_AND_DECISIONS.md`. :contentReference[oaicite:11]{index=11}
- Architecture & hosting plan: see `docs/ARCHITECTURE_AND_HOSTING.md`. :contentReference[oaicite:12]{index=12}
- Learnings imported (no artifacts): see `docs/LEARNINGS_FROM_OTHER_THREAD.md`. :contentReference[oaicite:13]{index=13}
