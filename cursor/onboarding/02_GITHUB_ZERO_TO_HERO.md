# GitHub Zero to Hero

Plain-language guide plus copy-paste commands for Windows PowerShell.

---

## What is Git?

**Git** tracks every change to files in a project. Think of it as a time machine for code — you can see what changed, when, and by whom.

## What is GitHub?

**GitHub** stores your Git project online. The team repo is:

**https://github.com/axiom-forhumanity/ustud**

You clone it to your laptop, work locally, then **push** changes back so management can review them.

## Key words

| Word | Meaning |
|------|---------|
| **Repository (repo)** | The project folder + its full history |
| **Clone** | Download the repo to your laptop |
| **Commit** | Save a snapshot of your changes with a message |
| **Push** | Upload your commits to GitHub |
| **Pull** | Download the latest changes from GitHub |
| **Branch** | A line of work; we use `main` |

---

## One-time setup

Open **PowerShell** and run (replace with your name and email):

```powershell
git config --global user.name "Your Full Name"
git config --global user.email "your.email@example.com"
```

This labels your commits so management knows who made each change.

---

## Clone the repo (once)

```powershell
cd $HOME\Documents
git clone https://github.com/axiom-forhumanity/ustud.git
cd ustud
```

**What this does:** Downloads the full project into `Documents\ustud`.

Open the folder in Cursor: **File → Open Folder → Documents\ustud**

---

## Daily workflow

Run this at the start of every work session:

```powershell
cd $HOME\Documents\ustud
git pull
```

**What this does:** Gets any changes from GitHub before you start working.

After you edit files:

```powershell
git status
```

**What this does:** Shows which files you changed.

```powershell
git add .
```

**What this does:** Stages all your changes for the next commit.

```powershell
git commit -m "Week1 Day1: describe what you did in one line"
```

**What this does:** Saves a snapshot locally with your message.

```powershell
git push
```

**What this does:** Uploads your commit to GitHub.

---

## Example — first commit (Monday)

```powershell
cd $HOME\Documents\ustud
git pull
# Edit progress/WEEK1_LOG.md in Cursor, then:
git status
git add .
git commit -m "Week1 Day1: completed GitHub setup and first push"
git push
```

---

## Troubleshooting

### `Permission denied` or `403` — wrong GitHub account

Git is logged in as someone who is not a collaborator.

1. Install GitHub CLI if needed: https://cli.github.com/
2. Run:

```powershell
gh auth login
```

3. Choose: GitHub.com → HTTPS → Login with browser
4. Log in as **your** account (the one management invited)
5. Retry `git push`

To clear old saved passwords on Windows:

```powershell
cmdkey /delete:LegacyGeneric:target=git:https://github.com
```

Then run `gh auth login` again.

### `remote hung up unexpectedly` on push

The repo is large if it includes Library PDFs. **PDFs are not in Git** — download them locally after clone:

```powershell
python scripts/download_oer.py
```

If push still fails, tell management in `progress/BLOCKERS.md`.

### `Please tell me who you are` on commit

Run the one-time `git config --global user.name` and `user.email` commands above.

### Merge conflict after `git pull`

Someone else changed the same file. Tell Cursor:

```
I got a merge conflict after git pull. Help me resolve it safely.
```

Do not force-push unless management instructs you.

---

## Why management can see your work

You push to **axiom-forhumanity/ustud** as a collaborator. Every commit, progress log, and blocker file is visible to management. This is intentional — it keeps everyone aligned.

---

## Next

Continue with [03_WEEK1_BOOTCAMP.md](03_WEEK1_BOOTCAMP.md) for your daily Mon–Fri plan.
