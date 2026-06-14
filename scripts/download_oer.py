#!/usr/bin/env python3
"""
Download curated OER PDFs into UStud's Library folder (OpenStax, Project Gutenberg).

Only allows HTTPS URLs on trusted hosts (openstax.org, gutenberg.org).
Uses stdlib only — no pip install required.

Usage (from project root):
  python scripts/download_oer.py
  python scripts/download_oer.py --manifest scripts/custom_manifest.json
  python scripts/download_oer.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import ssl
import sys
import urllib.error
import urllib.request
from pathlib import Path


# Initial request URL must be on these domains (redirects may follow to CDN, e.g. assets.openstax.org).
def _is_allowed_url(url: str) -> bool:
    from urllib.parse import urlparse

    p = urlparse(url)
    if p.scheme != "https":
        return False
    host = (p.hostname or "").lower()
    return host.endswith("openstax.org") or host.endswith("gutenberg.org")


USER_AGENT = "UStud-OER-Downloader/1.0 (+local; educational use)"


def _project_root() -> Path:
    return Path(__file__).resolve().parent.parent


def _download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, context=ctx, timeout=120) as resp:
        data = resp.read()
    tmp = dest.with_suffix(dest.suffix + ".part")
    tmp.write_bytes(data)
    tmp.replace(dest)


def main() -> int:
    parser = argparse.ArgumentParser(description="Download OER PDFs into Library/")
    parser.add_argument(
        "--manifest",
        type=Path,
        default=_project_root() / "scripts" / "oer_manifest.json",
        help="JSON manifest with { items: [ { url, path }, ... ] }",
    )
    parser.add_argument("--dry-run", action="store_true", help="Print actions only")
    args = parser.parse_args()

    root = _project_root()
    library = root / "Library"
    if not library.is_dir():
        library.mkdir(parents=True, exist_ok=True)

    raw = json.loads(args.manifest.read_text(encoding="utf-8"))
    items = raw.get("items") or []
    if not items:
        print("No items in manifest.", file=sys.stderr)
        return 1

    ok = 0
    for i, item in enumerate(items):
        if isinstance(item, dict) and "$comment" in item and len(item) == 1:
            continue
        url = (item.get("url") or "").strip()
        rel = (item.get("path") or "").strip()
        if not url or not rel:
            print(f"Skip #{i}: missing url or path", file=sys.stderr)
            continue
        if not _is_allowed_url(url):
            print(f"Skip (host not allowed): {url}", file=sys.stderr)
            continue
        dest = library / rel
        lic = item.get("license", "")
        if args.dry_run:
            print(f"Would download -> {dest}\n  {url}\n  {lic}")
            ok += 1
            continue
        if dest.exists() and dest.stat().st_size > 10_000:
            print(f"Exists, skip: {dest.name}")
            ok += 1
            continue
        try:
            print(f"Downloading {dest.name} …")
            _download(url, dest)
            print(f"  saved {dest} ({dest.stat().st_size // 1024} KB)")
            ok += 1
        except urllib.error.HTTPError as e:
            print(f"  HTTP {e.code} for {url}", file=sys.stderr)
        except Exception as e:
            print(f"  Error: {e}", file=sys.stderr)

    print(f"\nDone. {ok}/{len(items)} processed.")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
