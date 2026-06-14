"""Dynamic module discovery and registration for course plugins."""

import json
from pathlib import Path
from typing import Any

from .curriculum.engine import CurriculumEngine


def load_manifest(module_dir: Path) -> dict | None:
    """Load manifest.json from a module directory."""
    manifest_path = module_dir / "manifest.json"
    if not manifest_path.exists():
        return None
    try:
        return json.loads(manifest_path.read_text(encoding="utf-8"))
    except Exception:
        return None


def discover_modules(*modules_dirs: Path) -> list[dict]:
    """
    Discover all course modules under one or more roots (e.g. library/, modules/).
    Each subfolder with manifest.json + id becomes a module.
    Duplicate ids: first directory wins (earlier in *modules_dirs wins).
    """
    if not modules_dirs:
        return []

    seen_ids: set[str] = set()
    result: list[dict] = []

    for modules_dir in modules_dirs:
        if not modules_dir.exists():
            continue
        for item in modules_dir.iterdir():
            if not item.is_dir():
                continue
            manifest = load_manifest(item)
            if not manifest or not manifest.get("id"):
                continue

            mid = manifest["id"]
            if mid in seen_ids:
                continue
            seen_ids.add(mid)

            curriculum_path = item / "curriculum.yaml"
            curriculum = CurriculumEngine(curriculum_path) if curriculum_path.exists() else None

            result.append({
                "id": mid,
                "name": manifest.get("name", mid),
                "path": item,
                "manifest": manifest,
                "curriculum": curriculum,
                "content_packs": manifest.get("content_packs", []),
            })
    return result


def get_module(module_id: str, *modules_dirs: Path) -> dict | None:
    """Get a specific module by id (searches dirs in order)."""
    for mod in discover_modules(*modules_dirs):
        if mod["id"] == module_id:
            return mod
    return None
