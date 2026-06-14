# UStud — guide for Claude Code and AI assistants

This document helps coding agents understand **what UStud is**, **where it should go**, and **how to work on it safely**. Read it before large refactors or new features.

---

## What this app is

**UStud** is an **offline-first learning platform**: a web UI plus a **Python (FastAPI)** backend that serves curriculum, a **PDF/EPUB library**, optional **offline Wikipedia (ZIM/Kiwix)**, and an **AI reading/tutor** path that uses **local LLMs (Ollama)** and **RAG** over ingested content.

The original README frames the mission around **accessible education** (e.g. learners in low-connectivity contexts) with content and UX appropriate to that audience—**respect that intent** when changing copy, defaults, or pedagogy.

---

## Vision (where to improve from here)

High-level direction (not a strict roadmap):

1. **Reliability first** — API + UI run together; PDFs and chat work without surprises; errors are understandable.
2. **Deep reading** — Library PDFs with a strong in-app reader (navigation, highlights, context to the assistant), plus clear paths to legal OER materials.
3. **Smarter assistance** — RAG and chat stay accurate, grounded in what the learner is actually reading, within local hardware limits.
4. **Sustainability** — Keep dependencies and models viable on **modest machines (e.g. 4–8 GB RAM)** where possible.

Advance features **after** the app is verified healthy in a dev environment (see checklist below).

---

## Architecture (mental model)

| Layer | Role | Location |
|--------|------|----------|
| **Backend** | FastAPI app, routes under `/api`, serves built UI in production, library file streaming, Wikipedia/ZIM proxy, chat/RAG | `src/ustud/` (`main.py`, `api/routes.py`, `core/`) |
| **Frontend** | Vite + React SPA; talks to backend via **`/api`** (proxied in dev) | `boiler/` |
| **Courses** | YAML curriculum + markdown under `modules/<id>/` | `modules/` |
| **Flat library** | User PDFs/EPUBs under project **`Library/`** (capital L on Windows); **not** under `…/content/…` course packs | `Library/`, manifest `Library/ustud_manifest.json` |
| **Scripts** | OER download, library organization helpers | `scripts/` |

**Ports (typical dev):**

- **API:** `http://127.0.0.1:8765` — `python run.py` (`run.py` → `uvicorn ustud.main:app`)
- **Vite UI:** `http://localhost:5173` — `cd boiler && npm run dev`  
  Vite **`/api`** proxy → `8765` (see `boiler/vite.config.js`)

**Production-style:** `cd boiler && npm run build`, then `python run.py` — single port **8765** serves API + static UI.

Root convenience: **`npm run dev:all`** (from repo root) runs API + Vite together (requires root `npm install` for `concurrently`).

---

## Do this first: health checklist (before refactoring or shipping)

Treat this as **non-optional** when onboarding or before big changes.

1. **Python** — 3.10+; `pip install -r requirements.txt` at repo root.
2. **Frontend** — `cd boiler && npm install`.
3. **Run the stack** — From root: `npm run dev:all` **or** two terminals: `python run.py` and `npm run dev --prefix boiler`.
4. **Smoke test in browser** (use **5173** in dev, not only the API port):
   - App loads without console errors.
   - A **Library** PDF opens in the reader (requires API + valid file under `Library/`).
   - **Chat / reading assistant** responds if Ollama is installed and the expected model is pulled (see root `README.md`).
5. **Optional** — Wikipedia/ZIM: only if configured; missing ZIM should degrade gracefully.

If something fails, **fix environment and wiring first** (ports, proxy, `Library/` path, Ollama), then touch code.

---

## Conventions for agents

- **Match existing style** — Same patterns as surrounding files; avoid drive-by refactors unrelated to the task.
- **Backend** — Preserve path safety for library and module content (no path traversal).
- **Frontend** — API base is same-origin `/api` in dev; don’t hardcode production URLs.
- **Content** — Prefer **legal OER** (OpenStax, etc.); don’t add flows that encourage copyright infringement.
- **README drift** — Root `README.md` may mention older paths (`ui/`); the live SPA lives under **`boiler/`**.

---

## Ideas for improvement (after health checks)

Prioritize according to project goals and measured pain points:

- **PDF/RAG** — Faster listing, clearer errors when files missing; optional thumbnail/cache strategies for large libraries.
- **Retrieval quality** — Chunking, manifests (`Library/ustud_manifest.json`), subject-aware routing (`boiler/src/lib/librarySubjects.js`).
- **UX** — Reading room toolbar, accessibility, mobile layouts.
- **Packaging** — PyInstaller / installers if documented elsewhere; keep runbooks accurate.

---

## Quick commands reference

```powershell
# One-shot dev (API + Vite)
npm install          # repo root, once
npm run dev:all
```

```powershell
# UI production build
cd boiler && npm run build && cd ..
python run.py        # serve on :8765
```

---

## Related docs

- **`README.md`** — Human-facing setup (Ollama, ZIM, models).
- **`Library/README.md`** — Course packs vs loose PDFs, OER scripts.

---

*Last intent: give Claude Code enough context to **validate the stack**, **respect the product vision**, and **extend the codebase deliberately**.*
