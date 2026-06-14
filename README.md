# UStud - Offline AI Learning Platform

A modular, offline-first learning platform for Afghan girls. Runs on cheap laptops (4-8GB RAM) with no internet required.

## Features

- **Curriculum-guided learning** - Basics to advanced within each course
- **Offline AI tutor** - Local LLM (Ollama + SmolLM2) for Q&A
- **Language interpreter** - Translate to Dari (Persian) for learners
- **Content library** - Simple Wikipedia (ZIM) + curated course packs
- **Modular courses** - Math, Science, English, Mental Health, Fitness & Nutrition

## Quick Start

> **Library PDFs** are not in this repo (too large for GitHub). After cloning, run `python scripts/download_oer.py` to fetch textbooks, or copy PDFs into `Library/` locally.

### 1. Install Python 3.10+

### 2. Install Ollama

Download and install from https://ollama.com/download (requires manual install).

### 3. Run setup script

```powershell
.\setup.ps1
```

This installs Python packages, pulls the Ollama model, and optionally downloads Wikipedia (~441MB).

Or manually:

```bash
pip install -r requirements.txt
ollama pull smollm2:135m
```

### 4. Install UI dependencies

```bash
cd boiler
npm install
cd ..
```

### 5. Run UStud

**Option A — API + Vite dev server together (hot reload):**

```bash
npm install          # once, at repo root — installs concurrently
npm run dev:all
```

- API: http://127.0.0.1:8765  
- UI (use this in the browser): http://localhost:5173 (Vite proxies `/api` to the API)

**Option B — production-style (built UI served by Python):**

```bash
cd boiler
npm run build
cd ..
python run.py
```

Open http://127.0.0.1:8765 in your browser (URLs look like `http://127.0.0.1:8765/#/`).

After pulling UI fixes, **rebuild** the frontend (`cd boiler && npm run build`) and **restart** `python run.py` so Library PDFs and Wikipedia (ZIM) use the latest API.

**Option C — two terminals:** `python run.py` and `cd boiler && npm run dev`.

## Features

- **Search** - Search bar in header: search across courses and Wikipedia. Check "AI summary" for an AI-generated answer.
- **RAG chunking** - Large content is chunked for the AI context window.
- **Default model** - Uses `gemma3:4b` for better responses. For low RAM (4GB), set `USTUD_LLM_MODEL=smollm2:135m` before running.

## Optional: Translation (Dari)

The first translation will download the model (~300MB). Subsequent translations use a local cache.

## Project Structure

```
ustud/
├── src/ustud/          # Python backend
│   ├── core/           # RAG, LLM, curriculum, interpreter, plugins
│   ├── api/            # FastAPI routes
│   └── main.py
├── modules/            # Course modules (plugins)
│   ├── core_curriculum/
│   ├── english_basics/
│   ├── mental_health/
│   └── fitness_nutrition/
├── ui/                 # Web frontend
└── run.py
```

## Adding New Modules

1. Create `modules/your_module/`
2. Add `manifest.json` with id, name, content_packs
3. Add `curriculum.yaml` with units and lessons
4. Add content in `content/pack_id/lesson_id.md`

## AXIOM Employee Workflow

This repo includes an AXIOM management layer for remote development with progress tracking.

**New employees:** Start with [cursor/onboarding/README.md](cursor/onboarding/README.md) (zero-to-hero Week 1). After graduation, use [cursor/EMPLOYEE_ONBOARDING.md](cursor/EMPLOYEE_ONBOARDING.md).

Every Cursor session:
1. Paste the **Session Start** command from [cursor/SESSION_COMMANDS.md](cursor/SESSION_COMMANDS.md)
2. Work on assigned tasks (see [docs/PROJECT_BRIEF.md](docs/PROJECT_BRIEF.md))
3. Paste the **Session End** command before committing
4. Push to GitHub daily — update `progress/DAILY_LOG.md` and related files

Management reads progress logs and receives an end-of-day AI summary (when GitHub secrets are configured).
