# Management Pre-Boarding Checklist

Complete these steps **before** the employee opens their laptop on Day 0.

---

## 1. GitHub collaborator access

1. Go to https://github.com/axiom-forhumanity/ustud
2. **Settings → Collaborators → Add people**
3. Enter the employee's GitHub username
4. Grant **Write** access
5. Confirm they accept the email invitation before Monday

---

## 2. Trust recording upload folder

1. Create a **private** folder (Google Drive, Dropbox, or similar)
2. Create a subfolder: `FirstName_LastName/Week1/`
3. Share **upload-only** or **edit** access with the employee
4. Save the folder URL — you will send it in the welcome email

Replace `MANAGEMENT_UPLOAD_FOLDER_URL` in [04_TRUST_RECORDING.md](04_TRUST_RECORDING.md) with the real link before sending onboarding docs, or include the link only in the welcome email.

---

## 3. Repository visibility (recommended)

The repo may be public. For employee work, consider:

**Settings → General → Danger Zone → Change repository visibility → Private**

---

## 4. EOD brief (optional)

If you want AI-generated daily summaries during Week 1, configure secrets per [docs/EOD_BRIEF_SETUP.md](../../docs/EOD_BRIEF_SETUP.md).

---

## 5. Send welcome email

Attach or link **[AXIOM_EMPLOYEE_ONBOARDING.docx](AXIOM_EMPLOYEE_ONBOARDING.docx)** (printable guide with hyperlinks and terminal commands).

Copy, fill in the bracketed fields, and send:

```
Subject: AXIOM / UStud — Your Week 1 onboarding

Hi [First Name],

Welcome to AXIOM. Your laptop is ready to set up.

START HERE (read in order):
1. Download the Word guide: https://github.com/axiom-forhumanity/ustud/raw/main/cursor/onboarding/AXIOM_EMPLOYEE_ONBOARDING.docx
2. Day 0 setup: https://github.com/axiom-forhumanity/ustud/blob/main/cursor/onboarding/01_DAY0_LAPTOP_SETUP.md
3. Full onboarding index: https://github.com/axiom-forhumanity/ustud/blob/main/cursor/onboarding/README.md

Before Monday:
- Complete Day 0 (install software, create GitHub + NVIDIA accounts)
- Accept the GitHub collaborator invite on axiom-forhumanity/ustud

Week 1 schedule:
- Monday–Friday, ~1 hour per day
- Record your screen + webcam each day (instructions in the repo)
- Upload recordings here: [MANAGEMENT_UPLOAD_FOLDER_URL]

Your GitHub repo: https://github.com/axiom-forhumanity/ustud

Blockers or questions: reply to this email or add to progress/BLOCKERS.md in the repo.

Expected start: [Monday, DATE]

— [Your name]
```

---

## 6. Verify before Monday

- [ ] Employee accepted GitHub collaborator invite
- [ ] Employee received welcome email with upload folder link
- [ ] Employee knows your contact for blockers
- [ ] Onboarding docs are on `main` at axiom-forhumanity/ustud
