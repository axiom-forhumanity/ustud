"""RAG retriever - fetches relevant chunks from ZIM files and content packs."""

import html
import logging
import mimetypes
import os
import re
import unicodedata
import urllib.parse
from pathlib import Path, PurePosixPath

from ustud.config import ZIM_DIR, PACKS_DIR

logger = logging.getLogger(__name__)


def zim_path_decode_fully(path: str) -> str:
    """Apply urllib.parse.unquote until stable (e.g. %252C → %2C → comma)."""
    if not path:
        return ""
    cur = path.replace("\\", "/").strip("/")
    prev = None
    while prev != cur:
        prev = cur
        cur = urllib.parse.unquote(cur)
    return cur.strip("/")


def _zim_filename_is_full_wikipedia_pack(name: str) -> bool:
    """Skip Simple English, Wiktionary, and non-Wikipedia ZIMs when auto-picking a file."""
    n = name.lower()
    if "wiktionary" in n:
        return False
    if "wikipedia" not in n:
        return False
    if "_simple" in n or "en_simple" in n:
        return False
    return True


def kiwix_book_name_from_filename(filename: str) -> str:
    """ZIM ‘book name’ in kiwix-serve URLs (see kiwix-tools docs)."""
    stem = Path(filename).stem
    s = stem.lower()
    s = "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")
    return s.replace(" ", "_").replace("+", "plus")


def _kiwix_fragment_head_matches_opened_zim(fragment_head: str, opened_zim_path: Path) -> bool:
    """True if the first segment of a /viewer#… hash matches this archive’s kiwix book id."""
    if not fragment_head or not opened_zim_path:
        return False
    head_id = kiwix_book_name_from_filename(f"{fragment_head}.zim")
    expected = kiwix_book_name_from_filename(opened_zim_path.name)
    return head_id == expected


def chunk_text(text: str, chunk_size: int = 400, overlap: int = 50) -> list[str]:
    """Split text into chunks for RAG. Prefers paragraph/sentence boundaries."""
    if not text or len(text) <= chunk_size:
        return [text] if text.strip() else []
    chunks = []
    paras = re.split(r"\n\n+", text)
    current = ""
    for p in paras:
        if len(current) + len(p) + 2 <= chunk_size:
            current = (current + "\n\n" + p).strip() if current else p
        else:
            if current:
                chunks.append(current)
            if len(p) > chunk_size:
                sentences = re.split(r"(?<=[.!?])\s+", p)
                current = ""
                for s in sentences:
                    if len(current) + len(s) + 1 <= chunk_size:
                        current = (current + " " + s).strip() if current else s
                    else:
                        if current:
                            chunks.append(current)
                        current = s
            else:
                current = p
    if current:
        chunks.append(current)
    return chunks


