#!/usr/bin/env python3
"""Generate AXIOM-styled employee onboarding Word document."""

from __future__ import annotations

from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "cursor" / "onboarding" / "AXIOM_EMPLOYEE_ONBOARDING.docx"

# AXIOM tokens
BLACK = RGBColor(0x08, 0x08, 0x08)
PANEL_BG = RGBColor(0x0A, 0x0A, 0x0A)
PANEL_BORDER = RGBColor(0x1A, 0x1A, 0x1A)
PANEL_SURFACE = RGBColor(0x11, 0x11, 0x11)
INK_PRIMARY = RGBColor(0xF0, 0xF0, 0xF0)
INK_SECONDARY = RGBColor(0xC4, 0xC4, 0xC4)
INK_MUTED = RGBColor(0x9A, 0x9A, 0x9A)
INK_FAINT = RGBColor(0x6E, 0x6E, 0x6E)
BODY_DARK = RGBColor(0x22, 0x22, 0x22)
BODY_MID = RGBColor(0x44, 0x44, 0x44)
COMMAND_LIVE = RGBColor(0x4A, 0x9E, 0xFF)
COMMAND_STABLE = RGBColor(0x3D, 0xD6, 0x8C)
COMMAND_WATCH = RGBColor(0xE8, 0xA8, 0x38)
PAGE_GRAY = RGBColor(0xEE, 0xEE, 0xEE)

FONT_SANS = "Inter"
FONT_DISPLAY = "Space Grotesk"
FONT_MONO = "Consolas"
FONT_SANS_FALLBACK = "Calibri"
FONT_DISPLAY_FALLBACK = "Arial"


def _set_cell_shading(cell, hex_color: str) -> None:
    shading = OxmlElement("w:shd")
    shading.set(qn("w:fill"), hex_color)
    shading.set(qn("w:val"), "clear")
    cell._tc.get_or_add_tcPr().append(shading)


def add_hyperlink(paragraph, text: str, url: str, hex_color: str = "4A9EFF") -> None:
    part = paragraph.part
    r_id = part.relate_to(
        url,
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
        is_external=True,
    )
    hyperlink = OxmlElement("w:hyperlink")
    hyperlink.set(qn("r:id"), r_id)
    new_run = OxmlElement("w:r")
    r_pr = OxmlElement("w:rPr")
    color_el = OxmlElement("w:color")
    color_el.set(qn("w:val"), hex_color)
    underline = OxmlElement("w:u")
    underline.set(qn("w:val"), "single")
    r_pr.append(color_el)
    r_pr.append(underline)
    new_run.append(r_pr)
    text_el = OxmlElement("w:t")
    text_el.text = text
    new_run.append(text_el)
    hyperlink.append(new_run)
    paragraph._p.append(hyperlink)


def _run_font(run, name: str, size_pt: float, color: RGBColor, bold: bool = False, italic: bool = False) -> None:
    run.font.name = name
    run._element.rPr.rFonts.set(qn("w:ascii"), name)
    run._element.rPr.rFonts.set(qn("w:hAnsi"), name)
    run.font.size = Pt(size_pt)
    run.font.color.rgb = color
    run.font.bold = bold
    run.font.italic = italic


def add_section_label(doc: Document, text: str) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(4)
    run = p.add_run(text.upper())
    _run_font(run, FONT_MONO, 9, INK_MUTED)
    run.font.all_caps = True


def add_display_heading(doc: Document, text: str, level: int = 1) -> None:
    sizes = {1: 22, 2: 16, 3: 13}
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10 if level > 1 else 16)
    p.paragraph_format.space_after = Pt(6)
    run = p.add_run(text)
    font = FONT_DISPLAY
    _run_font(run, font, sizes.get(level, 13), BLACK, bold=True)


def add_body(doc: Document, text: str, space_after: float = 6) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    p.paragraph_format.line_spacing = 1.15
    run = p.add_run(text)
    _run_font(run, FONT_SANS, 10.5, BODY_DARK)


