"""API route handlers."""

import html
import json
import logging
import mimetypes
import random
import re
from pathlib import Path

import urllib.parse

import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse, Response

logger = logging.getLogger(__name__)
from pydantic import BaseModel

KIWIX_FRAME_PREFIX = "/api/zim/kiwix-frame"


def _rewrite_kiwix_absolute_to_proxy(content: bytes, content_type: str | None, kiwix_base: str | None) -> bytes:
    """Point Kiwix HTML at our same-origin proxy so the parent page can read iframe.location (snippet sync)."""
    if not kiwix_base or not content_type:
        return content
    ct = content_type.split(";")[0].strip().lower()
    if ct != "text/html":
        return content
    base = kiwix_base.rstrip("/")
    try:
        text = content.decode("utf-8", errors="replace")
    except Exception:
        return content
    text = text.replace(base + "/", f"{KIWIX_FRAME_PREFIX}/")
    text = text.replace(base, KIWIX_FRAME_PREFIX)
    return text.encode("utf-8")

from ustud.config import BASE_DIR, DB_PATH, ZIM_DIR
from ustud.core.kiwix_serve import get_effective_kiwix_base_url, kiwix_started_by_ustud
from ustud.core.rag import ZIMRetriever, chunk_text
from ustud.core.snippet_preprocess import preprocess_chat_context
from ustud.core.llm import OllamaClient
from ustud.core.interpreter import Translator
from ustud.core.plugin_loader import discover_modules, get_module
from ustud.core.curriculum import CurriculumEngine
from ustud import db

# Paths - next to project root (api/routes.py -> src/ustud/api/)
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
# Course plugins live under library/ or Library/ (Windows-friendly); same folder may hold loose PDFs too.
_LIBRARY_DIR = PROJECT_ROOT / "library"
_LIBRARY_DIR_ALT = PROJECT_ROOT / "Library"
_LEGACY_MODULES_DIR = PROJECT_ROOT / "modules"

# Loose PDFs / epubs under the project Library folder (not inside .../content/... course packs)
FLAT_LIBRARY_MODULE_ID = "_ustud_flat_library"


# File types shown in Library (under each module's content/ folder)
_LIBRARY_FILE_EXTENSIONS = frozenset({".pdf", ".epub"})

# Cache: mtime -> rel_path -> book row from Library/ustud_manifest.json
_ustud_manifest_mtime: float | None = None
_ustud_manifest_by_relpath: dict[str, dict] | None = None


def _get_ustud_manifest_by_library_relpath() -> dict[str, dict]:
    """Map posix library_rel_path -> manifest book dict; reload when manifest mtime changes."""
    global _ustud_manifest_mtime, _ustud_manifest_by_relpath
    path = _LIBRARY_DIR_ALT / "ustud_manifest.json"
    if not path.is_file():
        path = _LIBRARY_DIR / "ustud_manifest.json"
    if not path.is_file():
        _ustud_manifest_mtime = None
        _ustud_manifest_by_relpath = {}
        return _ustud_manifest_by_relpath
    try:
        mtime = path.stat().st_mtime
    except OSError:
        return {}
    if _ustud_manifest_mtime == mtime and _ustud_manifest_by_relpath is not None:
        return _ustud_manifest_by_relpath
    try:
        with path.open(encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError):
        _ustud_manifest_mtime = mtime
        _ustud_manifest_by_relpath = {}
        return _ustud_manifest_by_relpath
    by_path: dict[str, dict] = {}
    for b in data.get("books") or []:
        lp = b.get("library_rel_path")
        if isinstance(lp, str) and lp.strip():
            by_path[lp.strip().replace("\\", "/")] = b
    _ustud_manifest_mtime = mtime
    _ustud_manifest_by_relpath = by_path
    return by_path


def _pdf_page_count(file_path: Path) -> int | None:
    if file_path.suffix.lower() != ".pdf":
        return None
    try:
        from pypdf import PdfReader

        reader = PdfReader(str(file_path), strict=False)
        n = len(reader.pages)
        return n if n > 0 else None
    except Exception:
        return None


