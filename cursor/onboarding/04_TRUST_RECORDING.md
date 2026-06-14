# Trust Recording — Week 1

During Week 1 (Monday–Friday), record your screen and webcam for each ~1-hour session. Upload the file the same day. This creates a transparent training record for management.

**Upload folder:** Management will send you `MANAGEMENT_UPLOAD_FOLDER_URL` in your welcome email. Use that folder only.

---

## Consent

By participating in Week 1 onboarding, you agree to record your work sessions (screen + webcam) during Week 1 only, for training verification. Recordings are shared with AXIOM management only. Do not record passwords — pause recording when entering credentials.

---

## Tool: OBS Studio (free)

Installed on Day 0. Download again if needed: https://obsproject.com/

---

## One-time OBS setup

1. Open **OBS Studio**
2. **Scenes** (bottom left) → if empty, click **+** → name it `Week1`
3. **Sources** → **+** → **Display Capture** → OK → select your main monitor
4. **Sources** → **+** → **Video Capture Device** → OK → select your webcam
5. Drag the webcam box to a corner; resize it small (picture-in-picture)
6. **Settings → Output**:
   - Recording format: **mp4**
   - If available, set resolution to **1280x720** (smaller files, faster upload)
7. **Settings → Video** → Base and Output resolution: 1280x720 if your laptop struggles with 1080p
8. Test: click **Start Recording** → wait 30 seconds → **Stop Recording**
9. **File → Show Recordings** — confirm video plays with screen + face visible

---

## Daily recording rules

| Rule | Detail |
|------|--------|
| **When** | Start OBS **before** you begin each day's lesson (Mon–Fri) |
| **Length** | Record the full session (~1 hour, or full time if shorter) |
| **Pause** | Pause or stop when typing passwords, API keys, or personal info |
| **Naming** | `Week1_Day1_YYYY-MM-DD_FirstName.mp4` (Day1=Mon … Day5=Fri) |
| **Upload** | Same day, to management's folder |
| **Log** | Paste the file link in `progress/WEEK1_LOG.md` under **Trust recording URL** |

### Day number reference

| Day | Filename example |
|-----|------------------|
| Monday | `Week1_Day1_2026-06-16_Amina.mp4` |
| Tuesday | `Week1_Day2_2026-06-17_Amina.mp4` |
| Wednesday | `Week1_Day3_2026-06-18_Amina.mp4` |
| Thursday | `Week1_Day4_2026-06-19_Amina.mp4` |
| Friday | `Week1_Day5_2026-06-20_Amina.mp4` |

---

## Upload steps (Google Drive example)

1. Open the folder link management sent you
2. Click **New → File upload**
3. Select your MP4
4. Wait for upload to finish (slow internet is OK — start upload right after recording)
5. Right-click file → **Share** or **Get link** (if management asked for link sharing)
6. Copy link into `progress/WEEK1_LOG.md`
7. Commit and push the log update:

```powershell
cd $HOME\Documents\ustud
git add progress/WEEK1_LOG.md
git commit -m "Week1 Day1: trust recording link added"
git push
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| No webcam in OBS | Settings → Video Capture Device → pick correct camera |
| File too large | Lower resolution to 720p; keep sessions ~1 hour |
| Upload fails | Retry; if still failing, note in BLOCKERS.md and email management |
| Forgot to record | Note in WEEK1_LOG.md; re-do that day's hands-on portion on camera if management asks |

---

## After Week 1

Daily screen+webcam recording is **not** required after graduation unless management asks. Continue daily Git push and progress logs per [EMPLOYEE_ONBOARDING.md](../EMPLOYEE_ONBOARDING.md).
