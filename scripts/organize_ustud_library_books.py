#!/usr/bin/env python3
"""
Move PDFs from Library/Books/Ustud Resources/ (and optional .../books/...) into
Library/<subject>/... using ustud_manifest.json. Creates subject folders as needed.

Re-run is safe: skips when destination exists with same size.

Also writes Library/ustud_manifest.json (and updates CSV) with library_rel_path for RAG.
"""

from __future__ import annotations

import csv
import json
import shutil
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
LIBRARY_ROOT = PROJECT_ROOT / "Library"
STAGING_NAMES = ("Ustud Resources", "Ustad Resources")

# First folder under .../books/<this>/file.pdf -> top-level subject (when not in manifest)
FOLDER_TO_SUBJECT: dict[str, str] = {
    "biology": "Biology",
    "business": "Business",
    "chemistry": "Chemistry",
    "computer science": "Computer Science",
    "computerscience": "Computer Science",
    "cs": "Computer Science",
    "economics": "Economics",
    "engineering": "Engineering",
    "history": "History",
    "mathematics": "Mathematics",
    "math": "Mathematics",
    "philosophy": "Philosophy",
    "physics": "Physics",
    "psychology": "Psychology",
    "sociology": "Sociology",
    "statistics": "Statistics",
    "english": "English",
    "literature": "Literature",
}


def _find_staging_root() -> Path | None:
    base = LIBRARY_ROOT / "Books"
    if not base.is_dir():
        return None
    for name in STAGING_NAMES:
        p = base / name
        if p.is_dir():
            return p
    return None


def _subject_path_parts(subject: str) -> tuple[str, ...]:
    s = subject.strip().strip("/").replace("\\", "/")
    return tuple(p for p in s.split("/") if p)


def _infer_subject_from_relpath(rel: Path) -> str:
    """Derive subject path from staging layout (multi-level dirs preserved)."""
    parts = rel.parts
    if not parts:
        return "Uncategorized"
    dir_parts = list(parts[:-1])
    if not dir_parts:
        return "Uncategorized"
    if dir_parts[0].lower() == "books":
        dir_parts = dir_parts[1:]
    if not dir_parts:
        return "Uncategorized"
    if len(dir_parts) == 1:
        key = dir_parts[0].lower().replace("_", " ").strip()
        return FOLDER_TO_SUBJECT.get(key, dir_parts[0].replace("_", " ").title())
    # e.g. Business/International Business/file.pdf -> Business/International Business
    return "/".join(seg.replace("_", " ").title() for seg in dir_parts)


def _load_manifest(path: Path) -> dict:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def _save_manifest_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def _sync_manifest_with_disk(data: dict) -> None:
    """Ensure every PDF under Library/ (except …/content/…) has a manifest row + library_rel_path."""
    books: list[dict] = list(data.get("books") or [])
    by_filename: dict[str, dict] = {}
    for b in books:
        fn = b.get("filename")
        if isinstance(fn, str):
            by_filename[fn] = b

    for pdf in sorted(LIBRARY_ROOT.rglob("*.pdf"), key=lambda p: str(p).lower()):
        try:
            rel = pdf.relative_to(LIBRARY_ROOT)
        except ValueError:
            continue
        if "content" in rel.parts:
            continue
        fn = pdf.name
        subj_disk = "/".join(rel.parts[:-1]) if len(rel.parts) > 1 else "Uncategorized"
        if fn not in by_filename:
            stem = fn.removesuffix(".pdf").replace("_", " ")
            by_filename[fn] = {
                "filename": fn,
                "title": stem.title(),
                "subject": subj_disk,
                "publisher": "",
                "year": "",
                "license": "",
                "size_mb": round(pdf.stat().st_size / (1024 * 1024), 1),
                "format": "PDF",
                "source": "Local library",
                "ingestion_status": "pending",
            }
        by_filename[fn]["library_rel_path"] = rel.as_posix()

    merged = sorted(by_filename.values(), key=lambda b: (b.get("subject", ""), b.get("filename", "")))
    data["books"] = merged
    data["total_books"] = len(merged)


def _write_csv(path: Path, books: list[dict]) -> None:
    if not books:
        return
    keys = list(books[0].keys())
    with path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=keys, extrasaction="ignore")
        w.writeheader()
        for row in books:
            w.writerow({k: row.get(k, "") for k in keys})