def add_bullet(doc: Document, text: str) -> None:
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.space_after = Pt(3)
    run = p.add_run(text)
    _run_font(run, FONT_SANS, 10.5, BODY_DARK)


def add_link_line(doc: Document, label: str, url: str, note: str = "") -> None:
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(4)
    run = p.add_run(f"{label}: ")
    _run_font(run, FONT_SANS, 10.5, BODY_DARK, bold=True)
    add_hyperlink(p, url, url)
    if note:
        run2 = p.add_run(f"  ({note})")
        _run_font(run2, FONT_SANS, 9.5, INK_MUTED)


def add_code_block(doc: Document, code: str, caption: str = "") -> None:
    if caption:
        cp = doc.add_paragraph()
        cp.paragraph_format.space_before = Pt(8)
        cp.paragraph_format.space_after = Pt(2)
        cr = cp.add_run(caption)
        _run_font(cr, FONT_MONO, 8.5, INK_MUTED)

    table = doc.add_table(rows=1, cols=1)
    table.autofit = False
    cell = table.rows[0].cells[0]
    _set_cell_shading(cell, "0A0A0A")
    cell.width = Inches(6.2)

    tc_pr = cell._tc.get_or_add_tcPr()
    borders = OxmlElement("w:tcBorders")
    for edge in ("top", "left", "bottom", "right"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), "4")
        el.set(qn("w:color"), "1A1A1A")
        borders.append(el)
    tc_pr.append(borders)

    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    run = p.add_run(code.strip())
    _run_font(run, FONT_MONO, 9, INK_PRIMARY)

    spacer = doc.add_paragraph()
    spacer.paragraph_format.space_after = Pt(4)


def add_status_chip(doc: Document, label: str, status: str = "stable") -> None:
    colors = {
        "stable": (COMMAND_STABLE, "STABLE"),
        "live": (COMMAND_LIVE, "LIVE"),
        "watch": (COMMAND_WATCH, "WATCH"),
    }
    color, tag = colors.get(status, colors["stable"])
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(8)
    r1 = p.add_run(f"{tag}  ")
    _run_font(r1, FONT_MONO, 8.5, color, bold=True)
    r2 = p.add_run(label)
    _run_font(r2, FONT_SANS, 10.5, BODY_DARK)


def add_checklist_item(doc: Document, text: str) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.left_indent = Inches(0.2)
    r = p.add_run(f"[ ]  {text}")
    _run_font(r, FONT_SANS, 10.5, BODY_DARK)


