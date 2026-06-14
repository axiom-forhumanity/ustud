# Course library

## Loose PDFs (`Library/` at project root)

You can drop **PDFs (and epubs)** in:

`UStud/Library/` (capital **L** is fine on Windows)

### Staging bulk drops (`Library/Books/Ustud Resources/`)

If you add many PDFs under `Library/Books/Ustud Resources/` (optionally in subfolders like `Biology/`, `Business/Accounting/`, …), run:

```bash
python scripts/organize_ustud_library_books.py
```

That moves files into `Library/<subject>/…` using `ustud_manifest.json` when the filename matches, or using the folder layout otherwise. It updates `Library/ustud_manifest.json` and `ustud_manifest.csv` with `library_rel_path` for each file (useful for RAG pipelines). Re-run anytime; duplicate staging copies are removed when the same file already exists in `Library/`.

They show up in the app under the **“Library”** subject. Anything under a `…/content/…` path is treated as part of a YAML course pack and is listed only under that course, not duplicated here.

## Course plugins (YAML)

Put your **course plugins** here (folder per course). Each course is a **folder** with:

- `manifest.json` — `id`, `name`, optional `content_packs`, etc.
- `curriculum.yaml` — units and lessons
- `content/` (optional) — pack folders matching `content_packs` in the manifest (e.g. `content/math_basics/lesson_id.md`). **PDFs** anywhere under `content/` (nested folders OK) appear in the app **Library** under that course and open in the viewer.

UStud loads **`library/` first**, then **`modules/`** if that folder exists. If two courses use the same `id`, the one under `library/` wins.

Copy an existing course from `../modules/<name>/` as a template, or see `modules/core_curriculum/` for a full example.

## Free textbooks & classics (OpenStax, Gutenberg)

To pull **legally free** PDFs into `Library/oer/…` (math, science, English — public domain / CC-licensed):

```bash
# From the UStud project root (requires Python 3)
python scripts/download_oer.py
```

- Manifest: `scripts/oer_manifest.json` (official **openstax.org** and **gutenberg.org** HTTPS links only).
- The script **refuses** other hosts.
- Re-run is safe: existing large files are skipped.
- Add your own entries to a copy of the manifest, then:  
  `python scripts/download_oer.py --manifest path/to/your_manifest.json`

**More titles:** browse [OpenStax](https://openstax.org/subjects) and [Project Gutenberg](https://www.gutenberg.org/) and paste **official** PDF URLs into your manifest (same trusted hosts only).

> **Note:** Recent copyrighted school novels (e.g. *1984*) are **not** on Gutenberg; use your library or a licensed store for those.
