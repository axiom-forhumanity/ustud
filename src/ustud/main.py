"""FastAPI application - main entry point."""

import asyncio
from pathlib import Path

from urllib.parse import quote

from fastapi import FastAPI, HTTPException
from fastapi.responses import RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from ustud.config import BASE_DIR
from ustud.db import init_db
from ustud.api import router as api_router

# Ensure static dir exists for UI (main.py is in src/ustud/, project root is src/../)
PROJECT_ROOT = Path(__file__).parent.parent.parent
# Boiler (React) build takes precedence; fallback to legacy ui/
BOILER_DIST = PROJECT_ROOT / "boiler" / "dist"
UI_DIR = BOILER_DIST if BOILER_DIST.exists() else (PROJECT_ROOT / "ui" / "dist")
if not UI_DIR.exists():
    UI_DIR = PROJECT_ROOT / "ui"


app = FastAPI(
    title="UStud - Offline AI Learning",
    description="Learning platform for Afghan girls",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api", tags=["api"])


def _looks_like_static_filename(segment: str) -> bool:
    s = (segment or "").lower()
    return any(s.endswith(ext) for ext in (
        ".js", ".mjs", ".cjs", ".css", ".map", ".json", ".ico", ".png", ".jpg", ".jpeg",
        ".gif", ".webp", ".svg", ".woff", ".woff2", ".ttf", ".eot", ".html", ".htm", ".txt",
        ".xml", ".webmanifest", ".wasm",
    ))


@app.get("/_assets_/{zim_path:path}")
async def zim_serve_assets_at_app_root(zim_path: str):
    """
    Kiwix viewer HTML often requests /_assets_/… at the site root (same host as the UI).
    Map to the same bytes as GET /api/zim/raw/_assets_/…
    """
    from ustud.api.routes import get_retriever

    full = "_assets_/" + zim_path.lstrip("/")
    raw = get_retriever().zim_raw_by_path(full)
    if not raw:
        raise HTTPException(404, "Not found")
    data, mime = raw
    return Response(content=data, media_type=mime)


# Single path segment only (does not match /assets/foo.js).
_DENY_ROOT_WIKI_SLUGS = frozenset(
    {
        "library",
        "profile",
        "admin",
        "api",
        "assets",
        "src",
        "docs",
        "redoc",
        "favicon.ico",
        "robots.txt",
        "sw.js",
    }
)  # compare with wiki_slug.lower()


@app.get("/{wiki_slug}")
async def zim_wikipedia_title_at_root(wiki_slug: str):
    """
    Kiwix in-iframe links may navigate to /Article_title at the app host. Redirect into the
    Library Wikipedia hub with a query param the SPA opens.
    """
    if _looks_like_static_filename(wiki_slug) or wiki_slug.strip().lower() in _DENY_ROOT_WIKI_SLUGS:
        raise HTTPException(404, "Not found")
    from ustud.api.routes import get_retriever

    r = get_retriever()
    if not r.zim_available():
        raise HTTPException(404, "Not found")
    title_try = wiki_slug.replace("_", " ")
    data = r.zim_get_article(title_try)
    if not data.get("ok"):
        data = r.zim_get_article(wiki_slug)
    if not data.get("ok"):
        raise HTTPException(404, "Not found")
    q = quote(title_try, safe="")
    return RedirectResponse(url=f"/?openZimTitle={q}#/library", status_code=302)


@app.on_event("startup")
async def startup():
    await init_db()

    def _start_kiwix():
        from ustud.core.kiwix_serve import try_start_kiwix_serve
        from ustud.api.routes import get_retriever

        try_start_kiwix_serve(get_retriever)

    await asyncio.to_thread(_start_kiwix)


@app.on_event("shutdown")
async def shutdown_kiwix():
    from ustud.core.kiwix_serve import stop_kiwix_serve

    await asyncio.to_thread(stop_kiwix_serve)


# Serve static UI - index.html for /, API at /api/*. Mount / after API so /api takes precedence.
if UI_DIR.exists():
    app.mount("/", StaticFiles(directory=str(UI_DIR), html=True), name="static")


def run():
    import uvicorn
    uvicorn.run("ustud.main:app", host="127.0.0.1", port=8765, reload=False)


if __name__ == "__main__":
    run()
