# AXIOM Employee Onboarding — Cursor + GitHub Workflow

> **New employee?** Start with **[cursor/onboarding/README.md](onboarding/README.md)** for zero-to-hero Week 1 setup (laptop, GitHub, trust recordings, AI bootcamp).

This document is your **ongoing workflow** after the two-week onboarding program (or if you already know Git and Cursor).

---

## Your tools

- **axiom-forhumanity/ustud** — shared GitHub repo where your code and progress live
- **Cursor** — where you build locally
- **This project** — UStud base code + AXIOM instructions + progress logs

---

## Setup (one time)

### Step 1 — Accept collaborator invite

Management adds your GitHub username to https://github.com/axiom-forhumanity/ustud

1. Check email for the invitation
2. Click **Accept**
3. Confirm you can open the repo in your browser

### Step 2 — Clone the repo

```powershell
cd $HOME\Documents
git clone https://github.com/axiom-forhumanity/ustud.git
cd ustud
```

Full Git guide: [cursor/onboarding/02_GITHUB_ZERO_TO_HERO.md](onboarding/02_GITHUB_ZERO_TO_HERO.md)

### Step 3 — Configure Git identity (once)

```powershell
git config --global user.name "Your Full Name"
git config --global user.email "your.email@example.com"
```

### Step 4 — Local development setup

Open the folder in Cursor, then run:

```powershell
.\setup.ps1
cd boiler; npm install; cd ..
npm install
```

Read `docs/PROJECT_BRIEF.md` and `cursor/SESSION_COMMANDS.md`.

Optional: download Library PDFs locally (not in Git):

```powershell
python scripts/download_oer.py
```

### Step 5 — EOD brief (optional)

Management may configure GitHub Actions secrets for end-of-day AI summaries.
See `docs/EOD_BRIEF_SETUP.md`.

---

## Every work session

### Step 1 — Start session

Open Cursor chat and paste the **Session Start** command from `cursor/SESSION_COMMANDS.md`.

Wait for Cursor to confirm it has read the instructions and project state.

### Step 2 — Work normally

Build, ask Cursor for help, commit code as you go.

Always `git pull` before starting:

```powershell
cd $HOME\Documents\ustud
git pull
```

### Step 3 — End session (required)

Paste the **Session End** command from `cursor/SESSION_COMMANDS.md`.

Review what Cursor logged. Edit if needed.

### Step 4 — Push to GitHub (required daily)

```powershell
git add .
git commit -m "Describe today's work"
git push
```

Management reads `progress/DAILY_LOG.md` and receives an end-of-day AI summary when configured.

---

## Rules

- Never skip the session end log
- Never push without updating progress files
- If stuck or unsure about scope, use the management question command
- Do not delete old log entries
- Push to **axiom-forhumanity/ustud** on `main` daily

---

## What management sees

- Your daily log in `progress/DAILY_LOG.md`
- Code commits on GitHub
- Blockers and questions in `progress/BLOCKERS.md`
- AI-generated executive summary (when EOD Action secrets are configured)

---

## Quick reference

| Command | Purpose |
|---------|---------|
| `git pull` | Get latest changes before you work |
| `git status` | See what you changed |
| `git add .` | Stage all changes |
| `git commit -m "message"` | Save a snapshot |
| `git push` | Upload to GitHub |

Troubleshooting (403, credentials): [cursor/onboarding/02_GITHUB_ZERO_TO_HERO.md](onboarding/02_GITHUB_ZERO_TO_HERO.md)