def build_document() -> Document:
    doc = Document()
    section = doc.sections[0]
    section.top_margin = Inches(0.75)
    section.bottom_margin = Inches(0.75)
    section.left_margin = Inches(0.9)
    section.right_margin = Inches(0.9)

    # Cover header strip
    header_table = doc.add_table(rows=1, cols=1)
    header_cell = header_table.rows[0].cells[0]
    _set_cell_shading(header_cell, "080808")
    hp = header_cell.paragraphs[0]
    hp.alignment = WD_ALIGN_PARAGRAPH.LEFT
    hr1 = hp.add_run("AXIOM  |  OPERATIONS ONBOARDING\n")
    _run_font(hr1, FONT_MONO, 9, INK_MUTED)
    hr2 = hp.add_run("Employee Zero-to-Hero Guide\n")
    _run_font(hr2, FONT_DISPLAY, 20, INK_PRIMARY, bold=True)
    hr3 = hp.add_run("UStud · Week 1 · GitHub · AI · Automation")
    _run_font(hr3, FONT_SANS, 10, INK_SECONDARY)

    doc.add_paragraph()

    add_status_chip(doc, "Time commitment: ~1 hour per day, Monday through Friday, plus Day 0 laptop setup.", "live")
    add_body(
        doc,
        "This document is your single printable guide. Copy terminal commands from the dark blocks below. "
        "Click hyperlinks to open learning materials. After Week 1, continue daily work using the repo docs on GitHub.",
    )

    add_section_label(doc, "Repository")
    add_link_line(doc, "Team repo", "https://github.com/axiom-forhumanity/ustud")
    add_link_line(doc, "Online onboarding index", "https://github.com/axiom-forhumanity/ustud/blob/main/cursor/onboarding/README.md")

    # --- DAY 0 ---
    add_display_heading(doc, "Day 0 — Laptop Setup", 1)
    add_body(doc, "Complete before Monday. Windows 10 or 11 required. Install in this order:")

    installs = [
        ("Git for Windows", "https://git-scm.com/download/win", "git --version"),
        ("Python 3.10+", "https://www.python.org/downloads/", "python --version  (check Add to PATH)"),
        ("Node.js LTS", "https://nodejs.org/", "node --version && npm --version"),
        ("Cursor", "https://cursor.com/download", "Open app and sign in"),
        ("Ollama", "https://ollama.com/download", "ollama --version"),
        ("OBS Studio", "https://obsproject.com/", "Open once to confirm launch"),
    ]
    for name, url, verify in installs:
        add_link_line(doc, name, url, verify)

    add_section_label(doc, "Accounts")
    add_link_line(doc, "GitHub signup", "https://github.com/signup", "Send username to management")
    add_link_line(doc, "NVIDIA Developer", "https://developer.nvidia.com/login", "For free AI courses Wed–Thu")

    add_body(doc, "Accept the collaborator invite email for axiom-forhumanity/ustud, then verify:")
    add_link_line(doc, "Repo access", "https://github.com/axiom-forhumanity/ustud")

    add_section_label(doc, "Day 0 verification commands")
    add_code_block(
        doc,
        """git --version
python --version
node --version
npm --version
ollama --version""",
        "Copy into PowerShell — each command should print a version number.",
    )

    add_section_label(doc, "Day 0 checklist")
    for item in [
        "Windows updated and restarted",
        "Git, Python, Node.js, Cursor, Ollama, OBS installed",
        "GitHub account created; username sent to management",
        "NVIDIA Developer account created",
        "Collaborator invite accepted for axiom-forhumanity/ustud",
    ]:
        add_checklist_item(doc, item)

    # --- GITHUB ---
    add_display_heading(doc, "GitHub Zero to Hero", 1)
    add_body(doc, "Git tracks file changes. GitHub stores the project online. You clone to your laptop, work locally, then push so management can review.")

    add_display_heading(doc, "Key terms", 2)
    terms = [
        "Repository (repo): project folder plus full history",
        "Clone: download the repo to your laptop",
        "Commit: save a snapshot with a message",
        "Push: upload commits to GitHub",
        "Pull: download latest changes from GitHub",
        "Branch: line of work (we use main)",
    ]
    for t in terms:
        add_bullet(doc, t)

    add_section_label(doc, "One-time git identity")
    add_code_block(
        doc,
        """git config --global user.name "Your Full Name"
git config --global user.email "your.email@example.com" """,
    )

    add_section_label(doc, "Clone the repo (once)")
    add_code_block(
        doc,
        """cd $HOME\\Documents
git clone https://github.com/axiom-forhumanity/ustud.git
cd ustud""",
        "Then in Cursor: File → Open Folder → Documents\\ustud",
    )

    add_section_label(doc, "Daily git loop")
    add_code_block(
        doc,
        """cd $HOME\\Documents\\ustud
git pull
git status
git add .
git commit -m "Week1 Day1: describe what you did"
git push""",
    )

    add_section_label(doc, "Monday — first commit example")
    add_code_block(
        doc,
        """cd $HOME\\Documents\\ustud
git pull
git add .
git commit -m "Week1 Day1: completed GitHub setup and first push"
git push""",
    )

    add_display_heading(doc, "Git troubleshooting", 2)
    add_body(doc, "403 Permission denied: wrong GitHub account logged in.")
    add_code_block(
        doc,
        """gh auth login
cmdkey /delete:LegacyGeneric:target=git:https://github.com""",
        "Install GitHub CLI from https://cli.github.com/ if needed. Log in as the account management invited.",
    )
    add_body(doc, "Push failed (large files): Library PDFs are not in Git. Download locally after clone:")
    add_code_block(doc, "python scripts/download_oer.py")

    # --- TRUST RECORDING ---
    add_display_heading(doc, "Trust Recording — Week 1", 1)
    add_status_chip(doc, "Record screen + webcam every Mon–Fri (~1 hour). Upload same day.", "watch")
    add_body(
        doc,
        "Consent: Week 1 sessions are recorded for training verification, shared with AXIOM management only. "
        "Pause OBS when entering passwords or personal information.",
    )
    add_body(doc, "Upload folder: use the link management sends in your welcome email (MANAGEMENT_UPLOAD_FOLDER_URL).")
    add_body(doc, "File naming: Week1_Day1_YYYY-MM-DD_FirstName.mp4 (Day1=Monday through Day5=Friday).")
    add_body(doc, "Paste the upload link in progress/WEEK1_LOG.md under Trust recording URL, then commit and push:")
    add_code_block(
        doc,
        """cd $HOME\\Documents\\ustud
git add progress/WEEK1_LOG.md
git commit -m "Week1 Day1: trust recording link added"
git push""",
    )

    # --- WEEK 1 BOOTCAMP ---
    add_display_heading(doc, "Week 1 Bootcamp — Daily Plan", 1)
    add_body(doc, "Same rhythm every day: Start OBS → Lesson (45 min) → Upload recording → Update WEEK1_LOG.md → git push.")

    days = [
        (
            "Monday — GitHub + First Push",
            "stable",
            [
                "Learn: GitHub Zero to Hero (this document) + GitHub Hello World",
                "Do: Clone repo, open in Cursor, fill Monday section in progress/WEEK1_LOG.md, push",
            ],
            "https://docs.github.com/en/get-started/start-your-journey/hello-world",
            """cd $HOME\\Documents\\ustud
git pull
git add .
git commit -m "Week1 Day1: GitHub setup and first push"
git push""",
        ),
        (
            "Tuesday — Automation Basics",
            "stable",
            [
                "Learn: Scripts (setup.ps1), scheduled tasks, GitHub Actions (.github/workflows/eod-ceo-brief.yml)",
                "Do: git pull, run setup.ps1, update Tuesday in WEEK1_LOG.md, push",
            ],
            "https://docs.github.com/en/actions/quickstart",
            """cd $HOME\\Documents\\ustud
git pull
.\\setup.ps1""",
        ),
        (
            "Wednesday — AI and LLMs",
            "live",
            [
                "Learn: NVIDIA Generative AI Explained (first hour). Connect to UStud offline tutor (Ollama + SmolLM2)",
                "Do: Answer 3 bullets in WEEK1_LOG.md — What is an LLM? What is offline AI? Why local models?",
            ],
            "https://www.nvidia.com/en-us/training/self-paced-courses/",
            """cd $HOME\\Documents\\ustud
git pull
git add progress/WEEK1_LOG.md
git commit -m "Week1 Day3: AI and LLM learning notes"
git push""",
        ),
        (
            "Thursday — Agents and Cursor",
            "live",
            [
                "Learn: Finish Generative AI Explained or start Augment Your LLM Using RAG. Chatbot vs agent.",
                "Do: Session Start in Cursor, ask about repo structure, Session End, push logs",
            ],
            "https://docs.cursor.com/get-started/introduction",
            None,
        ),
        (
            "Friday — Run UStud + First Task",
            "stable",
            [
                "Learn: Skim docs/PROJECT_BRIEF.md and docs/AXIOM_VISION.md",
                "Do: Run app locally, update CURRENT_STATE.md (top 3 gaps), one small improvement, push",
            ],
            "https://github.com/axiom-forhumanity/ustud/blob/main/docs/PROJECT_BRIEF.md",
            """cd $HOME\\Documents\\ustud
git pull
npm install
cd boiler
npm install
cd ..
npm run dev:all""",
        ),
    ]

    for title, status, tasks, link, code in days:
        add_display_heading(doc, title, 2)
        add_status_chip(doc, f"Primary resource linked below", status)
        add_link_line(doc, "Open", link)
        for t in tasks:
            add_bullet(doc, t)
        if code:
            add_code_block(doc, code, "Copy-paste commands for this day")

    # --- CURSOR SESSION COMMANDS ---
    add_display_heading(doc, "Cursor Session Commands", 1)
    add_body(doc, "Paste these into Cursor chat. Full reference: cursor/SESSION_COMMANDS.md in the repo.")

    add_section_label(doc, "Session start (required every session)")
    add_code_block(
        doc,
        """Read and follow cursor/AXIOM_OPERATING_INSTRUCTIONS.md completely.

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

Do not start coding until you have read these files.""",
    )

    add_section_label(doc, "Session end (required before git push)")
    add_code_block(
        doc,
        """Session ending. Follow cursor/AXIOM_OPERATING_INSTRUCTIONS.md session END workflow.

Update:
- progress/DAILY_LOG.md (append today's entry)
- progress/CURRENT_STATE.md
- progress/BLOCKERS.md (if needed)
- docs/DECISION_LOG.md (if any decisions were made)

Then show me a summary of exactly what you logged so I can review before I commit and push to GitHub.""",
    )

    # --- LEARNING RESOURCES ---
    add_display_heading(doc, "Free Learning Resources", 1)
    resources = [
        ("GitHub Hello World", "https://docs.github.com/en/get-started/start-your-journey/hello-world", "Monday"),
        ("GitHub Actions quickstart", "https://docs.github.com/en/actions/quickstart", "Tuesday"),
        ("NVIDIA DLI self-paced (filter Free Courses)", "https://www.nvidia.com/en-us/training/self-paced-courses/", "Wed–Thu"),
        ("Generative AI Explained (NVIDIA DLI)", "https://www.nvidia.com/en-us/training/self-paced-courses/", "Wednesday"),
        ("Augment Your LLM Using RAG (NVIDIA DLI)", "https://www.nvidia.com/en-us/training/self-paced-courses/", "Thursday optional"),
        ("Cursor Get Started", "https://docs.cursor.com/get-started/introduction", "Thursday"),
        ("Cursor Agent mode", "https://docs.cursor.com/chat/agent", "After Week 1"),
        ("GitHub CLI", "https://cli.github.com/", "If auth issues"),
        ("Git basics book", "https://git-scm.com/book/en/v2/Getting-Started-About-Version-Control", "Anytime"),
    ]
    for name, url, when in resources:
        add_link_line(doc, f"{name} [{when}]", url)

    add_body(doc, "Save NVIDIA course certificates as screenshots in your Week 1 upload folder.")

    # --- GRADUATION ---
    add_display_heading(doc, "Week 1 Graduation", 1)
    add_status_chip(doc, "Complete all items below to begin regular development.", "stable")
    grad = [
        "Daily git pull, commit, and push work without help",
        "Trust recordings uploaded Monday through Friday",
        "UStud runs locally (npm run dev:all or python run.py)",
        "progress/CURRENT_STATE.md lists top 3 product gaps",
        "At least one small improvement pushed to GitHub",
        "Session Start and Session End workflow completed in Cursor",
    ]
    for g in grad:
        add_checklist_item(doc, g)

    add_body(doc, "After graduation: follow cursor/EMPLOYEE_ONBOARDING.md for ongoing daily work.")
    add_body(doc, "Questions: add to progress/BLOCKERS.md and push, or contact management directly.")

    # Footer
    doc.add_paragraph()
    fp = doc.add_paragraph()
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    fr = fp.add_run("AXIOM · Advanced · Intelligent · Practical · Grounded")
    _run_font(fr, FONT_MONO, 8, INK_FAINT)

    return doc


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = build_document()
    doc.save(OUTPUT)
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
