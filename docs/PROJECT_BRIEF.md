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

## First priorities (Weeks 1–2)

Follow the onboarding program: [cursor/onboarding/README.md](../cursor/onboarding/README.md) (~1 hr/day Mon–Fri for two weeks).

**Week 1 — Foundation criteria:**
1. Complete Day 0 laptop setup and GitHub collaborator access
2. Daily trust recordings uploaded (see [cursor/onboarding/04_TRUST_RECORDING.md](../cursor/onboarding/04_TRUST_RECORDING.md))
3. Log daily progress in `progress/WEEK1_LOG.md` and push to GitHub
4. Learn Git, automation, AI/LLMs, and agents (NVIDIA + Cursor resources in onboarding)
5. Run `setup.ps1`, then `npm run dev:all` — confirm app runs locally
6. Document top 3 gaps in `progress/CURRENT_STATE.md`
7. Deliver first small improvement (bugfix, UI polish, or module enhancement) by Friday
8. Run Session Start / Session End from `cursor/SESSION_COMMANDS.md` without help

**Week 2 — Development criteria:**
1. Complete three small improvements pushed to GitHub
2. Log daily in `progress/WEEK2_LOG.md` and `progress/DAILY_LOG.md`
3. Test offline tutor and document results
4. Submit two-week summary in `progress/DAILY_LOG.md`
5. Confirm onboarding completion criteria in the Word guide (Part 11) with management

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
