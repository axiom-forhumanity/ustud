#!/usr/bin/env python3
"""Generate AXIOM-styled employee onboarding Word document (beginner-friendly)."""

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
INK_PRIMARY = RGBColor(0xF0, 0xF0, 0xF0)
INK_SECONDARY = RGBColor(0xC4, 0xC4, 0xC4)
INK_MUTED = RGBColor(0x9A, 0x9A, 0x9A)
INK_FAINT = RGBColor(0x6E, 0x6E, 0x6E)
BODY_DARK = RGBColor(0x22, 0x22, 0x22)
BODY_MID = RGBColor(0x55, 0x55, 0x55)
COMMAND_LIVE = RGBColor(0x4A, 0x9E, 0xFF)
COMMAND_STABLE = RGBColor(0x3D, 0xD6, 0x8C)
COMMAND_WATCH = RGBColor(0xE8, 0xA8, 0x38)

FONT_SANS = "Calibri"
FONT_DISPLAY = "Arial"
FONT_MONO = "Consolas"


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


def add_spacer(doc: Document, pts: float = 12) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(pts)


def add_section_label(doc: Document, text: str) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(20)
    p.paragraph_format.space_after = Pt(6)
    run = p.add_run(text.upper())
    _run_font(run, FONT_MONO, 9, INK_MUTED)
    run.font.all_caps = True


def add_part_heading(doc: Document, part_num: int, title: str, subtitle: str = "") -> None:
    add_spacer(doc, 8)
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run(f"PART {part_num}")
    _run_font(r, FONT_MONO, 10, COMMAND_LIVE, bold=True)
    add_spacer(doc, 4)
    hp = doc.add_paragraph()
    hp.paragraph_format.space_after = Pt(6)
    hr = hp.add_run(title)
    _run_font(hr, FONT_DISPLAY, 20, BLACK, bold=True)
    if subtitle:
        sp = doc.add_paragraph()
        sp.paragraph_format.space_after = Pt(14)
        sr = sp.add_run(subtitle)
        _run_font(sr, FONT_SANS, 11, BODY_MID)


def add_display_heading(doc: Document, text: str, level: int = 2) -> None:
    sizes = {2: 14, 3: 12}
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(16)
    p.paragraph_format.space_after = Pt(8)
    run = p.add_run(text)
    _run_font(run, FONT_DISPLAY, sizes.get(level, 12), BLACK, bold=True)


def add_body(doc: Document, text: str, space_after: float = 10) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    p.paragraph_format.line_spacing = 1.25
    run = p.add_run(text)
    _run_font(run, FONT_SANS, 11, BODY_DARK)


def add_numbered_step(
    doc: Document,
    number: int,
    title: str,
    instructions: list[str],
    command: str | None = None,
    success: str | None = None,
) -> None:
    """One clear step: title, plain instructions, optional single command, optional success check."""
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(6)
    r = p.add_run(f"Step {number}. {title}")
    _run_font(r, FONT_SANS, 11.5, BLACK, bold=True)

    for line in instructions:
        bp = doc.add_paragraph()
        bp.paragraph_format.space_after = Pt(4)
        bp.paragraph_format.left_indent = Inches(0.25)
        bp.paragraph_format.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
        bp.paragraph_format.line_spacing = 1.25
        br = bp.add_run(line)
        _run_font(br, FONT_SANS, 11, BODY_DARK)

    if command:
        cp = doc.add_paragraph()
        cp.paragraph_format.space_before = Pt(6)
        cp.paragraph_format.space_after = Pt(2)
        cp.paragraph_format.left_indent = Inches(0.25)
        cr = cp.add_run("Copy this line, paste into PowerShell, press Enter:")
        _run_font(cr, FONT_SANS, 10, INK_MUTED, italic=True)
        add_code_block(doc, command, indent=True)

    if success:
        sp = doc.add_paragraph()
        sp.paragraph_format.space_before = Pt(4)
        sp.paragraph_format.space_after = Pt(10)
        sp.paragraph_format.left_indent = Inches(0.25)
        sr1 = sp.add_run("You should see: ")
        _run_font(sr1, FONT_SANS, 10.5, COMMAND_STABLE, bold=True)
        sr2 = sp.add_run(success)
        _run_font(sr2, FONT_SANS, 10.5, BODY_DARK)


