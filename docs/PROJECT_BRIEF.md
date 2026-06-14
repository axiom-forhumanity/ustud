# Project Brief — UStud (AXIOM)

## Mission
Continue building UStud: an offline-first AI learning platform for learners who need curriculum-guided education without reliable internet.

## Base code (already provided)
This repo contains a working foundation:
- Python/FastAPI backend: `src/ustud/`
- React/Vite UI: `boiler/`
- Course modules: `modules/`
- Entry point: `run.py`

## Your job
Build on this foundation. Do not rewrite from scratch unless documented and approved via progress/BLOCKERS.md.

## First priorities (Week 1)
1. Clone repo, run `setup.ps1`, confirm app runs locally
2. Read README.md and understand project structure
3. Document current state in progress/CURRENT_STATE.md
4. Identify top 3 gaps vs product vision (with Cursor's help)
5. Deliver first small improvement (bugfix, UI polish, or module enhancement)

## How to run locally
See root README.md:
- `npm run dev:all` (API + UI together)
- OR `python run.py` after building UI

## Definition of done (each task)
- Works locally
- progress/DAILY_LOG.md updated
- progress/CURRENT_STATE.md updated
- Committed and pushed to GitHub
- Blockers/questions in progress/BLOCKERS.md if needed

## Out of scope (unless CEO approves)
- Replacing Ollama with cloud-only AI
- Removing offline capability
- Major architecture rewrites without decision log entry

## Cursor workflow (required)
Every session:
1. Paste Session Start command from cursor/SESSION_COMMANDS.md
2. Work
3. Paste Session End command before push
