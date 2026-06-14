#!/usr/bin/env python3
"""Generate AXIOM-styled employee onboarding Word document."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from docx import Document
from docx.shared import Inches

from onboarding_document_body import populate_document

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "cursor" / "onboarding" / "AXIOM_EMPLOYEE_ONBOARDING.docx"


def build_document() -> Document:
    doc = Document()
    section = doc.sections[0]
    section.top_margin = Inches(0.85)
    section.bottom_margin = Inches(0.85)
    section.left_margin = Inches(1.0)
    section.right_margin = Inches(1.0)
    populate_document(doc)
    return doc


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = build_document()
    doc.save(OUTPUT)
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