def add_callout(doc: Document, label: str, text: str, kind: str = "tip") -> None:
    colors = {"tip": "E8F4FF", "watch": "FFF8E8", "stable": "E8F8EF"}
    fill = colors.get(kind, colors["tip"])
    table = doc.add_table(rows=1, cols=1)
    cell = table.rows[0].cells[0]
    _set_cell_shading(cell, fill)
    tc_pr = cell._tc.get_or_add_tcPr()
    borders = OxmlElement("w:tcBorders")
    for edge in ("top", "left", "bottom", "right"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), "4")
        el.set(qn("w:color"), "CCCCCC")
        borders.append(el)
    tc_pr.append(borders)
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(8)
    r1 = p.add_run(f"{label.upper()}  ")
    color = COMMAND_WATCH if kind == "watch" else COMMAND_LIVE if kind == "tip" else COMMAND_STABLE
    _run_font(r1, FONT_MONO, 8.5, color, bold=True)
    r2 = p.add_run(text)
    _run_font(r2, FONT_SANS, 10.5, BODY_DARK)
    add_spacer(doc, 8)


def add_code_block(doc: Document, code: str, indent: bool = False) -> None:
    table = doc.add_table(rows=1, cols=1)
    cell = table.rows[0].cells[0]
    _set_cell_shading(cell, "0A0A0A")
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
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(8)
    run = p.add_run(code.strip())
    _run_font(run, FONT_MONO, 10, INK_PRIMARY)
    spacer = doc.add_paragraph()
    spacer.paragraph_format.space_after = Pt(6)
    if indent:
        spacer.paragraph_format.left_indent = Inches(0.25)


def add_link_line(doc: Document, label: str, url: str, when: str = "") -> None:
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.left_indent = Inches(0.15)
    run = p.add_run(f"• {label}")
    _run_font(run, FONT_SANS, 11, BODY_DARK, bold=True)
    if when:
        run2 = p.add_run(f"  ({when})  ")
        _run_font(run2, FONT_SANS, 10, INK_MUTED)
    add_hyperlink(p, url, url)


def add_checklist_item(doc: Document, text: str) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.left_indent = Inches(0.2)
    r = p.add_run(f"[ ]  {text}")
    _run_font(r, FONT_SANS, 11, BODY_DARK)


def add_toc_item(doc: Document, part: str, title: str) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(5)
    r1 = p.add_run(f"{part}  ")
    _run_font(r1, FONT_MONO, 10, COMMAND_LIVE, bold=True)
    r2 = p.add_run(title)
    _run_font(r2, FONT_SANS, 11, BODY_DARK)


