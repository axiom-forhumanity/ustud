#!/usr/bin/env python3
"""
Build standalone executable for Windows (offline deployment).
Requires: pip install pyinstaller
Run: python build_standalone.py
"""

import subprocess
import sys
from pathlib import Path

def main():
    try:
        import PyInstaller
    except ImportError:
        print("Installing PyInstaller...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])
    
    root = Path(__file__).parent
    ui_dir = root / "ui"
    
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--name", "UStud",
        "--onefile",  # Single executable
        "--add-data", f"{ui_dir};ui",  # Bundle UI (semicolon for Windows)
        "--hidden-import", "uvicorn.logging",
        "--hidden-import", "uvicorn.loops",
        "--hidden-import", "uvicorn.loops.auto",
        "--hidden-import", "uvicorn.protocols",
        "--hidden-import", "uvicorn.protocols.http",
        "--hidden-import", "uvicorn.protocols.http.auto",
        "--hidden-import", "uvicorn.protocols.websockets",
        "--hidden-import", "uvicorn.protocols.websockets.auto",
        "--collect-all", "ustud",
        str(root / "run.py"),
    ]
    
    # Platform-specific add-data separator
    if sys.platform != "win32":
        cmd = [c.replace(";", ":") if c.startswith("--add-data") else c for c in cmd]
    
    subprocess.check_call(cmd)
    print("Build complete. Executable in dist/UStud")

if __name__ == "__main__":
    main()