def _enrich_file_entry(entry: dict, abs_path: Path, manifest_row: dict | None) -> None:
    """Mutate entry with manifest + PDF page count (flat library or module content)."""
    if manifest_row:
        t = manifest_row.get("title")
        if isinstance(t, str) and t.strip():
            entry["display_title"] = t.strip()
        pub = manifest_row.get("publisher")
        if isinstance(pub, str) and pub.strip():
            entry["publisher"] = pub.strip()
            entry["author"] = pub.strip()
        ro = manifest_row.get("read_order")
        if isinstance(ro, int):
            entry["read_order"] = ro
        elif isinstance(ro, float) and ro == int(ro):
            entry["read_order"] = int(ro)
        mpc = manifest_row.get("page_count")
        if isinstance(mpc, int) and mpc > 0:
            entry["page_count"] = mpc
    if entry.get("file_type") == "pdf" and "page_count" not in entry:
        pc = _pdf_page_count(abs_path)
        if pc is not None:
            entry["page_count"] = pc


def _course_library_roots() -> list[Path]:
    """Directories used for YAML courses (library + Library, if present)."""
    roots = []
    for p in (_LIBRARY_DIR, _LIBRARY_DIR_ALT):
        if p.exists() and p.is_dir() and p.resolve() not in {r.resolve() for r in roots}:
            roots.append(p.resolve())
    return roots


def get_course_library_root() -> Path | None:
    """Single folder where users drop PDFs: prefer Library, then library."""
    for p in (_LIBRARY_DIR_ALT, _LIBRARY_DIR):
        if p.exists() and p.is_dir():
            return p.resolve()
    return None


def _list_flat_library_files(library_root: Path) -> list[dict]:
    """
    PDFs under the user Library folder, excluding .../content/... (those belong to course modules).
    Enriched with ustud_manifest.json (display_title, author/publisher, read_order) and PDF page_count.
    """
    library_root = library_root.resolve()
    manifest = _get_ustud_manifest_by_library_relpath()
    out: list[dict] = []
    for f in library_root.rglob("*"):
        if not f.is_file():
            continue
        if f.suffix.lower() not in _LIBRARY_FILE_EXTENSIONS:
            continue
        rel = f.relative_to(library_root)
        if any(p.startswith(".") for p in rel.parts):
            continue
        if "content" in rel.parts:
            continue
        ext = f.suffix.lower()
        ftype = "pdf" if ext == ".pdf" else "book"
        rel_posix = rel.as_posix()
        entry: dict = {
            "rel_path": rel_posix,
            "title": f.stem.replace("_", " ").title(),
            "file_type": ftype,
        }
        _enrich_file_entry(entry, f, manifest.get(rel_posix))
        out.append(entry)
    return sorted(out, key=lambda x: (x.get("read_order", 10_000), x["rel_path"]))


def _resolve_flat_library_file(library_root: Path, rel_path: str) -> Path | None:
    library_root = library_root.resolve()
    parts = [p for p in rel_path.replace("\\", "/").split("/") if p and p != "."]
    if not parts or any(p == ".." for p in parts):
        return None
    target = library_root.joinpath(*parts).resolve()
    try:
        target.relative_to(library_root)
    except ValueError:
        return None
    if not target.is_file():
        return None
    if target.suffix.lower() not in _LIBRARY_FILE_EXTENSIONS:
        return None
    if "content" in target.relative_to(library_root).parts:
        return None
    return target


def resolve_module(module_id: str) -> dict | None:
    """Course module or synthetic flat Library (loose PDFs)."""
    if module_id == FLAT_LIBRARY_MODULE_ID:
        root = get_course_library_root()
        if root and _list_flat_library_files(root):
            return {
                "id": FLAT_LIBRARY_MODULE_ID,
                "name": "Library",
                "path": root,
                "manifest": {},
                "curriculum": None,
                "content_packs": [],
                "flat_library": True,
            }
        return None
    return get_module(module_id, *course_content_dirs())


def _list_module_content_files(module_path: Path) -> list[dict]:
    """PDFs (and epub) under module_path/content/, for Library listing."""
    content = module_path / "content"
    if not content.is_dir():
        return []
    out: list[dict] = []
    for f in content.rglob("*"):
        if not f.is_file():
            continue
        if f.suffix.lower() not in _LIBRARY_FILE_EXTENSIONS:
            continue
        rel = f.relative_to(content)
        if any(p.startswith(".") for p in rel.parts):
            continue
        ext = f.suffix.lower()
        ftype = "pdf" if ext == ".pdf" else "book"
        rel_posix = rel.as_posix()
        entry = {
            "rel_path": rel_posix,
            "title": f.stem.replace("_", " ").title(),
            "file_type": ftype,
        }
        _enrich_file_entry(entry, f.resolve(), None)
        out.append(entry)
    return sorted(out, key=lambda x: (x.get("read_order", 10_000), x["rel_path"]))