def build_document() -> Document:
    doc = Document()
    section = doc.sections[0]
    section.top_margin = Inches(0.85)
    section.bottom_margin = Inches(0.85)
    section.left_margin = Inches(1.0)
    section.right_margin = Inches(1.0)

    # Cover
    header_table = doc.add_table(rows=1, cols=1)
    header_cell = header_table.rows[0].cells[0]
    _set_cell_shading(header_cell, "080808")
    hp = header_cell.paragraphs[0]
    hr1 = hp.add_run("AXIOM  |  EMPLOYEE ONBOARDING\n")
    _run_font(hr1, FONT_MONO, 9, INK_MUTED)
    hr2 = hp.add_run("Your First Week — Step by Step\n")
    _run_font(hr2, FONT_DISPLAY, 22, INK_PRIMARY, bold=True)
    hr3 = hp.add_run("No experience needed. Follow each step in order.")
    _run_font(hr3, FONT_SANS, 11, INK_SECONDARY)

    add_spacer(doc, 16)
    add_body(
        doc,
        "Welcome. This guide assumes you have never used GitHub, the terminal, or coding tools before. "
        "That is OK. Every step tells you exactly what to click, what to copy, and what you should see on screen.",
        space_after=14,
    )

    add_callout(
        doc,
        "How long",
        "Day 0 (when your laptop arrives): 2 to 3 hours to install everything. "
        "Monday to Friday: about 1 hour per day for lessons and practice.",
        "tip",
    )

    # --- PART 0: READ FIRST ---
    add_part_heading(
        doc,
        0,
        "Read This Before Anything Else",
        "Five things to understand before Day 0.",
    )

    add_display_heading(doc, "What is PowerShell?", 3)
    add_body(
        doc,
        "PowerShell is a black or blue window where you type commands instead of clicking. "
        "We use it to talk to GitHub and run the project. You will copy commands from this document and paste them there.",
    )
    add_numbered_step(
        doc,
        1,
        "Open PowerShell",
        [
            "Click the Windows Start button (bottom left).",
            "Type: PowerShell",
            "Click Windows PowerShell (not PowerShell ISE).",
        ],
        success="A window opens with text like PS C:\\Users\\YourName>",
    )

    add_display_heading(doc, "How to copy and paste a command", 3)
    add_numbered_step(
        doc,
        1,
        "Copy from this document",
        ["Select the text inside the dark box.", "Press Ctrl+C on your keyboard."],
    )
    add_numbered_step(
        doc,
        2,
        "Paste into PowerShell",
        [
            "Click inside the PowerShell window.",
            "Right-click to paste (or press Ctrl+V).",
            "Press Enter on your keyboard.",
        ],
        success="The command runs. New text appears. If you see red error text, read the step again or see Part 8 (Help).",
    )

    add_callout(
        doc,
        "Important",
        "Run one command at a time unless this guide shows several lines in one box labeled run all. "
        "Wait for each command to finish before running the next.",
        "watch",
    )

    add_display_heading(doc, "What you need from management", 3)
    add_checklist_item(doc, "An email invite to join the GitHub repo axiom-forhumanity/ustud (accept before Monday)")
    add_checklist_item(doc, "A link to upload your daily screen recordings (Google Drive or similar)")
    add_checklist_item(doc, "A contact email if you get stuck")

    add_display_heading(doc, "Table of contents", 3)
    add_toc_item(doc, "Part 1", "Day 0 — Install software on your laptop")
    add_toc_item(doc, "Part 2", "Day 0 — Create your online accounts")
    add_toc_item(doc, "Part 3", "Simple words — what is GitHub?")
    add_toc_item(doc, "Part 4", "Monday — Download the project and your first push")
    add_toc_item(doc, "Part 5", "Tuesday to Friday — one section per day")
    add_toc_item(doc, "Part 6", "How to record your screen (trust sessions)")
    add_toc_item(doc, "Part 7", "Cursor — what to paste at start and end of work")
    add_toc_item(doc, "Part 8", "When something goes wrong")
    add_toc_item(doc, "Part 9", "Free learning links")
    add_toc_item(doc, "Part 10", "Week 1 complete — graduation checklist")

    # --- PART 1: DAY 0 INSTALLS ---
    add_part_heading(
        doc,
        1,
        "Day 0 — Install Software",
        "Do this when your laptop arrives, before Monday. Your laptop must be Windows 10 or 11.",
    )

    add_callout(doc, "Order matters", "Install programs in the order below. After each install, run the check command if one is shown.", "tip")

    installs = [
        (
            "Install Git",
            "Git is the tool that saves and sends your work to GitHub.",
            "https://git-scm.com/download/win",
            [
                "Open the download link. Download runs automatically.",
                "Run the installer. Click Next on every screen (defaults are fine).",
                "When finished, open PowerShell.",
            ],
            "git --version",
            "git version 2.x.x (any number is fine)",
        ),
        (
            "Install Python",
            "Python runs the backend of the UStud app.",
            "https://www.python.org/downloads/",
            [
                "Open the download link. Click the yellow Download button.",
                "Run the installer.",
                "On the FIRST screen, check the box: Add python.exe to PATH. This is important.",
                "Click Install Now. Wait until it finishes.",
            ],
            "python --version",
            "Python 3.10 or higher",
        ),
        (
            "Install Node.js",
            "Node.js runs the user interface of the app.",
            "https://nodejs.org/",
            [
                "Open the download link.",
                "Download the LTS version (recommended).",
                "Run the installer. Click Next through all screens.",
            ],
            "node --version",
            "A version number like v20.x.x",
        ),
        (
            "Install Cursor",
            "Cursor is where you write code and talk to the AI assistant.",
            "https://cursor.com/download",
            [
                "Open the download link. Download and install.",
                "Open Cursor from the Start menu.",
                "Create a free account or sign in when asked.",
            ],
            None,
            "Cursor opens and you are signed in",
        ),
        (
            "Install Ollama",
            "Ollama runs the offline AI tutor on your laptop.",
            "https://ollama.com/download",
            [
                "Open the download link. Download for Windows.",
                "Run the installer (admin permission may be required).",
            ],
            "ollama --version",
            "A version number",
        ),
        (
            "Install OBS Studio",
            "OBS records your screen and webcam during Week 1.",
            "https://obsproject.com/",
            [
                "Open the download link. Download and install.",
                "Open OBS once to confirm it launches.",
                "Full OBS setup is in Part 6.",
            ],
            None,
            "OBS opens without crashing",
        ),
    ]

    step_num = 1
    for title, why, url, click_steps, verify_cmd, verify_ok in installs:
        add_display_heading(doc, title, 2)
        add_body(doc, why)
        lp = doc.add_paragraph()
        lp.paragraph_format.space_after = Pt(6)
        lr = lp.add_run("Download link: ")
        _run_font(lr, FONT_SANS, 11, BODY_DARK, bold=True)
        add_hyperlink(lp, url, url)
        for click in click_steps:
            add_numbered_step(doc, step_num, click, [])
            step_num += 1
        if verify_cmd:
            add_numbered_step(
                doc,
                step_num,
                "Check that it worked",
                ["Open PowerShell. Paste and run:"],
                command=verify_cmd,
                success=verify_ok,
            )
            step_num += 1
        add_spacer(doc, 10)

    # --- PART 2: ACCOUNTS ---
    add_part_heading(doc, 2, "Day 0 — Create Online Accounts", "Two free accounts. Do this after installing software.")

    add_display_heading(doc, "Create a GitHub account", 2)
    add_body(doc, "GitHub is the website where the team project lives. Management needs your username to give you access.")
    add_numbered_step(doc, 1, "Go to the signup page", [], command=None)
    lp = doc.add_paragraph()
    add_hyperlink(lp, "https://github.com/signup", "https://github.com/signup")
    add_numbered_step(
        doc,
        2,
        "Create your account",
        [
            "Pick a username (write it down).",
            "Use your real email. Verify your email when GitHub sends a message.",
            "Email your username to management so they can add you to the project.",
        ],
    )
    add_numbered_step(
        doc,
        3,
        "Accept the team invite",
        [
            "Check your email for an invitation to axiom-forhumanity/ustud.",
            "Click Accept invitation.",
            "Open this link in your browser to confirm you see the project:",
        ],
    )
    lp2 = doc.add_paragraph()
    add_hyperlink(lp2, "https://github.com/axiom-forhumanity/ustud", "https://github.com/axiom-forhumanity/ustud")
    add_body(doc, "You should see files and folders, not a 404 error page.", space_after=14)

    add_display_heading(doc, "Create an NVIDIA account (for free AI courses)", 2)
    add_body(doc, "You will use this on Wednesday and Thursday for free training videos.")
    lp3 = doc.add_paragraph()
    add_hyperlink(lp3, "https://developer.nvidia.com/login", "https://developer.nvidia.com/login")
    add_numbered_step(doc, 1, "Sign up for a free account", ["Follow the website steps. Verify your email if asked."])

    # --- PART 3: GITHUB EXPLAINED ---
    add_part_heading(doc, 3, "Simple Words — What Is GitHub?", "Read this on Monday before you download the project.")

    add_body(
        doc,
        "Think of the project like a shared folder in the cloud. Your laptop has a copy. "
        "When you save work, you send it back to the cloud so management can see it.",
        space_after=12,
    )

    terms = [
        ("Repository (repo)", "The whole project: all files and all history of changes."),
        ("Clone", "Download the project from GitHub to your laptop (you do this once)."),
        ("Pull", "Get the newest changes from GitHub before you start working each day."),
        ("Commit", "Save a snapshot of your changes on your laptop with a short note."),
        ("Push", "Send your saved snapshots up to GitHub so the team can see them."),
    ]
    for word, meaning in terms:
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(8)
        r1 = p.add_run(f"{word}: ")
        _run_font(r1, FONT_SANS, 11, BLACK, bold=True)
        r2 = p.add_run(meaning)
        _run_font(r2, FONT_SANS, 11, BODY_DARK)

    add_callout(
        doc,
        "Daily habit",
        "Every work day: pull first (get updates), do your work, then commit and push (send your work up).",
        "stable",
    )

    add_display_heading(doc, "Tell Git your name (one time only)", 2)
    add_body(doc, "Replace the name and email with yours. Run these two lines in PowerShell:")
    add_code_block(doc, 'git config --global user.name "Your Full Name"')
    add_code_block(doc, 'git config --global user.email "your.email@example.com"')

    # --- PART 4: MONDAY ---
    add_part_heading(
        doc,
        4,
        "Monday — Download the Project",
        "About 1 hour. Start OBS recording first (see Part 6).",
    )

    add_callout(doc, "Before you start", "Start OBS recording (screen + webcam). Pause OBS if you type a password.", "watch")

    monday_steps = [
        (
            "Open PowerShell",
            ["Use the Start menu. Search PowerShell. Open it."],
            None,
            "Window is open",
        ),
        (
            "Go to your Documents folder",
            ["This is where the project will live."],
            "cd $HOME\\Documents",
            "The prompt may change to show Documents",
        ),
        (
            "Download the project from GitHub (clone)",
            ["This may take 1 to 2 minutes. Wait until it finishes."],
            "git clone https://github.com/axiom-forhumanity/ustud.git",
            "Text like Cloning into ustud... then it stops with no red errors",
        ),
        (
            "Enter the project folder",
            ["All future commands assume you are inside this folder."],
            "cd ustud",
            "Prompt shows ...\\Documents\\ustud",
        ),
        (
            "Open the project in Cursor",
            [
                "Open Cursor.",
                "Click File, then Open Folder.",
                "Go to Documents, then ustud, then click Select Folder.",
            ],
            None,
            "You see files on the left side: README.md, cursor, docs, etc.",
        ),
        (
            "Open your Week 1 log file",
            [
                "In Cursor's left file list, open: progress, then WEEK1_LOG.md",
                "Fill in the Monday section: what you learned, link to your recording (after upload), one sentence takeaway.",
                "Save the file (Ctrl+S).",
            ],
            None,
            "Monday section has your notes",
        ),
        (
            "Send your changes to GitHub — step A: get latest",
            ["Always pull before you push."],
            "git pull",
            "Already up to date or a success message",
        ),
        (
            "Send your changes — step B: stage files",
            ["This tells Git which files you changed."],
            "git add .",
            "No output is normal",
        ),
        (
            "Send your changes — step C: save with a message",
            ["The message describes what you did today."],
            'git commit -m "Week1 Day1: completed GitHub setup and first push"',
            "A line like 1 file changed",
        ),
        (
            "Send your changes — step D: upload to GitHub",
            ["This sends your work to the team repo."],
            "git push",
            "Progress lines ending without red errors",
        ),
    ]

    for i, (title, instr, cmd, ok) in enumerate(monday_steps, 1):
        add_numbered_step(doc, i, title, instr, command=cmd, success=ok)

    add_body(doc, "Optional reading (30 min): GitHub Hello World tutorial — good for beginners.")
    lp = doc.add_paragraph()
    add_hyperlink(lp, "https://docs.github.com/en/get-started/start-your-journey/hello-world", "https://docs.github.com/en/get-started/start-your-journey/hello-world")

    # --- PART 5: TUE-FRI ---
    add_part_heading(doc, 5, "Tuesday to Friday — Daily Plan", "Same order every day: OBS on, lesson, upload video, update log, git push.")

    add_callout(
        doc,
        "Every day starts the same",
        "1. Start OBS.  2. Open PowerShell.  3. cd $HOME\\Documents\\ustud  4. git pull",
        "stable",
    )

    # Tuesday
    add_display_heading(doc, "Tuesday — Automation", 2)
    add_body(doc, "Automation means the computer does steps for you. Example: setup.ps1 installs packages automatically instead of you clicking many times.")
    add_numbered_step(doc, 1, "Pull latest code", ["In PowerShell, from the ustud folder:"], "git pull", "Success message")
    add_numbered_step(
        doc,
        2,
        "Run the setup script",
        ["Still in the ustud folder. This installs Python packages and downloads the AI model. May take several minutes."],
        ".\\setup.ps1",
        "Green success messages. If Ollama is missing, note it in progress/BLOCKERS.md",
    )
    add_numbered_step(
        doc,
        3,
        "Update and push your log",
        ["Edit progress/WEEK1_LOG.md (Tuesday section). Then run git add ., commit, push (same as Monday steps 7–10)."],
    )
    add_body(doc, "Optional reading: GitHub Actions quickstart (20 min).")
    lp = doc.add_paragraph()
    add_hyperlink(lp, "https://docs.github.com/en/actions/quickstart", "https://docs.github.com/en/actions/quickstart")

    # Wednesday
    add_display_heading(doc, "Wednesday — AI and LLMs", 2)
    add_body(doc, "An LLM (Large Language Model) is AI that reads and writes text. UStud uses a local LLM so students can learn without internet.")
    add_numbered_step(doc, 1, "Open NVIDIA free courses", ["Sign in with your NVIDIA account from Part 2."])
    lp = doc.add_paragraph()
    add_hyperlink(lp, "https://www.nvidia.com/en-us/training/self-paced-courses/", "https://www.nvidia.com/en-us/training/self-paced-courses/")
    add_numbered_step(
        doc,
        2,
        "Enroll in Generative AI Explained",
        ["Use the Free Courses filter.", "Do the first hour today. Finish on Thursday if needed."],
    )
    add_numbered_step(
        doc,
        3,
        "Write three short answers in WEEK1_LOG.md (Wednesday section)",
        [
            "What is an LLM? (your own words)",
            "What is offline AI?",
            "Why does UStud use local models?",
            "Then git add ., commit, push.",
        ],
    )

    # Thursday
    add_display_heading(doc, "Thursday — Agents and Cursor", 2)
    add_body(doc, "A chatbot only talks. An agent can also read files, edit code, and run commands. Cursor in Agent mode is an agent.")
    add_numbered_step(doc, 1, "Continue NVIDIA course or start Augment Your LLM Using RAG", ["Same NVIDIA link as Wednesday."])
    add_numbered_step(
        doc,
        2,
        "Start a Cursor session",
        [
            "Open Cursor with the ustud folder.",
            "Open the Chat panel.",
            "Copy the entire Session Start block from Part 7 below and paste into chat. Press Enter.",
            "Wait for Cursor to respond.",
        ],
    )
    add_numbered_step(
        doc,
        3,
        "Ask Cursor a question",
        ["Type or paste: Explain the folder structure of this repo in simple terms."],
    )
    add_numbered_step(
        doc,
        4,
        "End the session",
        ["Copy the Session End block from Part 7. Paste into chat.", "Review what Cursor wrote in the progress files.", "git add ., commit, push."],
    )
    add_body(doc, "Optional: Cursor Get Started docs.")
    lp = doc.add_paragraph()
    add_hyperlink(lp, "https://docs.cursor.com/get-started/introduction", "https://docs.cursor.com/get-started/introduction")

    # Friday
    add_display_heading(doc, "Friday — Run the App", 2)
    add_body(doc, "Today you run UStud on your laptop and make one small improvement.")
    add_numbered_step(doc, 1, "Pull latest", [], "git pull", "Success")
    add_numbered_step(doc, 2, "Install dependencies (first time only)", ["Run each line, wait for each to finish:"], "npm install", "Completes without errors")
    add_numbered_step(doc, 3, "Install UI dependencies", [], "cd boiler", "Folder changes")
    add_numbered_step(doc, 4, "Continue UI install", [], "npm install", "Completes")
    add_numbered_step(doc, 5, "Go back to project root", [], "cd ..", "Back in ustud folder")
    add_numbered_step(
        doc,
        6,
        "Start the app",
        ["Leave this window open while the app runs."],
        "npm run dev:all",
        "Messages about API and UI starting",
    )
    add_numbered_step(
        doc,
        7,
        "Open the app in your browser",
        ["Open Chrome or Edge.", "Go to: http://localhost:5173", "You should see the UStud interface."],
        None,
        "App loads in the browser",
    )
    add_numbered_step(
        doc,
        8,
        "Document and improve",
        [
            "With Cursor, update progress/CURRENT_STATE.md: top 3 gaps, what works, what does not.",
            "Make one small fix (typo, label, tiny bug).",
            "Session End from Part 7, then git add ., commit, push.",
        ],
    )

    # --- PART 6: OBS ---
    add_part_heading(doc, 6, "How to Record Your Screen (Trust Sessions)", "Monday through Friday, about 1 hour each day.")

    add_body(
        doc,
        "Management will send you a folder link for uploads. Record your screen and your face. "
        "Upload the same day. Pause OBS when typing passwords.",
        space_after=12,
    )

    obs_steps = [
        ("Open OBS Studio", ["From the Start menu."], None),
        ("Create a scene", ["Bottom left: click + under Scenes.", "Name it Week1.", "Press Enter."], None),
        ("Add your screen", ["Under Sources, click +.", "Choose Display Capture, click OK.", "Select your monitor, click OK."], None),
        ("Add your webcam", ["Under Sources, click + again.", "Choose Video Capture Device, click OK.", "Select your camera.", "Drag the webcam box to a corner. Make it small."], None),
        ("Set video quality (optional)", ["File menu, Settings, Video.", "If uploads are slow, set Base and Output to 1280x720."], None),
        ("Test recording", ["Click Start Recording.", "Wait 30 seconds.", "Click Stop Recording.", "File, Show Recordings, play the file."], "You see your screen and your face"),
        ("Each work day", ["Click Start Recording before you begin.", "Work for about 1 hour.", "Click Stop Recording.", "Name file: Week1_Day1_YYYY-MM-DD_YourName.mp4 (Day1=Mon, Day5=Fri)."], None),
        ("Upload", ["Open the folder link from management.", "Upload the MP4.", "Copy the file link into progress/WEEK1_LOG.md under Trust recording URL.", "git add ., commit, push."], None),
    ]
    for i, (title, instr, ok) in enumerate(obs_steps, 1):
        add_numbered_step(doc, i, title, instr, success=ok)

    # --- PART 7: CURSOR COMMANDS ---
    add_part_heading(doc, 7, "Cursor — Copy and Paste Blocks", "Use these every work session after Week 1 too.")

    add_display_heading(doc, "Session Start — paste at the beginning", 2)
    add_body(doc, "Copy everything in the box below into Cursor chat:")
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

    add_display_heading(doc, "Session End — paste before git push", 2)
    add_body(doc, "Copy everything in the box below into Cursor chat:")
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

    # --- PART 8: TROUBLESHOOTING ---
    add_part_heading(doc, 8, "When Something Goes Wrong", "Common problems and fixes.")

    add_display_heading(doc, "Push failed: Permission denied (403)", 2)
    add_body(doc, "You are logged into the wrong GitHub account.")
    add_numbered_step(doc, 1, "Install GitHub CLI", ["Download from:"])
    lp = doc.add_paragraph()
    add_hyperlink(lp, "https://cli.github.com/", "https://cli.github.com/")
    add_numbered_step(doc, 2, "Log in with YOUR account", [], "gh auth login", "Follow browser steps. Log in as the account management invited.")
    add_numbered_step(
        doc,
        3,
        "Clear old password (if still failing)",
        [],
        "cmdkey /delete:LegacyGeneric:target=git:https://github.com",
        "Credential deleted successfully",
    )
    add_numbered_step(doc, 4, "Try git push again", [], "git push", "Upload succeeds")

    add_display_heading(doc, "Git asks who you are", 2)
    add_body(doc, "Run the name and email commands from Part 3 again.")

    add_display_heading(doc, "Push failed: remote hung up", 2)
    add_body(doc, "Large files may cause this. Textbooks are not in Git. Download them separately:")
    add_code_block(doc, "python scripts/download_oer.py")
    add_body(doc, "If it still fails, write in progress/BLOCKERS.md and email management.")

    add_display_heading(doc, "Something else is broken", 2)
    add_body(doc, "1. Write what happened in progress/BLOCKERS.md.  2. git push.  3. Email management.")

    # --- PART 9: LINKS ---
    add_part_heading(doc, 9, "Free Learning Links", "Click to open. Save NVIDIA certificates as screenshots if you earn them.")

    links = [
        ("Team project on GitHub", "https://github.com/axiom-forhumanity/ustud", "Always"),
        ("GitHub Hello World", "https://docs.github.com/en/get-started/start-your-journey/hello-world", "Monday"),
        ("GitHub Actions intro", "https://docs.github.com/en/actions/quickstart", "Tuesday"),
        ("NVIDIA free courses", "https://www.nvidia.com/en-us/training/self-paced-courses/", "Wed–Thu"),
        ("Cursor introduction", "https://docs.cursor.com/get-started/introduction", "Thursday"),
        ("Git basics book", "https://git-scm.com/book/en/v2/Getting-Started-About-Version-Control", "Anytime"),
    ]
    for label, url, when in links:
        add_link_line(doc, label, url, when)

    # --- PART 10: GRADUATION ---
    add_part_heading(doc, 10, "Week 1 Complete — Graduation Checklist", "When every box is checked, you are ready for regular work.")

    for item in [
        "I can open PowerShell and run git pull, git add ., git commit, git push without help",
        "I uploaded screen recordings every day Monday through Friday",
        "UStud opens in my browser at http://localhost:5173",
        "progress/CURRENT_STATE.md lists the top 3 product gaps",
        "I pushed at least one small improvement to GitHub",
        "I used Session Start and Session End in Cursor",
    ]:
        add_checklist_item(doc, item)

    add_spacer(doc, 12)
    add_body(doc, "After graduation, your daily guide is cursor/EMPLOYEE_ONBOARDING.md in the repo.")
    add_body(doc, "Questions: progress/BLOCKERS.md or email management.")

    fp = doc.add_paragraph()
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    fp.paragraph_format.space_before = Pt(24)
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