class ZIMRetriever:
    """Retrieve content from Kiwix ZIM files for RAG."""

    def __init__(self, zim_path: Path | None = None):
        if zim_path is not None:
            self._candidates = [zim_path.resolve()] if zim_path.is_file() else []
        else:
            self._candidates = self._list_zim_candidates()
        self._archive_obj = None
        self._opened_path: Path | None = None
        self._open_attempted = False

    @staticmethod
    def _list_zim_candidates() -> list[Path]:
        """Full Wikipedia packs only (no Simple English, no Wiktionary). Largest first (prefer maxi over mini)."""
        raw = (os.environ.get("USTUD_ZIM_PATH") or "").strip().strip('"').strip("'")
        if raw:
            p = Path(raw).expanduser()
            if p.is_file() and p.suffix.lower() == ".zim":
                return [p.resolve()]
            logger.warning("USTUD_ZIM_PATH is set but is not a .zim file: %s", raw)
        if not ZIM_DIR.exists():
            return []
        cands = [
            f.resolve()
            for f in ZIM_DIR.glob("*.zim")
            if _zim_filename_is_full_wikipedia_pack(f.name)
        ]
        if not cands:
            logger.warning(
                "No full Wikipedia .zim in %s (Simple English and Wiktionary are ignored). "
                "Add e.g. wikipedia_en_all_*.zim from https://download.kiwix.org/zim/wikipedia/",
                ZIM_DIR,
            )
            return []
        return sorted(cands, key=lambda p: p.stat().st_size, reverse=True)

    def _get_archive(self):
        """Lazy-load first ZIM that opens successfully."""
        if self._archive_obj is not None:
            return self._archive_obj
        if self._open_attempted:
            return None
        self._open_attempted = True
        try:
            from libzim.reader import Archive
        except ImportError:
            logger.warning("libzim is not installed; install requirements.txt for ZIM support")
            return None
        for path in self._candidates:
            if not path.exists():
                logger.warning("ZIM file missing: %s", path)
                continue
            try:
                self._archive_obj = Archive(str(path))
                self._opened_path = path
                logger.info("Opened ZIM archive: %s", path.name)
                return self._archive_obj
            except Exception as e:
                logger.warning("Could not open ZIM %s: %s", path.name, e)
        logger.warning(
            "No ZIM archive could be opened (%d full-Wikipedia candidate(s) in %s). "
            "Very large maxi files may need more RAM/disk on first open, or set USTUD_ZIM_PATH to one .zim.",
            len(self._candidates),
            ZIM_DIR,
        )
        return None

    def search(self, query: str, max_results: int = 5, max_chunk_chars: int = 512) -> str:
        """
        Search ZIM for relevant content. Returns concatenated chunks for RAG context.
        Falls back to simple text search if full-text search isn't available.
        """
        archive = self._get_archive()
        if not archive:
            return self._fallback_content(query)

        results = []
        query_lower = query.lower()
        query_words = set(re.findall(r"\w+", query_lower))

        try:
            # Try full-text search if available
            if hasattr(archive, "search") and archive.search:
                search = archive.search(query)
                for entry in search:
                    if len(results) >= max_results:
                        break
                    try:
                        item = entry.get_item()
                        content = bytes(item.content).decode("utf-8", errors="ignore")
                        content = self._clean_html(content)
                        if len(content) > 50:
                            results.append(self._truncate(content, max_chunk_chars))
                    except Exception:
                        continue
        except Exception:
            pass

        # Fallback: iterate entries and match by title/content
        if not results:
            try:
                iter_fn = getattr(archive, "iterByPath", None) or getattr(archive, "iter_entries", None)
                if not iter_fn:
                    raise ValueError("No iterator")
                for entry in iter_fn():
                    if len(results) >= max_results:
                        break
                    title = getattr(entry, "title", "") or ""
                    path = getattr(entry, "path", "") or ""
                    if not query_words or any(w in title.lower() or w in path.lower() for w in query_words):
                        try:
                            item = entry.get_item()
                            content = bytes(item.content).decode("utf-8", errors="ignore")
                            content = self._clean_html(content)
                            if len(content) > 50:
                                results.append(self._truncate(content, max_chunk_chars))
                        except Exception:
                            continue
            except Exception:
                pass

        if not results:
            return self._fallback_content(query)

        return "\n\n---\n\n".join(results[:max_results])

    def _clean_html(self, text: str) -> str:
        """Strip HTML tags and normalize whitespace."""
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    @staticmethod
    def _strip_scripts_and_styles(html: str) -> str:
        html = re.sub(r"<script\b[^>]*>[\s\S]*?</script>", "", html, flags=re.IGNORECASE)
        html = re.sub(r"<style\b[^>]*>[\s\S]*?</style>", "", html, flags=re.IGNORECASE)
        return html

    def _truncate(self, text: str, max_chars: int) -> str:
        """Truncate to sentence boundary."""
        if len(text) <= max_chars:
            return text
        truncated = text[: max_chars + 1]
        last_period = truncated.rfind(".")
        if last_period > max_chars // 2:
            return truncated[: last_period + 1]
        return truncated.rstrip() + "..."

    def _fallback_content(self, query: str) -> str:
        """Return static fallback when no ZIM is available (dev mode)."""
        return (
            f"Relevant information about '{query}': "
            "This is placeholder content. Install a full Wikipedia ZIM (e.g. wikipedia_en_all_*) from "
            "https://download.kiwix.org/zim/wikipedia/ and place it in your UStud zim folder."
        )

    def zim_available(self) -> bool:
        return self._get_archive() is not None

    def zim_file_name(self) -> str | None:
        return self._opened_path.name if self._opened_path else None

    def zim_candidate_names(self) -> list[str]:
        """Basenames of .zim files we would try (for diagnostics)."""
        return [p.name for p in self._candidates]

    def _zim_normalize_search_hit(self, archive, hit) -> str | None:
        """
        Map a suggestion or full-text hit to a title that get_entry_by_title() accepts.

        SuggestionSearcher returns article titles; Searcher full-text returns entry *paths*
        (e.g. A/Article_name). Previously we treated paths as titles, so clicks failed with
        not_found.
        """
        if hit is None:
            return None
        hit = str(hit).strip()
        if not hit:
            return None
        entry = None
        norm = hit.replace("\\", "/")
        parts = [p for p in norm.split("/") if p]
        if "/" in norm and ".." not in parts:
            path_key = norm.lstrip("/")
            try:
                entry = archive.get_entry_by_path(path_key)
            except Exception:
                entry = None
        if entry is None:
            try:
                entry = archive.get_entry_by_title(hit)
            except Exception:
                return None
        try:
            while getattr(entry, "is_redirect", False):
                entry = entry.get_redirect_entry()
        except Exception:
            pass
        t = getattr(entry, "title", None)
        return t if t else None

    def _zim_snippet_for_title(self, archive, title: str, max_chars: int = 220) -> str:
        try:
            entry = archive.get_entry_by_title(title)
            item = entry.get_item()
            html = bytes(item.content).decode("utf-8", errors="ignore")
            html = self._strip_scripts_and_styles(html)
            text = self._clean_html(html)
            return self._truncate(text, max_chars) if text else ""
        except Exception:
            return ""

    def zim_search_combined(self, query: str, limit: int = 20) -> list[dict]:
        """
        Title suggestions + full-text search (libzim), merged. Offline Library Wikipedia.
        """
        archive = self._get_archive()
        if not archive:
            return []
        q = (query or "").strip()
        if len(q) < 1:
            return []
        limit = max(1, min(40, limit))
        seen: set[str] = set()
        ordered: list[str] = []

        try:
            from libzim.suggestion import SuggestionSearcher

            sug = SuggestionSearcher(archive).suggest(q)
            for raw in list(sug.getResults(0, limit)):
                canon = self._zim_normalize_search_hit(archive, raw)
                if canon and canon not in seen:
                    seen.add(canon)
                    ordered.append(canon)
        except Exception:
            pass

        try:
            from libzim.search import Query, Searcher

            search = Searcher(archive).search(Query().set_query(q))
            for raw in list(search.getResults(0, limit)):
                canon = self._zim_normalize_search_hit(archive, raw)
                if canon and canon not in seen:
                    seen.add(canon)
                    ordered.append(canon)
        except Exception:
            pass

        out: list[dict] = []
        for title in ordered[:limit]:
            snip = self._zim_snippet_for_title(archive, title, 220)
            out.append({"title": title, "snippet": snip})
        return out

    def _zim_resolve_relative_path(self, article_path: str, ref: str) -> str | None:
        if not ref or ref.startswith(("http://", "https://", "//", "data:", "#", "mailto:")):
            return None
        ref = ref.strip().split("?", 1)[0].split("#", 1)[0]
        if not ref:
            return None
        ref = urllib.parse.unquote(ref)
        ap = article_path.replace("\\", "/").strip("/")
        base = PurePosixPath(ap).parent if "/" in ap else PurePosixPath(".")
        combined = (base / ref).as_posix()
        parts: list[str] = []
        for p in combined.split("/"):
            if p == "..":
                if parts:
                    parts.pop()
            elif p and p != ".":
                parts.append(p)
        return "/".join(parts) if parts else None

    def _zim_upload_url_path_to_entry(self, archive, upload_path: str) -> str | None:
        """
        Map upload.wikimedia.org URL paths to paths inside a typical Wikipedia ZIM (mwoffliner / Kiwix).
        Tries several layouts because packagers differ slightly.
        """
        if not upload_path:
            return None
        path = upload_path.replace("\\", "/")
        if not path.startswith("/"):
            path = "/" + path
        candidates: list[str] = []
        thumb_commons = "/wikipedia/commons/thumb/"
        if thumb_commons in path:
            tail = path.split(thumb_commons, 1)[1].lstrip("/")
            candidates += [
                "I/m/commons_thumb/" + tail,
                "I/m/wikipedia/commons/thumb/" + tail,
            ]
        # Non-thumb commons file
        commons = "/wikipedia/commons/"
        if commons in path and thumb_commons not in path:
            tail = path.split(commons, 1)[1].lstrip("/")
            candidates += [
                "I/m/commons/" + tail,
                "I/m/wikipedia/commons/" + tail,
            ]
        # Whole path mirrored under I/m/ (common)
        stripped = path.lstrip("/")
        candidates += [
            "I/m/" + stripped,
            "I/" + stripped,
        ]
        seen: set[str] = set()
        for c in candidates:
            c = "/".join(p for p in c.split("/") if p)
            if not c or c in seen:
                continue
            seen.add(c)
            try:
                if archive.has_entry_by_path(c):
                    return c
            except Exception:
                continue
        return None

    def _zim_asset_url_to_api_raw(self, archive, article_path: str, raw_url: str) -> str | None:
        """Resolve an img/srcset URL to /api/zim/raw/… if the bytes live in this ZIM."""
        url = html.unescape((raw_url or "").strip())
        if not url or url.startswith(("#", "mailto:", "data:")):
            return None

        if url.startswith("//"):
            url = "https:" + url

        if url.startswith("http://") or url.startswith("https://"):
            try:
                parsed = urllib.parse.urlparse(url)
            except Exception:
                return None
            host = (parsed.netloc or "").lower()
            if "upload.wikimedia.org" not in host:
                return None
            path = urllib.parse.unquote(parsed.path or "")
            internal = self._zim_upload_url_path_to_entry(archive, path)
            if internal:
                return "/api/zim/raw/" + urllib.parse.quote(internal, safe="/")
            return None

        resolved = self._zim_resolve_relative_path(article_path, url)
        if not resolved:
            return None
        resolved = urllib.parse.unquote(resolved)
        try:
            if archive.has_entry_by_path(resolved):
                return "/api/zim/raw/" + urllib.parse.quote(resolved, safe="/")
        except Exception:
            pass
        return None

    def zim_rewrite_html_for_app(self, html: str, article_path: str) -> str:
        """Strip scripts; point relative media to /api/zim/raw/…; keep article HTML for in-app view."""
        archive = self._get_archive()
        if not archive or not html:
            return html

        html = self._strip_scripts_and_styles(html)

        def rewrite_url(u: str) -> str | None:
            return self._zim_asset_url_to_api_raw(archive, article_path, u)

        def repl_src_dbl(m: re.Match) -> str:
            new = rewrite_url(m.group(1).strip())
            return f'src="{new}"' if new else m.group(0)

        def repl_src_sgl(m: re.Match) -> str:
            new = rewrite_url(m.group(1).strip())
            return f"src='{new}'" if new else m.group(0)

        def repl_srcset_dbl(m: re.Match) -> str:
            raw = m.group(1)
            pieces = []
            for part in raw.split(","):
                part = part.strip()
                if not part:
                    continue
                u = part.split()[0] if part.split() else part
                rest = part[len(u) :].strip()
                new_u = rewrite_url(u)
                pieces.append(f"{new_u or u} {rest}".strip())
            return f'srcset="{", ".join(pieces)}"'

        def repl_srcset_sgl(m: re.Match) -> str:
            raw = m.group(1)
            pieces = []
            for part in raw.split(","):
                part = part.strip()
                if not part:
                    continue
                u = part.split()[0] if part.split() else part
                rest = part[len(u) :].strip()
                new_u = rewrite_url(u)
                pieces.append(f"{new_u or u} {rest}".strip())
            joined = ", ".join(pieces)
            return f"srcset='{joined}'"

        def repl_data_src_dbl(m: re.Match) -> str:
            new = rewrite_url(m.group(1).strip())
            return f'data-src="{new}"' if new else m.group(0)

        def repl_data_src_sgl(m: re.Match) -> str:
            new = rewrite_url(m.group(1).strip())
            return f"data-src='{new}'" if new else m.group(0)

        html = re.sub(r'src\s*=\s*"([^"]+)"', repl_src_dbl, html, flags=re.IGNORECASE)
        html = re.sub(r"src\s*=\s*'([^']+)'", repl_src_sgl, html, flags=re.IGNORECASE)
        html = re.sub(r'srcset\s*=\s*"([^"]+)"', repl_srcset_dbl, html, flags=re.IGNORECASE)
        html = re.sub(r"srcset\s*=\s*'([^']+)'", repl_srcset_sgl, html, flags=re.IGNORECASE)
        html = re.sub(r'data-src\s*=\s*"([^"]+)"', repl_data_src_dbl, html, flags=re.IGNORECASE)
        html = re.sub(r"data-src\s*=\s*'([^']+)'", repl_data_src_sgl, html, flags=re.IGNORECASE)
        return html

    def zim_get_article(self, title: str | None) -> dict:
        """
        Load article HTML from ZIM. Use main entry when title is empty / main page aliases.
        Returns {ok, title, path, html, error}.
        """
        archive = self._get_archive()
        if not archive:
            return {"ok": False, "error": "no_zim", "title": "", "path": "", "html": ""}

        t = (title or "").strip()
        tl_compact = t.lower().replace(" ", "").replace("_", "")
        try:
            if not t or tl_compact == "mainpage" or t.lower() in ("main page", "main_page"):
                entry = archive.main_entry
            else:
                entry = archive.get_entry_by_title(t)
        except Exception:
            return {"ok": False, "error": "not_found", "title": t, "path": "", "html": ""}

        try:
            item = entry.get_item()
            raw = bytes(item.content).decode("utf-8", errors="ignore")
            path = getattr(entry, "path", "") or ""
            display = (getattr(entry, "title", None) or t or path).replace("_", " ")
            if display.lower() == "mainpage":
                display = "Main page"
            m = re.search(r"<body\b[^>]*>([\s\S]*)</body>", raw, re.IGNORECASE)
            body = m.group(1) if m else raw
            html = self.zim_rewrite_html_for_app(body, path)
            return {
                "ok": True,
                "title": display,
                "path": path,
                "html": f'<div class="mw-parser-output zim-article">{html}</div>',
                "error": "",
            }
        except Exception as e:
            logger.warning("zim_get_article failed: %s", e)
            return {"ok": False, "error": "read_error", "title": t, "path": "", "html": ""}

    def kiwix_viewer_fragment_for_title(self, title: str | None) -> str | None:
        """
        Hash fragment for kiwix-serve: /viewer#ZIMNAME/path/in/zim
        (https://kiwix-tools.readthedocs.io — /viewer#ZIMNAME/PATH/IN/ZIMFILE).
        """
        archive = self._get_archive()
        if not archive or not self._opened_path:
            return None
        zimname = kiwix_book_name_from_filename(self._opened_path.name)
        t = (title or "").strip()
        tl_compact = t.lower().replace(" ", "").replace("_", "")
        try:
            if not t or tl_compact == "mainpage" or t.lower() in ("main page", "main_page"):
                entry = archive.main_entry
            else:
                entry = archive.get_entry_by_title(t)
            while getattr(entry, "is_redirect", False):
                try:
                    entry = entry.get_redirect_entry()
                except Exception:
                    break
            path = getattr(entry, "path", None)
            if path is None:
                return None
            path = str(path).replace("\\", "/").strip("/")
            if not path:
                return f"{zimname}/"
            return f"{zimname}/{path}"
        except Exception:
            return None

    def zim_get_article_by_kiwix_fragment(self, fragment: str) -> dict:
        """
        Resolve kiwix-serve /viewer URL hash (ZIMNAME/path/in/archive) to the same HTML as zim_get_article.
        Used when the user followed links inside the Reader iframe; React state may still name another page.
        """
        archive = self._get_archive()
        if not archive or not self._opened_path:
            return {"ok": False, "error": "no_zim", "title": "", "path": "", "html": ""}

        raw = (fragment or "").strip().lstrip("#")
        if not raw:
            return self.zim_get_article(None)

        parts = [p for p in raw.replace("\\", "/").split("/") if p]
        if not parts:
            return self.zim_get_article(None)

        path = ""
        if len(parts) >= 2 and _kiwix_fragment_head_matches_opened_zim(parts[0], self._opened_path):
            cand = "/".join(parts[1:]).strip("/")
            if cand and ".." not in cand.split("/") and archive.has_entry_by_path(cand):
                path = cand
        if not path:
            cand = "/".join(parts).strip("/")
            if cand and ".." not in cand.split("/") and archive.has_entry_by_path(cand):
                path = cand
        if not path and len(parts) >= 2:
            cand = "/".join(parts[1:]).strip("/")
            if cand and ".." not in cand.split("/") and archive.has_entry_by_path(cand):
                path = cand

        if not path:
            return {"ok": False, "error": "not_found", "title": "", "path": "", "html": ""}

        try:
            entry = archive.get_entry_by_path(path)
            while getattr(entry, "is_redirect", False):
                try:
                    entry = entry.get_redirect_entry()
                except Exception:
                    break
            path = getattr(entry, "path", "") or path
            item = entry.get_item()
            raw_html = bytes(item.content).decode("utf-8", errors="ignore")
            display = (getattr(entry, "title", None) or path).replace("_", " ")
            if display.lower() == "mainpage":
                display = "Main page"
            m = re.search(r"<body\b[^>]*>([\s\S]*)</body>", raw_html, re.IGNORECASE)
            body = m.group(1) if m else raw_html
            html = self.zim_rewrite_html_for_app(body, path)
            return {
                "ok": True,
                "title": display,
                "path": path,
                "html": f'<div class="mw-parser-output zim-article">{html}</div>',
                "error": "",
            }
        except Exception as e:
            logger.warning("zim_get_article_by_kiwix_fragment failed: %s", e)
            return {"ok": False, "error": "read_error", "title": "", "path": path, "html": ""}

    def zim_raw_by_path(self, path: str) -> tuple[bytes, str] | None:
        """Binary content for images etc. path must not contain traversal."""
        archive = self._get_archive()
        if not archive or not path:
            return None
        path = zim_path_decode_fully(path)
        if not path or ".." in path.split("/"):
            return None
        try:
            if not archive.has_entry_by_path(path):
                return None
            entry = archive.get_entry_by_path(path)
            item = entry.get_item()
            data = bytes(item.content)
            mime, _ = mimetypes.guess_type(path)
            return data, mime or "application/octet-stream"
        except Exception:
            return None

    def get_from_pack(self, pack_id: str, lesson_id: str, base_path: Path | None = None) -> str:
        """Get curated content from a course pack. base_path can be module content dir."""
        base = base_path or PACKS_DIR
        pack_dir = base / pack_id
        if not pack_dir.exists():
            return ""
        for ext in [".md", ".txt"]:
            path = pack_dir / f"{lesson_id}{ext}"
            if path.exists():
                return path.read_text(encoding="utf-8", errors="ignore")
        return ""

    def search_packs(
        self,
        query: str,
        *modules_roots: Path,
        max_results: int = 10,
        max_chunk_chars: int = 512,
    ) -> list[dict]:
        """Search across all course pack content under library/, modules/, etc."""
        query_lower = query.lower()
        query_words = set(re.findall(r"\w+", query_lower))
        if not query_words:
            return []

        results = []
        for modules_dir in modules_roots:
            if not modules_dir.exists():
                continue
            for mod_dir in modules_dir.iterdir():
                if not mod_dir.is_dir():
                    continue
                content_dir = mod_dir / "content"
                if not content_dir.exists():
                    continue
                for pack_dir in content_dir.iterdir():
                    if not pack_dir.is_dir():
                        continue
                    for pattern in ["*.md", "*.txt"]:
                        for f in pack_dir.glob(pattern):
                            try:
                                text = f.read_text(encoding="utf-8", errors="ignore")
                                if not any(w in text.lower() for w in query_words):
                                    continue
                                title = f.stem.replace("_", " ").title()
                                snippet = self._truncate(text, max_chunk_chars)
                                results.append({
                                    "source": mod_dir.name,
                                    "pack": pack_dir.name,
                                    "title": title,
                                    "snippet": snippet,
                                    "content": text,
                                })
                                if len(results) >= max_results:
                                    return results
                            except Exception:
                                continue
        return results

    def search_all(
        self,
        query: str,
        *modules_roots: Path,
        max_results: int = 5,
        max_chunk_chars: int = 512,
    ) -> tuple[list[dict], str]:
        """Search ZIM + all packs. Returns (results_list, rag_context_string)."""
        results = []
        rag_parts = []

        if modules_roots:
            pack_results = self.search_packs(query, *modules_roots, max_results=5, max_chunk_chars=max_chunk_chars)
            for r in pack_results:
                results.append({
                    "source": r["source"],
                    "title": r["title"],
                    "snippet": r["snippet"],
                    "content": r["content"][:2000],
                })
                rag_parts.append(f"[From {r['source']} - {r['title']}]\n{r['snippet']}")

        zim_content = self.search(query, max_results=max_results, max_chunk_chars=max_chunk_chars)
        if zim_content and "placeholder" not in zim_content.lower():
            results.append({
                "source": "Wikipedia",
                "title": "Wikipedia",
                "snippet": self._truncate(zim_content, max_chunk_chars),
                "content": zim_content,
            })
            rag_parts.append(f"[From Wikipedia]\n{zim_content}")

        rag_context = "\n\n---\n\n".join(rag_parts) if rag_parts else ""
        return results, rag_context