def _resolve_module_content_file(mod: dict, rel_path: str) -> Path | None:
    """Safe resolve: rel_path must stay inside module content/."""
    content = (mod["path"] / "content").resolve()
    if not content.is_dir():
        return None
    parts = [p for p in rel_path.replace("\\", "/").split("/") if p and p != "."]
    if not parts or any(p == ".." for p in parts):
        return None
    target = (content.joinpath(*parts)).resolve()
    try:
        target.relative_to(content)
    except ValueError:
        return None
    if not target.is_file():
        return None
    if target.suffix.lower() not in _LIBRARY_FILE_EXTENSIONS:
        return None
    return target


def course_content_dirs() -> tuple[Path, ...]:
    """
    Roots that hold course plugins (each subfolder = one course with manifest.json).
    Both `library/` and `Library/` are scanned (same path on typical Windows setups).
    `modules/` remains for backward compatibility.
    """
    dirs: list[Path] = []
    seen: set[Path] = set()
    for p in (*_course_library_roots(), _LEGACY_MODULES_DIR.resolve() if _LEGACY_MODULES_DIR.exists() else None):
        if p is None or not p.is_dir():
            continue
        r = p.resolve()
        if r not in seen:
            seen.add(r)
            dirs.append(p)
    return tuple(dirs)

router = APIRouter()

# Lazy singletons
_retriever = None
_llm = None
_translator = None


def get_retriever():
    global _retriever
    if _retriever is None:
        _retriever = ZIMRetriever()
    return _retriever


def get_llm():
    global _llm
    if _llm is None:
        _llm = OllamaClient()
    return _llm


def get_translator():
    global _translator
    if _translator is None:
        _translator = Translator(ollama_client=get_llm())
    return _translator


# --- Modules ---


@router.get("/modules")
async def list_modules():
    """List all available course modules."""
    mods = discover_modules(*course_content_dirs())
    out = [{"id": m["id"], "name": m["name"], "content_packs": m["content_packs"]} for m in mods]
    root = get_course_library_root()
    if root and _list_flat_library_files(root):
        out.append({"id": FLAT_LIBRARY_MODULE_ID, "name": "Library", "content_packs": []})
    return out


# --- Curriculum ---


@router.get("/modules/{module_id}/files")
async def list_module_files(module_id: str):
    """List PDFs and other library files under module content/ (recursive)."""
    mod = resolve_module(module_id)
    if not mod:
        raise HTTPException(404, "Module not found")
    if mod.get("flat_library"):
        return {"files": _list_flat_library_files(mod["path"])}
    return {"files": _list_module_content_files(mod["path"])}


@router.get("/modules/{module_id}/content/{file_path:path}")
async def serve_module_content_file(module_id: str, file_path: str):
    """Serve a file from module content/ (path traversal blocked)."""
    mod = resolve_module(module_id)
    if not mod:
        raise HTTPException(404, "Module not found")
    if mod.get("flat_library"):
        target = _resolve_flat_library_file(mod["path"], file_path)
    else:
        target = _resolve_module_content_file(mod, file_path)
    if not target:
        raise HTTPException(404, "File not found")
    media_type, _ = mimetypes.guess_type(str(target))
    suffix = target.suffix.lower()
    if suffix == ".pdf":
        mt = "application/pdf"
    else:
        mt = media_type or "application/octet-stream"
    # Inline so browsers, iframes, and pdf.js embed instead of forcing download
    inline = suffix in {".pdf", ".epub", ".html", ".htm", ".svg", ".txt"}
    return FileResponse(
        path=str(target),
        media_type=mt,
        filename=target.name,
        content_disposition_type="inline" if inline else "attachment",
    )


# --- Offline Wikipedia (Kiwix .zim) ---


