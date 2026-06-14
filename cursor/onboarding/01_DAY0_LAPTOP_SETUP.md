# Day 0 — Laptop Setup

Do this when your laptop arrives, **before Monday**. No coding yet — just install software and create accounts.

**OS:** Windows 10 or 11 (required for `setup.ps1`).

---

## Step 1 — Windows updates

1. Open **Settings → Windows Update**
2. Install all updates
3. Restart if prompted

---

## Step 2 — Install Git

Git tracks file changes and syncs them with GitHub.

1. Download: https://git-scm.com/download/win
2. Run the installer — default options are fine
3. Open **PowerShell** (search "PowerShell" in Start menu)
4. Verify:

```powershell
git --version
```

You should see something like `git version 2.x.x`.

---

## Step 3 — Install Python

UStud's backend uses Python.

1. Download Python 3.10 or newer: https://www.python.org/downloads/
2. On the first installer screen, check **"Add python.exe to PATH"**
3. Click **Install Now**
4. Verify:

```powershell
python --version
```

You should see `Python 3.10.x` or higher.

---

## Step 4 — Install Node.js

UStud's UI uses Node.js.

1. Download **LTS**: https://nodejs.org/
2. Run installer with defaults
3. Verify:

```powershell
node --version
npm --version
```

---

## Step 5 — Install Cursor

Cursor is your AI-powered code editor.

1. Download: https://cursor.com/download
2. Install and open Cursor
3. Sign in or create a free account when prompted

---

## Step 6 — Install Ollama

Ollama runs the local AI tutor offline.

1. Download: https://ollama.com/download
2. Install (requires admin permission)
3. Verify:

```powershell
ollama --version
```

You will pull the model later with `setup.ps1`.

---

## Step 7 — Install OBS Studio

OBS records your screen + webcam for Week 1 trust sessions.

1. Download: https://obsproject.com/
2. Install with defaults
3. Open OBS once to confirm it launches (full setup is in [04_TRUST_RECORDING.md](04_TRUST_RECORDING.md))

---

## Step 8 — Create accounts (free)

### GitHub

1. Go to https://github.com/signup
2. Choose a username (management will need this for the collaborator invite)
3. Verify your email
4. **Tell management your username** so they can add you to the repo

### NVIDIA Developer (for free AI courses)

1. Go to https://developer.nvidia.com/login
2. Create a free account
3. You will use this for Week 1 courses on Wednesday and Thursday

---

## Step 9 — Accept GitHub invite

1. Check your email for an invite to **axiom-forhumanity/ustud**
2. Click **Accept invitation**
3. Confirm you can open: https://github.com/axiom-forhumanity/ustud

---

## Day 0 checklist

- [ ] Windows updated
- [ ] Git installed (`git --version` works)
- [ ] Python installed (`python --version` works)
- [ ] Node.js installed (`node --version` works)
- [ ] Cursor installed and opened
- [ ] Ollama installed (`ollama --version` works)
- [ ] OBS Studio installed
- [ ] GitHub account created; username sent to management
- [ ] NVIDIA Developer account created
- [ ] GitHub collaborator invite accepted

**Next:** Monday — [02_GITHUB_ZERO_TO_HERO.md](02_GITHUB_ZERO_TO_HERO.md) and [03_WEEK1_BOOTCAMP.md](03_WEEK1_BOOTCAMP.md) (Monday section).
