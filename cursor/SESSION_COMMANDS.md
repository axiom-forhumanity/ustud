# AXIOM Session Commands

Copy and paste these commands into Cursor chat at the start and end of every work session.

---

## Session Start (required at beginning of every session)

```
Read and follow cursor/AXIOM_OPERATING_INSTRUCTIONS.md completely.

Also read:
- docs/PROJECT_BRIEF.md
- progress/CURRENT_STATE.md
- progress/BLOCKERS.md
- the latest entry in progress/DAILY_LOG.md

Confirm you understand the progress logging requirements.

Then tell me:
1. Current project state
2. Open blockers
3. What I should focus on today

Do not start coding until you have read these files.
```

---

## Session End (required before git push)

```
Session ending. Follow cursor/AXIOM_OPERATING_INSTRUCTIONS.md session END workflow.

Update:
- progress/DAILY_LOG.md (append today's entry)
- progress/CURRENT_STATE.md
- progress/BLOCKERS.md (if needed)
- docs/DECISION_LOG.md (if any decisions were made)

Then show me a summary of exactly what you logged so I can review before I commit and push to GitHub.
```

---

## Progress Checkpoint (optional, mid-session)

```
Progress checkpoint. Append a brief update to today's section in progress/DAILY_LOG.md covering what we've done so far this session. Do not remove earlier content.
```

---

## Management Question (when you need CEO input)

```
I have a question for management. Add it to progress/BLOCKERS.md using the required format. Draft the entry and show me before saving.
```
