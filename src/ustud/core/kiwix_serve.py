"""Optional local kiwix-serve process so the Library Wikipedia tab uses Kiwix’s real viewer (skins)."""

from __future__ import annotations

import logging
import os
import shutil
import socket
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

logger = logging.getLogger(__name__)

_proc: subprocess.Popen | None = None
_auto_base_url: str | None = None


def _find_kiwix_serve() -> str | None:
    """PATH, then %APPDATA%/UStud/kiwix-tools (and one subfolder, as shipped in the official zip)."""
    from ustud.config import BASE_DIR

    root = Path(BASE_DIR) / "kiwix-tools"
    search_dirs = [root]
    if root.is_dir():
        search_dirs.extend(p for p in root.iterdir() if p.is_dir())
    for d in search_dirs:
        for name in ("kiwix-serve.exe", "kiwix-serve"):
            cand = d / name
            if cand.is_file():
                return str(cand.resolve())
    for name in ("kiwix-serve", "kiwix-serve.exe"):
        p = shutil.which(name)
        if p:
            return p
    return None


def _find_free_port(start: int, end: int) -> int:
    for port in range(start, end):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    raise RuntimeError("No free TCP port for kiwix-serve in range")


def stop_kiwix_serve() -> None:
    global _proc, _auto_base_url
    if _proc is None:
        _auto_base_url = None
        return
    try:
        _proc.terminate()
        try:
            _proc.wait(timeout=6)
        except subprocess.TimeoutExpired:
            _proc.kill()
    except Exception as e:
        logger.warning("kiwix-serve shutdown: %s", e)
    finally:
        _proc = None
        _auto_base_url = None


def try_start_kiwix_serve(get_retriever_fn) -> None:
    """
    If USTUD_KIWIX_SERVE_URL is unset and auto is on, spawn kiwix-serve for the same .zim UStud opens.
    """
    global _proc, _auto_base_url
    from ustud.config import KIWIX_AUTO_SERVE, KIWIX_SERVE_PORT_MAX, KIWIX_SERVE_PORT_MIN, KIWIX_SERVE_URL

    if KIWIX_SERVE_URL:
        return
    if not KIWIX_AUTO_SERVE:
        return
    if _proc is not None and _proc.poll() is None:
        return

    r = get_retriever_fn()
    archive = r._get_archive()
    if not archive:
        logger.info("Kiwix auto-serve skipped: no ZIM archive loaded.")
        return
    zim_path: Path | None = getattr(r, "_opened_path", None)
    if not zim_path or not zim_path.is_file():
        return

    exe = _find_kiwix_serve()
    if not exe:
        logger.warning(
            "Kiwix viewer auto-start skipped: kiwix-serve not on PATH. "
            "Install kiwix-tools (https://download.kiwix.org/release/kiwix-tools/) "
            "or set USTUD_KIWIX_SERVE_URL to a running server."
        )
        return

    port = _find_free_port(KIWIX_SERVE_PORT_MIN, KIWIX_SERVE_PORT_MAX)
    cmd = [exe, "-i", "127.0.0.1", "-p", str(port), str(zim_path.resolve())]
    try:
        popen_kw: dict = {"stdout": subprocess.DEVNULL, "stderr": subprocess.PIPE}
        if os.name == "nt":
            cf = getattr(subprocess, "CREATE_NO_WINDOW", 0)
            if cf:
                popen_kw["creationflags"] = cf
        _proc = subprocess.Popen(cmd, **popen_kw)
    except Exception as e:
        logger.warning("Could not start kiwix-serve: %s", e)
        return

    base = f"http://127.0.0.1:{port}"
    deadline = time.time() + 25
    while time.time() < deadline:
        if _proc.poll() is not None:
            err = b""
            if _proc.stderr:
                try:
                    err = _proc.stderr.read(4000)
                except Exception:
                    pass
            logger.warning(
                "kiwix-serve exited early: %s",
                err.decode("utf-8", errors="replace")[:800],
            )
            _proc = None
            return
        try:
            urllib.request.urlopen(base + "/", timeout=0.6).read(32)
            _auto_base_url = base
            logger.info("kiwix-serve ready at %s (%s)", base, zim_path.name)
            return
        except (urllib.error.URLError, OSError):
            time.sleep(0.25)

    logger.warning("kiwix-serve did not respond in time; try USTUD_KIWIX_SERVE_URL or check the ZIM file.")
    stop_kiwix_serve()


def get_effective_kiwix_base_url() -> str | None:
    from ustud.config import KIWIX_SERVE_URL

    if KIWIX_SERVE_URL:
        return KIWIX_SERVE_URL
    return _auto_base_url


def kiwix_started_by_ustud() -> bool:
    return _proc is not None and _proc.poll() is None
