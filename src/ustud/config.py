"""Configuration and paths for UStud."""

import os
from pathlib import Path

# Base paths - use app data on Windows, ~/.ustud elsewhere
if os.name == "nt":
    BASE_DIR = Path(os.environ.get("APPDATA", Path.home())) / "UStud"
else:
    BASE_DIR = Path.home() / ".ustud"

BASE_DIR.mkdir(parents=True, exist_ok=True)

# Content paths
CONTENT_DIR = BASE_DIR / "content"
CONTENT_DIR.mkdir(exist_ok=True)

# Full Wikipedia *.zim files live here (Simple English and Wiktionary names are skipped). Largest file is tried first.
# Force one file: set env USTUD_ZIM_PATH=C:\path\to\file.zim
ZIM_DIR = CONTENT_DIR / "zim"
ZIM_DIR.mkdir(exist_ok=True)

# Full Kiwix UI (skins): either set USTUD_KIWIX_SERVE_URL to an existing server (e.g. http://127.0.0.1:8080)
# or leave it unset and enable auto-start (default) when `kiwix-serve` is on PATH.
KIWIX_SERVE_URL = (os.environ.get("USTUD_KIWIX_SERVE_URL") or "").strip().rstrip("/")
KIWIX_AUTO_SERVE = os.environ.get("USTUD_KIWIX_AUTO_SERVE", "1").strip().lower() not in (
    "0",
    "false",
    "no",
    "off",
)
KIWIX_SERVE_PORT_MIN = int(os.environ.get("USTUD_KIWIX_PORT_MIN", "18080"))
KIWIX_SERVE_PORT_MAX = int(os.environ.get("USTUD_KIWIX_PORT_MAX", "18120"))

PACKS_DIR = CONTENT_DIR / "packs"
PACKS_DIR.mkdir(exist_ok=True)

# Database
DB_PATH = BASE_DIR / "ustud.db"

# Models cache (for translation)
MODELS_DIR = BASE_DIR / "models"
MODELS_DIR.mkdir(exist_ok=True)

# Default LLM model - gemma3:4b is more capable; smollm2:135m for low RAM
DEFAULT_LLM_MODEL = os.environ.get("USTUD_LLM_MODEL", "gemma3:4b")
