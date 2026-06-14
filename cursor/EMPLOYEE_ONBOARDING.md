# AXIOM Employee Onboarding — Cursor + GitHub Workflow

## Your tools
- **Your GitHub repo** — where your code and progress live (source of truth)
- **Cursor** — where you build locally
- **This project** — UStud base code + AXIOM instructions + progress logs

## Setup (one time)

### Step 1 — Get the base code
Clone the bootstrap repo from management (one-time handoff):

```bash
git clone https://github.com/axiom-forhumanity/ustud.git
cd ustud
```

### Step 2 — Create YOUR own private repo
1. Go to [github.com/new](https://github.com/new)
2. Name it `ustud` (or any name you prefer)
3. Set visibility to **Private**
4. Do **not** initialize with README (you already have code)
5. Click **Create repository**

### Step 3 — Point your local clone to YOUR repo
Replace `YOUR_GITHUB_USERNAME` with your GitHub username:

```bash
git remote rename origin bootstrap
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/ustud.git
git push -u origin main
```

Your repo is now the source of truth. You push all daily work here.

### Step 4 — Add management as collaborator
On GitHub: **Your repo → Settings → Collaborators → Add people**

Add `chefomid` (or the username management gives you) with **Write** or **Maintain** access.

This lets management review commits, progress logs, and blockers.

### Step 5 — Local development setup
Open the folder in Cursor, then run:

```powershell
.\setup.ps1
cd boiler; npm install; cd ..
npm install
```

Read `docs/PROJECT_BRIEF.md` and this file. Read `cursor/SESSION_COMMANDS.md`.

### Step 6 — Enable EOD brief (optional, management may do this)
Management can configure GitHub Actions secrets on your repo for end-of-day AI summaries.
See `docs/EOD_BRIEF_SETUP.md`.

---

## Every work session

### Step 1 — Start session
Open Cursor chat and paste the **Session Start** command from `cursor/SESSION_COMMANDS.md`.

Wait for Cursor to confirm it has read the instructions and project state.

### Step 2 — Work normally
Build, ask Cursor for help, commit code as you go.

### Step 3 — End session (required)
Paste the **Session End** command from `cursor/SESSION_COMMANDS.md`.

Review what Cursor logged. Edit if needed.

### Step 4 — Push to YOUR GitHub repo (required daily)
```bash
git add .
git commit -m "Describe today's work"
git push
```

Management reads `progress/DAILY_LOG.md` on your repo and receives an end-of-day AI summary when configured.

---

## Rules
- Never skip the session end log
- Never push without updating progress files
- If stuck or unsure about scope, use the management question command
- Do not delete old log entries
- Keep management added as collaborator at all times

## What management sees
- Your daily log on your repo
- Code commits on GitHub
- Blockers and questions in `progress/BLOCKERS.md`
- AI-generated executive summary (when EOD Action secrets are configured)

## Quick reference

| Remote | Purpose |
|--------|---------|
| `origin` | **Your repo** — push daily work here |
| `bootstrap` | Original handoff repo (optional, for pulling base updates from management) |

To pull future base updates from management (rare):
```bash
git fetch bootstrap
git merge bootstrap/main
```