def main() -> int:
    staging = _find_staging_root()
    if not staging:
        print("No staging folder found (expected Library/Books/Ustud Resources or Ustad Resources).")
        return 1

    manifest_staging = staging / "ustud_manifest.json"
    if not manifest_staging.is_file():
        print(f"Missing manifest: {manifest_staging}")
        return 1

    data = _load_manifest(manifest_staging)
    books: list[dict] = data.get("books") or []
    by_filename: dict[str, dict] = {}
    for b in books:
        fn = b.get("filename")
        if isinstance(fn, str):
            by_filename[fn] = b

    # All PDFs under staging (including books/biology/...)
    pdfs = sorted(staging.rglob("*.pdf"), key=lambda p: str(p).lower())
    if not pdfs:
        print(f"No PDFs under {staging} — syncing manifest from Library/ only.")
        data["books"] = books
        _sync_manifest_with_disk(data)
        if staging.is_dir():
            data["staging_root"] = str(staging.relative_to(PROJECT_ROOT))
        _save_manifest_json(manifest_staging, data)
        _save_manifest_json(LIBRARY_ROOT / "ustud_manifest.json", data)
        _write_csv(staging / "ustud_manifest.csv", data["books"])
        _write_csv(LIBRARY_ROOT / "ustud_manifest.csv", data["books"])
        print(f"Manifest updated: {LIBRARY_ROOT / 'ustud_manifest.json'}")
        return 0

    LIBRARY_ROOT.mkdir(parents=True, exist_ok=True)
    moves: list[tuple[Path, Path, str]] = []

    for src in pdfs:
        try:
            rel = src.relative_to(staging)
        except ValueError:
            continue
        # Skip anything already not under staging root
        fname = src.name
        book = by_filename.get(fname)
        if book and book.get("subject"):
            subj = str(book["subject"])
        else:
            subj = _infer_subject_from_relpath(rel)

        parts = _subject_path_parts(subj)
        if not parts:
            parts = ("Uncategorized",)
        dest_dir = LIBRARY_ROOT.joinpath(*parts)
        dest = dest_dir / fname

        if dest.resolve() == src.resolve():
            continue
        if dest.is_file():
            if dest.stat().st_size == src.stat().st_size:
                print(f"Skip (already there): {dest.relative_to(PROJECT_ROOT)}")
                rel_lib = dest.relative_to(LIBRARY_ROOT).as_posix()
                if book is not None:
                    book["library_rel_path"] = rel_lib
                try:
                    src.unlink()
                except OSError:
                    pass
                continue
            print(f"Conflict different size, skipping: {fname} -> {dest}")
            continue

        dest_dir.mkdir(parents=True, exist_ok=True)
        print(f"Move: {src.relative_to(PROJECT_ROOT)} -> {dest.relative_to(PROJECT_ROOT)}")
        shutil.move(str(src), str(dest))
        rel_lib = dest.relative_to(LIBRARY_ROOT).as_posix()
        if book is not None:
            book["library_rel_path"] = rel_lib
        moves.append((src, dest, rel_lib))

    # Fill library_rel_path for manifest entries whose files were already in place
    for b in books:
        fn = b.get("filename")
        if not isinstance(fn, str):
            continue
        if b.get("library_rel_path"):
            continue
        found = None
        for p in LIBRARY_ROOT.rglob(fn):
            if p.is_file() and "content" not in p.relative_to(LIBRARY_ROOT).parts:
                found = p
                break
        if found:
            b["library_rel_path"] = found.relative_to(LIBRARY_ROOT).as_posix()

    data["books"] = books
    _sync_manifest_with_disk(data)
    data["staging_root"] = str(staging.relative_to(PROJECT_ROOT))
    _save_manifest_json(manifest_staging, data)
    root_manifest = LIBRARY_ROOT / "ustud_manifest.json"
    _save_manifest_json(root_manifest, data)
    csv_staging = staging / "ustud_manifest.csv"
    csv_root = LIBRARY_ROOT / "ustud_manifest.csv"
    _write_csv(csv_staging, data["books"])
    _write_csv(csv_root, data["books"])

    # Prune empty dirs under staging (deepest first)
    for d in sorted(staging.rglob("*"), key=lambda p: len(p.parts), reverse=True):
        if d.is_dir():
            try:
                d.rmdir()
            except OSError:
                pass

    print(f"Done. {len(moves)} file(s) moved. Manifest: {root_manifest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
