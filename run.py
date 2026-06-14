#!/usr/bin/env python3
"""Run UStud - Offline AI Learning Platform."""

import sys
from pathlib import Path

# Ensure src is on path for ustud package
root = Path(__file__).parent
sys.path.insert(0, str(root / "src"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "ustud.main:app",
        host="127.0.0.1",
        port=8765,
        reload=False,
    )