@router.get("/wiki/html/{title:path}")
async def wiki_html_from_zim(title: str):
    """
    Legacy iframe URL: serve article HTML from the local ZIM (not live Wikipedia).
    Stale front-end builds used this path; returns HTML instead of 404 JSON.
    """
    # Kiwix titles often use underscores (e.g. Main_Page); keep path as in the ZIM
    raw = urllib.parse.unquote(title).strip() or None
    data = get_retriever().zim_get_article(raw)
    if not data.get("ok"):
        raise HTTPException(404, "Article not found or no ZIM loaded")
    safe_title = html.escape(data.get("title") or "Article")
    body = data.get("html") or ""
    page = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>{safe_title}</title></head><body>{body}</body></html>"""
    return HTMLResponse(content=page)


@router.get("/zim/status")
async def zim_status():
    """Whether a ZIM is loaded and which file (for Library Wikipedia)."""
    r = get_retriever()
    on_disk = sorted(p.name for p in ZIM_DIR.glob("*.zim")) if ZIM_DIR.exists() else []
    # Opening archive populates _opened_path; call zim_available first
    available = r.zim_available()
    kiwix_base = get_effective_kiwix_base_url()
    return {
        "available": available,
        "file": r.zim_file_name(),
        "directory": str(ZIM_DIR),
        "zim_files_on_disk": on_disk,
        "candidates_tried": r.zim_candidate_names(),
        "kiwix_viewer_url": kiwix_base,
        "kiwix_viewer_ready": bool(kiwix_base),
        "kiwix_serve_spawned_by_ustud": kiwix_started_by_ustud(),
    }


@router.get("/zim/search")
async def zim_search(q: str = "", limit: int = 20):
    """Search article titles in the local ZIM (suggestions + full-text index)."""
    r = get_retriever()
    if not r.zim_available():
        return {"available": False, "results": []}
    n = max(1, min(40, limit))
    return {"available": True, "results": r.zim_search_combined(q, n)}


@router.get("/zim/article")
async def zim_article(title: str | None = None):
    """Return processed article HTML from the ZIM (no network)."""
    data = get_retriever().zim_get_article(title)
    return data


@router.get("/zim/kiwix-viewer")
async def zim_kiwix_viewer(title: str | None = None):
    """
    URL for kiwix-serve’s /viewer (same UI as the Kiwix app). Fragment format:
    /viewer#ZIMNAME/path/in/archive
    """
    base = get_effective_kiwix_base_url()
    if not base:
        return {
            "ok": False,
            "error": "no_kiwix_serve",
            "url": None,
            "detail": "No kiwix-serve URL. Install kiwix-tools (kiwix-serve on PATH) or set USTUD_KIWIX_SERVE_URL.",
        }
    r = get_retriever()
    if not r.zim_available():
        return {"ok": False, "error": "no_zim", "url": None}
    frag = r.kiwix_viewer_fragment_for_title(title)
    if not frag:
        return {"ok": False, "error": "not_found", "url": None}
    url = f"{base}/viewer#{frag}"
    proxied = f"{KIWIX_FRAME_PREFIX}/viewer#{frag}"
    return {"ok": True, "url": url, "fragment": frag, "proxied_src": proxied, "error": ""}


@router.get("/zim/article-by-kiwix-fragment")
async def zim_article_by_kiwix_fragment(fragment: str = ""):
    """Resolve kiwix /viewer URL hash to article HTML (sync Text & select with in-iframe navigation)."""
    r = get_retriever()
    if not r.zim_available():
        return {"ok": False, "error": "no_zim", "title": "", "path": "", "html": ""}
    return r.zim_get_article_by_kiwix_fragment(urllib.parse.unquote(fragment or ""))


@router.api_route("/zim/kiwix-frame/{path:path}", methods=["GET", "HEAD"])
async def zim_kiwix_frame_proxy(request: Request, path: str):
    """
    Reverse-proxy kiwix-serve under /api so the iframe is same-origin as the UStud web app.
    Required to read document.location.hash after the user follows links inside the Reader.
    """
    kiwix_base = get_effective_kiwix_base_url()
    if not kiwix_base:
        raise HTTPException(503, detail="Kiwix viewer URL not configured.")
    base = kiwix_base.rstrip("/")
    dest = f"{base}/{path}" if path else f"{base}/"
    if request.url.query:
        dest = f"{dest}?{request.url.query}"
    fwd = {}
    if request.headers.get("range"):
        fwd["Range"] = request.headers["range"]
    if request.headers.get("accept"):
        fwd["Accept"] = request.headers["accept"]
    if request.headers.get("accept-language"):
        fwd["Accept-Language"] = request.headers["accept-language"]
    async with httpx.AsyncClient(follow_redirects=True, timeout=120.0) as client:
        resp = await client.request(request.method, dest, headers=fwd)
    ct = resp.headers.get("content-type")
    body = resp.content
    if request.method != "HEAD":
        body = _rewrite_kiwix_absolute_to_proxy(body, ct, kiwix_base)
    hop = {
        "connection",
        "transfer-encoding",
        "content-encoding",
        "keep-alive",
        "content-length",
    }
    out_h = {k: v for k, v in resp.headers.items() if k.lower() not in hop}
    if request.method != "HEAD" and ct and "text/html" in ct.lower():
        out_h.pop("content-length", None)
    return Response(
        content=body if request.method != "HEAD" else b"",
        status_code=resp.status_code,
        headers=out_h,
        media_type=ct.split(";")[0].strip() if ct else None,
    )


@router.get("/zim/raw/{zim_path:path}")
async def zim_raw(zim_path: str):
    """Serve an asset (image, stylesheet chunk, etc.) from inside the ZIM."""
    raw = get_retriever().zim_raw_by_path(zim_path)
    if not raw:
        raise HTTPException(404, "Not found")
    data, mime = raw
    return Response(content=data, media_type=mime)


@router.get("/modules/{module_id}/curriculum")
async def get_curriculum(module_id: str):
    """Get full curriculum structure for a module."""
    mod = resolve_module(module_id)
    if not mod:
        raise HTTPException(404, "Module or curriculum not found")
    if mod.get("flat_library"):
        return {"units": []}
    if not mod.get("curriculum"):
        raise HTTPException(404, "Module or curriculum not found")
    return {"units": mod["curriculum"].units}


@router.get("/modules/{module_id}/lessons/{unit_id}/{lesson_id}")
async def get_lesson(module_id: str, unit_id: str, lesson_id: str):
    """Get a specific lesson with content."""
    mod = get_module(module_id, *course_content_dirs())
    if not mod or not mod.get("curriculum"):
        raise HTTPException(404, "Module not found")
    engine = mod["curriculum"]
    lesson = engine.get_lesson(unit_id, lesson_id)
    if not lesson:
        raise HTTPException(404, "Lesson not found")

    # Get content from pack + ZIM
    retriever = get_retriever()
    content_parts = []
    for pack_id in mod.get("content_packs", []):
        pack_content = retriever.get_from_pack(
            pack_id, lesson_id,
            base_path=mod["path"] / "content" if (mod["path"] / "content").exists() else None,
        )
        if pack_content:
            content_parts.append(pack_content)
    topics = lesson.get("topics", [])
    if topics:
        zim_context = retriever.search(" ".join(topics), max_results=3)
        if zim_context and "placeholder" not in zim_context.lower():
            content_parts.append(zim_context)
    content = "\n\n".join(content_parts) if content_parts else lesson.get("description", "")

    return {
        "unit_id": unit_id,
        "lesson_id": lesson_id,
        "title": lesson.get("title", ""),
        "description": lesson.get("description", ""),
        "content": content,
        "difficulty": lesson.get("difficulty", 1),
        "topics": topics,
    }


# --- Progress ---


@router.get("/progress/{user_id}/{module_id}")
async def get_progress(user_id: str, module_id: str):
    """Get user progress for a module."""
    progress = await db.get_progress(DB_PATH, user_id, module_id)
    completed = {k: v for k, v in progress.items() if v.get("completed")}
    return {"completed_lessons": list(completed.keys()), "details": progress}


class CompleteLessonRequest(BaseModel):
    score: float | None = None


@router.post("/progress/{user_id}/{module_id}/{lesson_id}/complete")
async def complete_lesson(user_id: str, module_id: str, lesson_id: str, body: CompleteLessonRequest):
    """Mark a lesson as completed."""
    await db.mark_lesson_complete(DB_PATH, user_id, module_id, lesson_id, body.score)
    return {"ok": True}


@router.get("/modules/{module_id}/lessons/{unit_id}/{lesson_id}/unlocked")
async def check_unlocked(module_id: str, unit_id: str, lesson_id: str, user_id: str = "default"):
    """Check if a lesson is unlocked for the user."""
    mod = get_module(module_id, *course_content_dirs())
    if not mod or not mod.get("curriculum"):
        raise HTTPException(404, "Module not found")
    progress = await db.get_progress(DB_PATH, user_id, module_id)
    completed = {k for k, v in progress.items() if v.get("completed")}
    unlocked = mod["curriculum"].is_unlocked(unit_id, lesson_id, completed)
    return {"unlocked": unlocked}


# --- Chat / AI ---


class LearnerProfilePayload(BaseModel):
    """Optional learner facts from the client Profile (local app)."""

    full_name: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    grade_level: str | None = None
    learning_style: str | None = None
    personality_type: str | None = None
    ai_context_summary: str | None = None


class ChatRequest(BaseModel):
    message: str
    lesson_context: str | None = None
    module_id: str | None = None
    lesson_id: str | None = None
    learner_profile: LearnerProfilePayload | None = None
    # en | fa | ps | auto — see _language_context_for_chat
    response_language: str = "auto"
    # "reading" = library article/PDF: anchor in document but may add labeled broader teaching
    tutor_mode: str | None = None


_VALID_RESPONSE_LANGS = frozenset({"en", "fa", "ps", "auto"})


READING_TUTOR_INSTRUCTIONS = (
    "Reading tutor mode — the student is viewing a specific article or PDF in the library.\n"
    "• When the question is about this document, the highlighted selection, or the current page, anchor your answer in the "
    "context below (title, excerpt, search snippets) before anything else.\n"
    "• If they ask for the big picture, why it matters, how it fits the subject, or links to the wider world, add a clearly "
    "labeled section (for example a line **Bigger picture:** or **In this subject:**) with concise general knowledge. "
    "Make it obvious what is tied to the reading vs. what is extra teaching.\n"
    "• Do not invent quotations, page numbers, or precise details that are not in the provided context. If the excerpt does "
    "not contain the answer, say so and explain from reliable general knowledge or suggest what to read or search next.\n"
    "• If context is thin (no selection, only title/page), be honest about limits and still help them learn the topic."
)


def _has_arabic_script(text: str) -> bool:
    """True if text contains Arabic / Persian script (rough Unicode ranges)."""
    for ch in text:
        o = ord(ch)
        if (
            0x0600 <= o <= 0x06FF
            or 0x0750 <= o <= 0x077F
            or 0x08A0 <= o <= 0x08FF
            or 0xFB50 <= o <= 0xFDFF
            or 0xFE70 <= o <= 0xFEFF
        ):
            return True
    return False


def _language_context_for_chat(message: str, mode: str) -> str:
    """Instructions appended to system prompt for reply language."""
    m = (mode or "auto").lower().strip()
    if m not in _VALID_RESPONSE_LANGS:
        m = "auto"
    if m == "en":
        return (
            "Language: Reply in clear English unless the user explicitly asks for another language."
        )
    if m == "fa":
        return (
            "Language: The student turned ON فارسی mode. "
            "Write 100% of your answer in Persian (Dari/فارسی) using Arabic script. "
            "Do not answer in English — including greetings and sign-offs. "
            "Even if the user's question or the reference text above is English, answer only in Persian. "
            "Keep paragraphs short, bullets on their own lines, **bold** for key terms. "
            "If a technical term has no Persian word, write the English once in parentheses."
        )
    if m == "ps":
        return (
            "Language: The student turned ON پښتو (Pashto) mode. "
            "Write 100% of your answer in Pashto using Arabic script. "
            "Do not answer in English — including greetings and sign-offs. "
            "Even if the user's question or the reference text above is English, answer only in Pashto. "
            "Keep paragraphs short, bullets on their own lines, **bold** for key terms. "
            "If a technical term has no Pashto word, write the English once in parentheses."
        )
    if _has_arabic_script(message):
        return (
            "Language: The user's message uses Arabic script (Persian, Pashto, or Arabic). "
            "Reply fully in that same style of language they are using (Persian vs Pashto if clear from their wording; "
            "if unclear, prefer Persian/Dari). Use Arabic script throughout."
        )
    return (
        "Language: Reply in English by default. If the user writes in another language, reply in that language."
    )


def _translation_fallback_target(lang_mode: str, response: str) -> str | None:
    """
    If the tutor was asked for fa/ps but the model replied without Arabic script, translate.
    Returns 'fa', 'ps', or None.
    """
    if not response or len(response.strip()) <= 15:
        return None
    if _has_arabic_script(response):
        return None
    if lang_mode == "fa":
        return "fa"
    if lang_mode == "ps":
        return "ps"
    return None


def _learner_profile_context(lp: LearnerProfilePayload | None) -> str:
    if not lp:
        return ""
    parts: list[str] = []
    name = (lp.full_name or "").strip()
    if not name:
        name = " ".join(x for x in (lp.first_name or "", lp.last_name or "") if x.strip()).strip()
    if name:
        parts.append(f"The learner's name is {name}.")
    if lp.grade_level and str(lp.grade_level).strip():
        parts.append(f"Grade level: {lp.grade_level.strip()}.")
    if lp.learning_style and str(lp.learning_style).strip():
        parts.append(f"Learning style (from their profile): {lp.learning_style.strip()}.")
    if lp.personality_type and str(lp.personality_type).strip():
        parts.append(f"Personality preference (from their profile): {lp.personality_type.strip()}.")
    if lp.ai_context_summary and str(lp.ai_context_summary).strip():
        parts.append(f"Additional context they asked you to remember:\n{lp.ai_context_summary.strip()}")
    if not parts:
        return ""
    return (
        "Learner profile (use naturally when relevant — e.g. greet them by name; do not dump this as a list unless they ask):\n"
        + "\n".join(parts)
    )


STARTER_PROMPTS_FALLBACK = [
    "Explain photosynthesis in simple terms",
    "What is the Pythagorean theorem?",
    "Tell me an interesting fact about ancient Rome",
    "How do I write a good paragraph?",
    "What is a musical scale?",
    "Help me understand fractions",
]


def _parse_starter_prompts_response(raw: str, want: int) -> list[str]:
    """Extract JSON array of strings from model output."""
    text = (raw or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\s*", "", text)
        text = re.sub(r"\s*```\s*$", "", text)
    text = text.strip()
    if "[" in text and "]" in text:
        lo, hi = text.index("["), text.rindex("]") + 1
        if hi > lo:
            text = text[lo:hi]
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return []
    if not isinstance(data, list):
        return []
    out = []
    for x in data:
        s = str(x).strip().strip('"').strip("'")
        if s and len(s) < 200:
            out.append(s)
        if len(out) >= want:
            break
    return out


async def _generate_starter_prompts_via_ollama(llm: OllamaClient, count: int) -> list[str]:
    """Ask the local model for diverse short starter questions (JSON array)."""
    seed = random.randint(1, 999_999)
    system = (
        "You reply with ONLY a valid JSON array of strings, no markdown, no explanation. "
        f"Exactly {count} short questions a student might click to start learning. "
        "Mix topics: science, math, language, history, geography, health, arts, daily life. "
        "Simple English, each question one line, under 14 words. "
        f"Make this set varied (imagine random seed {seed})."
    )
    user = f'Output format example: ["Question one?", "Question two?"] — but use your own {count} different questions.'
    resp = await llm.chat_async(
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ]
    )
    text = resp.message.content if resp and resp.message else ""
    return _parse_starter_prompts_response(text, count)


def _is_simple_greeting_or_chat(msg: str) -> bool:
    """Skip RAG for greetings and short social messages - they need natural replies."""
    lower = msg.lower().strip()
    if len(lower) < 15:
        greetings = ("hello", "hi", "hey", "how are you", "how r u", "what's up", "sup", "good morning", "good afternoon", "good evening", "bye", "thanks", "thank you")
        if any(g in lower or lower in g for g in greetings):
            return True
    return False


@router.get("/chat/starter-prompts")
async def get_starter_prompts(count: int = 6):
    """
    Suggest starter chat prompts generated by the local Ollama model (varies each call).
    Falls back to static prompts if the model is unavailable or output is invalid.
    """
    n = max(3, min(12, count))
    llm = get_llm()
    try:
        generated = await _generate_starter_prompts_via_ollama(llm, n)
    except Exception as e:
        logger.warning("starter-prompts Ollama failed: %s", e)
        generated = []
    if len(generated) < n:
        pool = [p for p in STARTER_PROMPTS_FALLBACK if p not in generated]
        random.shuffle(pool)
        generated.extend(pool[: n - len(generated)])
    if len(generated) < n:
        for p in STARTER_PROMPTS_FALLBACK:
            if len(generated) >= n:
                break
            if p not in generated:
                generated.append(p)
    return {"prompts": generated[:n]}


@router.post("/chat")
async def chat(body: ChatRequest):
    """Chat with AI tutor. Uses RAG context with chunking for large content."""
    retriever = get_retriever()
    llm = get_llm()

    context = body.lesson_context or ""
    if body.module_id and body.lesson_id:
        mod = get_module(body.module_id, *course_content_dirs())
        if mod:
            for pack_id in mod.get("content_packs", []):
                pack_content = retriever.get_from_pack(
                    pack_id, body.lesson_id,
                    base_path=mod["path"] / "content" if (mod["path"] / "content").exists() else None,
                )
                if pack_content:
                    context = (context + "\n\n" + pack_content).strip()
    # Only use RAG search for substantive questions - not greetings
    if not context and body.message and not _is_simple_greeting_or_chat(body.message):
        context = retriever.search(body.message, max_results=3)

    is_reading = (body.tutor_mode or "").lower().strip() == "reading"
    # Chunk large context; reading mode keeps more of excerpt + search (library PDFs)
    max_context_chars = 9000 if is_reading else 3000
    # Normalize PDF noise; for reading mode, query-biased extractive trim before chunking (helps small LLMs)
    context = preprocess_chat_context(
        context,
        body.message or "",
        max_chars=max_context_chars,
        query_biased_trim=is_reading,
    )
    chunk_cap = 16 if is_reading else 6
    if len(context) > max_context_chars:
        chunks = chunk_text(context, chunk_size=500)
        context = "\n\n".join(chunks[:chunk_cap])

    learner_ctx = _learner_profile_context(body.learner_profile)
    lang_mode = (body.response_language or "auto").lower().strip()
    if lang_mode not in _VALID_RESPONSE_LANGS:
        lang_mode = "auto"
    lang_ctx = _language_context_for_chat(body.message or "", lang_mode)

    user_suffix = ""
    if lang_mode == "fa":
        user_suffix = (
            "یادآوری برای معلم: دانش‌آموز حالت فارسی را فعال کرده است. "
            "فقط به فارسی (خط عربی) پاسخ بده، نه به انگلیسی."
        )
    elif lang_mode == "ps":
        user_suffix = (
            "یادونه د ښوونکي لپاره: زده‌کوونکي پښتو مود فعال کړی دی. "
            "ځواب یواځې په پښتو (عربي لیک) کې ورکړئ، په انګلیسي کې نه."
        )

    scene_instructions = READING_TUTOR_INSTRUCTIONS if is_reading else None
    context_heading = (
        "Context from what the student is reading (metadata, excerpt, optional library search). "
        "Follow Reading tutor rules in your instructions.\n\n"
        if is_reading
        else None
    )
    question_label = "Student question:" if is_reading else "Question:"

    try:
        response = await llm.generate_with_context_async(
            body.message,
            context or "General knowledge.",
            learner_context=learner_ctx or None,
            language_context=lang_ctx,
            user_message_suffix=user_suffix or None,
            scene_instructions=scene_instructions,
            context_heading=context_heading,
            question_label=question_label,
        )
        # If the model ignored fa/ps mode, fall back to EN→target translation (MT5 for fa, Ollama for ps)
        t_target = _translation_fallback_target(lang_mode, response)
        if t_target:
            try:
                translator = get_translator()
                translated = await translator.translate(response, target=t_target)
                if translated and translated.strip() and translated.strip() != response.strip():
                    response = translated
            except Exception:
                logger.debug("%s fallback translation skipped", t_target, exc_info=True)

        return {"response": response}
    except Exception as e:
        return {
            "response": f"I'm sorry, the AI assistant is not available. Make sure Ollama is running (ollama serve) and you have a model like SmolLM2 (ollama pull smollm2:135m). Error: {e}",
        }


# --- Search ---


class SearchRequest(BaseModel):
    query: str
    synthesize: bool = False


@router.post("/search")
async def search(body: SearchRequest):
    """Search across Wikipedia (ZIM) and all course packs. Optionally synthesize with AI."""
    retriever = get_retriever()
    results, rag_context = retriever.search_all(body.query, *course_content_dirs())

    synthesis = None
    if body.synthesize and rag_context:
        try:
            llm = get_llm()
            prompt = f"Based on the following content, answer this question in 2-4 sentences: {body.query}\n\nContent:\n{rag_context[:2500]}"
            synthesis = (await llm.chat_async(messages=[{"role": "user", "content": prompt}])).message.content
        except Exception:
            synthesis = None

    return {"results": results, "synthesis": synthesis}


# --- Translation ---


class TranslateRequest(BaseModel):
    text: str
    target: str = "fa"  # fa = Dari, ps = Pashto


@router.post("/translate")
async def translate(body: TranslateRequest):
    """Translate text to Dari or Pashto."""
    translator = get_translator()
    try:
        result = await translator.translate(body.text, target=body.target)
    except Exception as e:
        logger.exception("Translation failed: %s", e)
        raise HTTPException(status_code=503, detail="Translation service unavailable. Is Ollama running?")
    success = result != body.text and len(result) > 0
    if not success and body.text.strip():
        logger.warning("Translation returned unchanged text (Ollama may be down or model returned same text)")
    return {
        "translated": result,
        "target": body.target,
        "success": success,
    }
