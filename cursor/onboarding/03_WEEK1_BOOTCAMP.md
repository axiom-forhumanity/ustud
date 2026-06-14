# Week 1 Bootcamp — Monday to Friday

~1 hour per day. Same rhythm every day:

| Phase | Time | Action |
|-------|------|--------|
| Start recording | 0:00 | OBS: screen + webcam on ([04_TRUST_RECORDING.md](04_TRUST_RECORDING.md)) |
| Lesson + hands-on | 0:05–0:45 | Follow that day's section below |
| Stop + upload | 0:45–0:55 | Upload recording to management folder |
| Log + push | 0:55–1:00 | Update [progress/WEEK1_LOG.md](../../progress/WEEK1_LOG.md), commit, push |

---

## Monday — GitHub + first push

**Goal:** Clone the repo, understand Git basics, make your first commit.

### Learn (25 min)
1. Read [02_GITHUB_ZERO_TO_HERO.md](02_GITHUB_ZERO_TO_HERO.md) fully
2. Skim [GitHub Hello World](https://docs.github.com/en/get-started/start-your-journey/hello-world) (stop when you reach "Create a branch" — we use `main` only for now)

### Do (20 min)
1. Clone the repo (commands in 02_GITHUB_ZERO_TO_HERO.md)
2. Open `Documents\ustud` in Cursor
3. Open `progress/WEEK1_LOG.md` and fill in the **Monday** section
4. Run:

```powershell
cd $HOME\Documents\ustud
git pull
git add .
git commit -m "Week1 Day1: GitHub setup and first push"
git push
```

### Recording focus
Show the full clone, open in Cursor, edit WEEK1_LOG, and push on screen.

### Log fields
- Lesson completed: GitHub Zero to Hero + Hello World
- Trust recording URL: (paste after upload)
- Takeaway: one sentence — what is a commit?

---

## Tuesday — Automation basics

**Goal:** Understand what automation is and run the project setup script.

### Learn (20 min)
1. **Automation** = software doing tasks without you clicking each step
   - **Scripts** — files that run commands (example: `setup.ps1`)
   - **Scheduled tasks** — run at a set time (example: Windows Task Scheduler)
   - **CI/CD** — runs automatically when code is pushed (example: GitHub Actions)

2. Open and skim these files in Cursor (do not change them yet):
   - `setup.ps1` — installs Python packages and pulls the Ollama model
   - `.github/workflows/eod-ceo-brief.yml` — runs daily to email management a summary

3. Read [GitHub Actions quickstart](https://docs.github.com/en/actions/quickstart) (~20 min, read only)

### Do (25 min)
1. Always pull first:

```powershell
cd $HOME\Documents\ustud
git pull
```

2. Run setup (Ollama must be installed from Day 0):

```powershell
.\setup.ps1
```

3. If Ollama is missing, note the blocker in `progress/BLOCKERS.md` and continue other steps.

4. Update **Tuesday** in `progress/WEEK1_LOG.md`, commit, push.

### Recording focus
Show `setup.ps1` running and explain in your own words what automation means.

### Log fields
- Lesson completed: Automation basics + setup.ps1
- Takeaway: one sentence — what does setup.ps1 automate?

---

## Wednesday — AI & LLMs

**Goal:** Learn what AI and LLMs are and connect them to UStud.

### Learn (35 min)
1. Go to [NVIDIA Self-Paced Courses](https://www.nvidia.com/en-us/training/self-paced-courses/)
2. Filter or search for **Free Courses**
3. Enroll in **Generative AI Explained** (~2 hours total — do **the first hour today**)
4. Log in with your NVIDIA Developer account from Day 0

5. Read the **Offline AI tutor** section in [README.md](../../README.md):
   - LLM = Large Language Model (AI that understands and generates text)
   - UStud uses **Ollama** + **SmolLM2** to run the tutor **offline** (no internet needed)

See [05_FREE_LEARNING_RESOURCES.md](05_FREE_LEARNING_RESOURCES.md) for direct links.

### Do (10 min)
In `progress/WEEK1_LOG.md` **Wednesday** section, write 3 bullets:
- What is an LLM?
- What is offline AI?
- Why does UStud use local models instead of cloud-only?

Commit and push.

### Recording focus
Show the NVIDIA course on screen (and your face via OBS). Pause OBS when entering passwords.

### Log fields
- Lesson completed: Generative AI Explained (part 1)
- Takeaway: why offline AI matters for UStud's users

---

## Thursday — Agents & Cursor

**Goal:** Finish AI course content, learn agents, run your first Cursor session workflow.

### Learn (25 min)
1. Finish **Generative AI Explained** OR start **Augment Your LLM Using RAG** on [NVIDIA DLI](https://www.nvidia.com/en-us/training/self-paced-courses/) (RAG = retrieval-augmented generation — how AI uses documents, like UStud's library)

2. **Chatbot vs agent:**
   - **Chatbot** — answers questions in chat only
   - **Agent** — can use tools: read files, edit code, run commands (Cursor Agent mode)

3. Read [cursor/AXIOM_OPERATING_INSTRUCTIONS.md](../AXIOM_OPERATING_INSTRUCTIONS.md) (10 min)

4. Optional: [Cursor Get Started](https://docs.cursor.com/get-started/introduction) (~20 min)

### Do (20 min)
1. `git pull`
2. Open Cursor chat
3. Paste the **Session Start** command from [cursor/SESSION_COMMANDS.md](../SESSION_COMMANDS.md)
4. Ask: *"Explain the folder structure of this repo in simple terms."*
5. Paste the **Session End** command — review what Cursor logged
6. Update **Thursday** in `progress/WEEK1_LOG.md`, commit, push

### Recording focus
Show Session Start → question → Session End workflow.

### Log fields
- Lesson completed: Agents + Cursor session workflow
- Takeaway: one sentence — how is an agent different from a chatbot?

---

## Friday — Run UStud + first real task

**Goal:** Run the app locally and deliver one small improvement.

### Learn (15 min)
1. Skim [docs/PROJECT_BRIEF.md](../../docs/PROJECT_BRIEF.md)
2. Skim [docs/AXIOM_VISION.md](../../docs/AXIOM_VISION.md)

### Do (30 min)
1. `git pull`

2. Install UI dependencies and run the app:

```powershell
cd $HOME\Documents\ustud
npm install
cd boiler
npm install
cd ..
npm run dev:all
```

3. Open in browser: http://localhost:5173 (API at http://127.0.0.1:8765)

4. With Cursor's help, update `progress/CURRENT_STATE.md`:
   - Top 3 gaps vs product vision
   - What works locally
   - What does not work yet

5. Deliver **one small improvement** (pick one):
   - Fix a typo or UI label
   - Improve a doc string or README sentence
   - Small bugfix Cursor helps you make

6. Session End command → update `progress/DAILY_LOG.md` and `CURRENT_STATE.md` → commit → push

### Recording focus
Longer demo is OK today — walk through the running app, progress files, and your improvement.

### Log fields
- Lesson completed: UStud local run + first improvement
- Takeaway: what is the #1 gap you would fix next week?

---

## Week 1 graduation

You graduate when all of these are true:

- [ ] Daily `git push` works without help
- [ ] Trust recordings uploaded Mon–Fri
- [ ] UStud runs locally
- [ ] `progress/CURRENT_STATE.md` has top 3 gaps
- [ ] At least one small improvement merged via push
- [ ] Session Start / Session End workflow completed at least once

**After graduation:** follow [cursor/EMPLOYEE_ONBOARDING.md](../EMPLOYEE_ONBOARDING.md) for ongoing daily work.
