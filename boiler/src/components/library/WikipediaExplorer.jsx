import React, { useState, useCallback, useEffect, useRef } from "react";
import { flushSync, createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Loader2,
  ExternalLink,
  WifiOff,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  TextQuote,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ustud } from "@/api/ustudClient";
import ChatMessage from "@/components/chat/ChatMessage";
import ChatLanguageToggle from "@/components/chat/ChatLanguageToggle";
import { getLearnerProfileForApi } from "@/lib/learnerProfile";
import { useChatLanguage } from "@/hooks/useChatLanguage";
import { useAutosizeTextarea } from "@/hooks/useAutosizeTextarea";
import { wikiFullArticlePlain, MAX_FULL_CHARS } from "@/lib/wikiArticleContext";
import {
  wikipediaExplorerUiStrings,
  extractComposerSnippetForContext,
} from "@/lib/wikipediaExplorerUiStrings";

/** Guess article title from a Kiwix / relative href for in-app navigation (inline mode only). */
function titleFromZimHref(href) {
  if (!href || href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:")) return null;
  if (href.startsWith("/api/zim/")) return null;
  try {
    const clean = href.split("?")[0].split("#")[0];
    const last = clean.split("/").filter(Boolean).pop() || clean;
    if (!last) return null;
    return decodeURIComponent(last.replace(/\.html?$/i, "")).replace(/_/g, " ");
  } catch {
    return null;
  }
}

function toApiKeyAndLabel(title) {
  const isMain = title === "Main page" || title === "mainPage" || !title;
  return {
    apiKey: isMain ? "" : title,
    label: isMain ? "Main page" : title.replace(/_/g, " "),
  };
}

const MAX_CTX = 24000;
/** Always send this much from the start of the article so the model is grounded in the actual page (unless "entire article" is on). */
const BASELINE_ARTICLE_EXCERPT = 6000;

function buildWikiAssistantContext({
  articleTitle,
  selection,
  sectionHeading,
  sectionText,
  fullPlain,
  includeFullArticle,
  kiwixReaderUnsynced,
}) {
  if (kiwixReaderUnsynced) {
    return [
      "The student is using UStud's offline Wikipedia with the Kiwix Reader (embedded iframe).",
      `The application toolbar / sidebar title is: "${articleTitle}".`,
      "CRITICAL: If the student followed links inside the Kiwix Reader, the article they SEE can differ from that title. UStud cannot read the iframe URL (browser cross-origin rules), so the app does not know the on-screen article.",
      "No Wikipedia article body is included in this message on purpose, so you do not summarize the wrong page (e.g. Main page in context while they read Middle East).",
      'For questions like "what is this article about" or anything about on-screen content: say you cannot see the Reader page. Ask them to name the article, open it with the left Wikipedia search (or Back/Forward), or switch to the "Text & select" tab after opening the right article—then body text will match.',
      "You may still help with general study skills or questions that do not require the unseen Reader text.",
    ].join("\n\n");
  }

  const parts = [
    "The student is reading an offline Wikipedia article in UStud.",
    `The loaded article title is: "${articleTitle}". Treat this as the article in view unless the user says otherwise.`,
  ];
  if (!fullPlain?.trim()) {
    parts.push(
      "Note: No article body text is available in context (load may have failed or text is still loading). Rely on the title and the user's question; suggest Text & select or Retry if they need answers grounded in the article."
    );
  }
  if (includeFullArticle && fullPlain) {
    parts.push(
      `Full article text (truncated to ${MAX_FULL_CHARS} chars for storage):\n"""${fullPlain.slice(0, MAX_CTX)}${fullPlain.length > MAX_CTX ? "\n…" : ""}"""`
    );
  } else if (fullPlain?.trim()) {
    const excerpt = fullPlain.slice(0, BASELINE_ARTICLE_EXCERPT);
    parts.push(
      `Article excerpt (beginning of the loaded page — use this to ground all answers about what the article says):\n"""${excerpt}${fullPlain.length > BASELINE_ARTICLE_EXCERPT ? "\n…" : ""}"""`
    );
  }
  if (sectionText && sectionHeading) {
    parts.push(
      `Section "${sectionHeading}" (user-scoped):\n"""${sectionText.slice(0, MAX_CTX)}${sectionText.length > MAX_CTX ? "\n…" : ""}"""`
    );
  }
  if (selection?.trim()) {
    parts.push(
      `Selected excerpt (prioritize answering in relation to this):\n"""${selection.trim().slice(0, MAX_CTX)}${selection.length > MAX_CTX ? "\n…" : ""}"""`
    );
  }
  return parts.join("\n\n");
}

async function fetchZimStatus() {
  const res = await fetch("/api/zim/status");
  if (!res.ok) throw new Error("status");
  return res.json();
}

async function fetchZimSearch(q, limit = 20) {
  const params = new URLSearchParams({ q, limit: String(limit) });
  const res = await fetch(`/api/zim/search?${params}`);
  if (!res.ok) throw new Error("search");
  return res.json();
}

async function fetchZimArticle(title) {
  const params = new URLSearchParams();
  if (title) params.set("title", title);
  const res = await fetch(`/api/zim/article?${params}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.detail || `Server error (${res.status})`;
    throw new Error(typeof msg === "string" ? msg : "article");
  }
  return data;
}

async function fetchKiwixViewerUrl(title) {
  const params = new URLSearchParams();
  const lookup = title === "Main page" || title === "mainPage" ? "" : title;
  if (lookup) params.set("title", lookup);
  const res = await fetch(`/api/zim/kiwix-viewer?${params}`);
  return res.json();
}

/** Same-origin Kiwix iframe (/api/zim/kiwix-frame/…) — hash is the article path inside the ZIM. */
function tryReadKiwixViewerFragmentFromIframe(iframe) {
  if (!iframe) return null;
  try {
    const href = iframe.contentWindow?.location?.href;
    if (!href || typeof href !== "string") return null;
    if (!href.includes("/api/zim/kiwix-frame/")) return null;
    const i = href.indexOf("#");
    if (i === -1) return null;
    const raw = href.slice(i + 1).trim();
    return raw ? decodeURIComponent(raw.replace(/\+/g, " ")) : null;
  } catch {
    return null;
  }
}

async function fetchArticleByKiwixFragment(fragment) {
  const params = new URLSearchParams({ fragment });
  const res = await fetch(`/api/zim/article-by-kiwix-fragment?${params}`);
  return res.json();
}

const ASSISTANT_WIDTH_STORAGE_KEY = "ustud_wikipedia_assistant_width";
const DEFAULT_ASSISTANT_WIDTH = 400;
const MIN_ASSISTANT_WIDTH = 280;
/** Sanity cap for corrupted localStorage (real max comes from viewport in clampAssistantWidth). */
const STORED_ASSISTANT_WIDTH_CAP = 10000;
/** Max assistant width = viewport − this (left search column ~256–288px + small gutter). Panel can overlay the article. */
const VIEWPORT_RESERVE_FOR_LEFT_SIDEBAR_PX = 296;
/** Pixels of horizontal movement before resize applies (click without drag does nothing). */
const RESIZE_DRAG_COMMIT_PX = 6;
/** Tailwind `xl` breakpoint — keep in sync with tailwind.config */
const XL_BREAKPOINT_PX = 1280;

function readStoredAssistantWidth() {
  if (typeof window === "undefined") return DEFAULT_ASSISTANT_WIDTH;
  try {
    const raw = localStorage.getItem(ASSISTANT_WIDTH_STORAGE_KEY);
    const n = raw ? parseInt(raw, 10) : NaN;
    if (Number.isFinite(n) && n >= MIN_ASSISTANT_WIDTH && n <= STORED_ASSISTANT_WIDTH_CAP) return n;
  } catch {
    /* ignore */
  }
  return DEFAULT_ASSISTANT_WIDTH;
}

function clampAssistantWidth(w, viewportW) {
  const maxByViewport = Math.max(
    MIN_ASSISTANT_WIDTH,
    viewportW - VIEWPORT_RESERVE_FOR_LEFT_SIDEBAR_PX - 4
  );
  return Math.min(maxByViewport, Math.max(MIN_ASSISTANT_WIDTH, w));
}

const WIKI_SKIN_CSS = `
.wiki-parse { font-family: "Linux Libertine", Georgia, Times, serif; font-size: 15px; line-height: 1.6; color: #202122; max-width: 100%; }
.wiki-parse .mw-parser-output { max-width: 52rem; margin: 0 auto; }
.wiki-parse a { color: #0645ad; text-decoration: none; }
.wiki-parse a:hover { text-decoration: underline; }
.wiki-parse h1, .wiki-parse h2, .wiki-parse h3 { font-family: "Linux Libertine", Georgia, Times, serif; font-weight: 400; border-bottom: 1px solid #a2a9b1; margin-top: 1.25em; padding-bottom: 0.15em; }
.wiki-parse h2 { font-size: 1.5em; }
.wiki-parse h3 { font-size: 1.2em; border: none; }
.wiki-parse .infobox { border: 1px solid #a2a9b1; background: #f8f9fa; padding: 0.5em; font-size: 88%; }
.wiki-parse table { border-collapse: collapse; }
.wiki-parse .navbox, .wiki-parse .metadata, .wiki-parse .mbox-small, .wiki-parse .noprint { display: none !important; }
.wiki-parse img { max-width: 100%; height: auto; }
.wiki-parse figure { margin: 0.5em 0; }
.wiki-parse ul { list-style: disc; padding-left: 1.6em; }
.wiki-parse .reference { font-size: 0.85em; }
`;

export default function WikipediaExplorer({ initialZimTitle, onInitialZimConsumed }) {
  const [zimAvailable, setZimAvailable] = useState(null);
  const [zimFile, setZimFile] = useState(null);
  const [useKiwixViewer, setUseKiwixViewer] = useState(false);
  const [zimDiag, setZimDiag] = useState({});
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [articleLoading, setArticleLoading] = useState(true);
  const [error, setError] = useState("");
  const [articleError, setArticleError] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [iframeSrc, setIframeSrc] = useState("");
  const [currentTitle, setCurrentTitle] = useState("Main page");
  const [currentApiKey, setCurrentApiKey] = useState("");
  const [centerTab, setCenterTab] = useState("reader");
  const [articleSourceHtml, setArticleSourceHtml] = useState("");
  const [fullArticlePlain, setFullArticlePlain] = useState("");

  const [nav, setNav] = useState({
    entries: [{ apiKey: "", label: "Main page" }],
    index: 0,
  });

  const [snippetArmed, setSnippetArmed] = useState(false);
  /** Article selection kept for the tutor (not shown in the textarea). */
  const [pendingSnippet, setPendingSnippet] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatLanguage, setChatLanguage] = useChatLanguage();
  const [assistantWidth, setAssistantWidth] = useState(readStoredAssistantWidth);
  const [resizeMaskActive, setResizeMaskActive] = useState(false);
  const [isXlLayout, setIsXlLayout] = useState(
    () => typeof window !== "undefined" && window.matchMedia(`(min-width: ${XL_BREAKPOINT_PX}px)`).matches
  );

  const debounceRef = useRef(null);
  const textSelectRef = useRef(null);
  const kiwixIframeRef = useRef(null);
  const composerTextareaRef = useRef(null);
  useAutosizeTextarea(composerTextareaRef, input, { minHeight: 72, maxHeight: 140 });
  const messagesEndRef = useRef(null);
  const assistantWidthRef = useRef(assistantWidth);
  const resizeDragRef = useRef({ phase: "idle", startX: 0, startW: 0 });
  /** True when Kiwix Reader was showing and snippet tool auto-switched to Text & select (revert on cancel/capture/disarm). */
  const openedTextTabForSnippetRef = useRef(false);
  /** Avoid reloading Main page whenever `loadArticleContentOnly` identity changes (e.g. `useKiwixViewer` after ZIM status). */
  const zimInitialArticleLoadedRef = useRef(false);

  useEffect(() => {
    assistantWidthRef.current = assistantWidth;
  }, [assistantWidth]);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${XL_BREAKPOINT_PX}px)`);
    const onChange = () => setIsXlLayout(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < XL_BREAKPOINT_PX) return;
      setAssistantWidth((w) => {
        const next = clampAssistantWidth(w, window.innerWidth);
        if (next !== w) assistantWidthRef.current = next;
        return next;
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const endResizeDrag = useCallback(() => {
    resizeDragRef.current = { phase: "idle", startX: 0, startW: 0 };
    setResizeMaskActive(false);
    document.body.style.userSelect = "";
    try {
      localStorage.setItem(ASSISTANT_WIDTH_STORAGE_KEY, String(assistantWidthRef.current));
    } catch {
      /* ignore */
    }
  }, []);

  const onResizeMaskPointerMove = useCallback((e) => {
    e.preventDefault();
    const d = resizeDragRef.current;
    if (d.phase === "idle") return;
    const dx = d.startX - e.clientX;
    if (d.phase === "pending") {
      if (Math.abs(dx) < RESIZE_DRAG_COMMIT_PX) return;
      d.phase = "dragging";
    }
    const next = clampAssistantWidth(d.startW + dx, window.innerWidth);
    assistantWidthRef.current = next;
    setAssistantWidth(next);
  }, []);

  const onResizeMaskPointerEnd = useCallback(
    (e) => {
      e.preventDefault();
      endResizeDrag();
    },
    [endResizeDrag]
  );

  const onSplitterPointerDown = useCallback(
    (e) => {
      if (!isXlLayout) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      resizeDragRef.current = {
        phase: "pending",
        startX: e.clientX,
        startW: assistantWidthRef.current,
      };
      document.body.style.userSelect = "none";
      flushSync(() => setResizeMaskActive(true));
    },
    [isXlLayout]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await fetchZimStatus();
        if (cancelled) return;
        setZimAvailable(!!s.available);
        setZimFile(s.file || null);
        setUseKiwixViewer(!!s.kiwix_viewer_ready);
        setZimDiag({
          directory: s.directory,
          zim_files_on_disk: s.zim_files_on_disk,
          candidates_tried: s.candidates_tried,
        });
      } catch {
        if (!cancelled) {
          setZimAvailable(false);
          setZimFile(null);
          setUseKiwixViewer(false);
          setZimDiag({});
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshArticleSource = useCallback(async (apiKey) => {
    try {
      const data = await fetchZimArticle(apiKey);
      if (!data.ok) {
        setArticleSourceHtml("");
        setFullArticlePlain("");
        return;
      }
      const wrap = data.html || "";
      const inner = wrap.includes("mw-parser-output")
        ? wrap
        : `<div class="mw-parser-output">${wrap}</div>`;
      setArticleSourceHtml(inner);
      setFullArticlePlain(wikiFullArticlePlain(inner));
    } catch {
      setArticleSourceHtml("");
      setFullArticlePlain("");
    }
  }, []);

  const syncTextSelectFromKiwixReader = useCallback(async () => {
    const fragment = tryReadKiwixViewerFragmentFromIframe(kiwixIframeRef.current);
    if (fragment) {
      try {
        const data = await fetchArticleByKiwixFragment(fragment);
        if (data.ok && data.html) {
          const wrap = data.html.includes("mw-parser-output")
            ? data.html
            : `<div class="mw-parser-output">${data.html}</div>`;
          setArticleSourceHtml(wrap);
          setFullArticlePlain(wikiFullArticlePlain(wrap));
          const { apiKey, label } = toApiKeyAndLabel(data.title);
          setCurrentTitle(label);
          setCurrentApiKey(apiKey);
          setNav((n) => {
            const i = n.index;
            const ent = n.entries[i];
            if (ent?.apiKey === apiKey && ent?.label === label) return n;
            const entries = n.entries.slice();
            entries[i] = { apiKey, label };
            return { ...n, entries };
          });
          /* Keep Reader URL aligned with the in-viewer page so remounting the iframe does not jump to an old title. */
          setIframeSrc(`/api/zim/kiwix-frame/viewer#${fragment}`);
          return;
        }
      } catch {
        /* fall through */
      }
    }
    await refreshArticleSource(currentApiKey);
  }, [currentApiKey, refreshArticleSource]);

  const loadArticleContentOnly = useCallback(
    async (apiKey, label) => {
      if (!zimAvailable) return;
      setArticleLoading(true);
      setArticleError("");
      setCurrentApiKey(apiKey);
      setCurrentTitle(label);
      setSnippetArmed(false);
      setPendingSnippet("");
      openedTextTabForSnippetRef.current = false;

      if (useKiwixViewer) {
        setBodyHtml("");
        try {
          const titleParam = apiKey === "" ? "Main page" : apiKey;
          const data = await fetchKiwixViewerUrl(titleParam);
          if (!data.ok) {
            if (data.error === "not_found") {
              setArticleError(`No article titled “${label}” in this ZIM file.`);
            } else {
              setArticleError(data.detail || "Could not open the Kiwix viewer.");
            }
            setIframeSrc("");
            setArticleSourceHtml("");
            return;
          }
          setIframeSrc(data.proxied_src || data.url);
        } catch {
          setArticleError("Could not open the Kiwix viewer.");
          setIframeSrc("");
        } finally {
          setArticleLoading(false);
        }
        await refreshArticleSource(apiKey);
        return;
      }

      try {
        const data = await fetchZimArticle(apiKey);
        if (!data.ok) {
          if (data.error === "not_found") {
            setArticleError(`No article titled “${label}” in this ZIM file.`);
          } else {
            setArticleError("Could not load this page.");
          }
          setBodyHtml("");
          setIframeSrc("");
          setArticleSourceHtml("");
          return;
        }
        const html = data.html || "";
        setBodyHtml(html);
        setIframeSrc("");
        setCurrentTitle(data.title || label);
        const wrapped =
          html.includes("mw-parser-output") ? html : `<div class="mw-parser-output">${html}</div>`;
        setArticleSourceHtml(wrapped);
        setFullArticlePlain(wikiFullArticlePlain(wrapped));
      } catch {
        setArticleError("Could not load this page.");
        setBodyHtml("");
        setIframeSrc("");
        setArticleSourceHtml("");
      } finally {
        setArticleLoading(false);
      }
    },
    [zimAvailable, useKiwixViewer, refreshArticleSource]
  );

  const pushNavAndLoad = useCallback(
    (apiKey, label) => {
      setNav((n) => {
        const base = n.entries.slice(0, n.index + 1);
        const last = base[base.length - 1];
        if (last.apiKey === apiKey) return n;
        return { entries: [...base, { apiKey, label }], index: base.length };
      });
      loadArticleContentOnly(apiKey, label);
    },
    [loadArticleContentOnly]
  );

  useEffect(() => {
    if (!initialZimTitle?.trim()) return;
    if (zimAvailable !== true) return;
    const { apiKey, label } = toApiKeyAndLabel(initialZimTitle.trim());
    pushNavAndLoad(apiKey, label);
    onInitialZimConsumed?.();
  }, [initialZimTitle, zimAvailable, pushNavAndLoad, onInitialZimConsumed]);

  useEffect(() => {
    if (zimAvailable === false) {
      zimInitialArticleLoadedRef.current = false;
      setArticleLoading(false);
      setBodyHtml("");
      setIframeSrc("");
      setArticleSourceHtml("");
      return;
    }
    if (zimAvailable !== true) return;
    if (zimInitialArticleLoadedRef.current) return;
    zimInitialArticleLoadedRef.current = true;
    loadArticleContentOnly("", "Main page");
  }, [zimAvailable, loadArticleContentOnly]);

  const goBack = useCallback(() => {
    setNav((n) => {
      if (n.index <= 0) return n;
      const i = n.index - 1;
      const e = n.entries[i];
      queueMicrotask(() => loadArticleContentOnly(e.apiKey, e.label));
      return { ...n, index: i };
    });
  }, [loadArticleContentOnly]);

  const goForward = useCallback(() => {
    setNav((n) => {
      if (n.index >= n.entries.length - 1) return n;
      const i = n.index + 1;
      const e = n.entries[i];
      queueMicrotask(() => loadArticleContentOnly(e.apiKey, e.label));
      return { ...n, index: i };
    });
  }, [loadArticleContentOnly]);

  const runSearch = useCallback(
    async (q) => {
      if (!zimAvailable) return;
      const term = q.trim();
      if (term.length < 1) {
        setResults([]);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const data = await fetchZimSearch(term, 20);
        if (!data.available) {
          setResults([]);
          return;
        }
        setResults(data.results || []);
      } catch {
        setError("Search failed.");
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [zimAvailable]
  );

  useEffect(() => {
    if (zimAvailable !== true) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 280);
    return () => clearTimeout(debounceRef.current);
  }, [query, runSearch, zimAvailable]);

  const openArticle = (title) => {
    const { apiKey, label } = toApiKeyAndLabel(title);
    pushNavAndLoad(apiKey, label);
    setResults([]);
    setQuery("");
  };

  const openOnWikipedia = () => {
    const enc = encodeURIComponent(currentTitle.replace(/ /g, "_"));
    window.open(`https://en.wikipedia.org/wiki/${enc}`, "_blank", "noopener,noreferrer");
  };

  const openKiwixInNewTab = () => {
    if (iframeSrc) window.open(iframeSrc, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    const onMouseUp = () => {
      if (!snippetArmed || !textSelectRef.current) return;
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      const anchor = sel.anchorNode;
      const node = anchor?.nodeType === Node.TEXT_NODE ? anchor.parentElement : anchor;
      if (!node || !textSelectRef.current.contains(node)) return;
      const text = sel.toString().trim();
      if (text.length < 2) return;
      setSnippetArmed(false);
      /* Stay on Text & select after capture — switching to Reader remounts the iframe and reloads stale iframeSrc (e.g. Main/Landing). */
      if (openedTextTabForSnippetRef.current) {
        openedTextTabForSnippetRef.current = false;
      }
      setPendingSnippet(text.slice(0, MAX_CTX));
      try {
        sel.removeAllRanges();
      } catch {
        /* ignore */
      }
      requestAnimationFrame(() => {
        composerTextareaRef.current?.focus();
      });
    };
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, [snippetArmed]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (useKiwixViewer && centerTab === "reader") {
      setSnippetArmed(false);
      openedTextTabForSnippetRef.current = false;
    }
  }, [useKiwixViewer, centerTab]);

  useEffect(() => {
    if (!snippetArmed) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (openedTextTabForSnippetRef.current) {
          openedTextTabForSnippetRef.current = false;
          setCenterTab("reader");
        }
        setSnippetArmed(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [snippetArmed]);

  useEffect(() => {
    if (chatLanguage === "auto") setChatLanguage("en");
  }, [chatLanguage, setChatLanguage]);

  const sendMessage = useCallback(
    async (textOverride) => {
      const typed = (textOverride ?? input).trim();
      const snippetSnap = pendingSnippet.trim();
      const tSend = wikipediaExplorerUiStrings(chatLanguage === "auto" ? "en" : chatLanguage);
      const messageForApi = typed || (snippetSnap ? tSend.defaultAskAboutSnippet : "");
      if (!messageForApi || isLoading) return;

      const userBubble = typed || tSend.userMessageSnippetOnly;
      const userMsg = {
        role: "user",
        content: userBubble,
        timestamp: new Date().toISOString(),
        used_library: false,
      };
      setMessages((m) => [...m, userMsg]);
      setInput("");
      setPendingSnippet("");
      setIsLoading(true);

      const kiwixReaderUnsynced = useKiwixViewer && centerTab === "reader";
      const fromTextarea = extractComposerSnippetForContext(typed) || "";
      const fromBanner = snippetSnap.slice(0, MAX_CTX);
      const selectionMerged = [fromBanner, fromTextarea].filter(Boolean).join("\n\n").slice(0, MAX_CTX);
      const selectionFromComposer = selectionMerged || undefined;

      const readingBlock = buildWikiAssistantContext({
        articleTitle: currentTitle,
        selection: kiwixReaderUnsynced ? undefined : selectionFromComposer,
        sectionHeading: undefined,
        sectionText: undefined,
        fullPlain: kiwixReaderUnsynced ? "" : fullArticlePlain,
        includeFullArticle: false,
        kiwixReaderUnsynced,
      });

      let reply = "";
      try {
        const lp = getLearnerProfileForApi();
        const res = await ustud.chat({
          message: messageForApi,
          lesson_context: readingBlock,
          response_language: chatLanguage,
          tutor_mode: "reading",
          ...(lp ? { learner_profile: lp } : {}),
        });
        reply = res.response || tSend.chatNoResponse;
      } catch {
        reply = tSend.chatCouldNotReach;
      }

      setMessages((m) => [
        ...m,
        { role: "assistant", content: reply, timestamp: new Date().toISOString(), used_library: false },
      ]);
      setIsLoading(false);
    },
    [centerTab, chatLanguage, currentTitle, fullArticlePlain, input, isLoading, pendingSnippet, useKiwixViewer]
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSnippetToolClick = () => {
    if (useKiwixViewer && centerTab === "reader") {
      openedTextTabForSnippetRef.current = true;
      setCenterTab("text");
      setSnippetArmed(true);
      void syncTextSelectFromKiwixReader();
      return;
    }
    if (snippetArmed) {
      setSnippetArmed(false);
      if (openedTextTabForSnippetRef.current) {
        openedTextTabForSnippetRef.current = false;
        setCenterTab("reader");
      }
      return;
    }
    setSnippetArmed(true);
  };

  const handleComposerPaste = useCallback((e) => {
    const t = wikipediaExplorerUiStrings(chatLanguage === "auto" ? "en" : chatLanguage);
    const items = e.clipboardData?.items;
    if (!items?.length) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file" && item.type.startsWith("image/")) {
        e.preventDefault();
        const block = `${t.snippetPasteHeader}\n"""\n${t.snippetPasteInner}\n"""\n\n`;
        setInput((prev) => (prev.trim() ? `${prev.trim()}\n\n${block}` : block));
        requestAnimationFrame(() => composerTextareaRef.current?.focus());
        return;
      }
    }
  }, [chatLanguage]);

  const canBack = nav.index > 0;
  const canForward = nav.index < nav.entries.length - 1;
  const showTextTab = useKiwixViewer;
  const textHtmlForSelect = useKiwixViewer ? articleSourceHtml : bodyHtml;
  const wrappedTextHtml =
    textHtmlForSelect && !textHtmlForSelect.includes("mw-parser-output")
      ? `<div class="mw-parser-output">${textHtmlForSelect}</div>`
      : textHtmlForSelect;

  const uiLang = chatLanguage === "auto" ? "en" : chatLanguage;
  const ui = wikipediaExplorerUiStrings(uiLang);

  if (zimAvailable === null) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-2" dir={ui.dir}>
        <Loader2 className="w-5 h-5 animate-spin" />
        {ui.checkingLibrary}
      </div>
    );
  }

  if (zimAvailable === false) {
    const onDisk = zimDiag.zim_files_on_disk || [];
    const hasFiles = onDisk.length > 0;
    return (
      <div className="border border-amber-200 bg-amber-50 rounded-md p-6 text-sm text-amber-950" dir={ui.dir}>
        <div className="flex items-start gap-3">
          <WifiOff className="w-6 h-6 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-2">
              {hasFiles ? ui.noZimTitleHasFiles : ui.noZimTitleEmpty}
            </p>
            {hasFiles ? (
              <p className="text-amber-900/90 mb-3">{ui.noZimBodyHasFiles}</p>
            ) : (
              <p className="text-amber-900/90 mb-3">{ui.noZimBodyEmpty}</p>
            )}
            {zimDiag.directory && (
              <p className="text-xs text-muted-foreground mb-2">
                {ui.folderLabel}{" "}
                <code className="bg-white/80 px-1 rounded break-all">{zimDiag.directory}</code>
              </p>
            )}
            {hasFiles && (
              <ul className="text-xs list-disc pl-5 mb-3 text-amber-900/80 space-y-0.5">
                {onDisk.map((n) => (
                  <li key={n}>
                    <code className="bg-white/70 px-1 rounded">{n}</code>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">
              <a className="text-[#0645ad] underline" href="https://download.kiwix.org/zim/wikipedia/" target="_blank" rel="noopener noreferrer">
                {ui.downloadLink}
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="flex flex-col xl:flex-row flex-1 min-h-0 h-full w-full bg-white text-[#202122] [color-scheme:light] overflow-hidden">
      {!useKiwixViewer && <style>{WIKI_SKIN_CSS}</style>}

      <aside
        className="w-full xl:w-64 2xl:w-72 shrink-0 border-b xl:border-b-0 xl:border-r border-[#e5e5e5] bg-[#fafafa] flex flex-col gap-3 p-3 overflow-y-auto max-h-[36vh] xl:max-h-none"
        dir={ui.dir}
      >
        <div>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-lg font-serif font-semibold tracking-tight text-[#202122]">{ui.wikipedia}</span>
            <span className="text-[10px] text-[#666] uppercase tracking-wider">
              {useKiwixViewer ? ui.offline : ui.preview}
            </span>
          </div>
          {zimFile && (
            <p className="text-[10px] text-muted-foreground mt-1 break-all leading-snug" title={zimFile}>
              {zimFile}
            </p>
          )}
        </div>

        {!useKiwixViewer && (
          <div className="text-[11px] border border-amber-200 bg-amber-50 text-amber-950 rounded-md p-2 leading-snug">
            <p className="font-medium mb-0.5">{ui.previewModeTitle}</p>
            <p className="text-amber-900/95">
              {ui.previewModeBodyBefore}{" "}
              <a className="text-[#0645ad] underline" href="https://download.kiwix.org/release/kiwix-tools/" target="_blank" rel="noreferrer">
                kiwix-tools
              </a>{" "}
              {ui.previewModeBodyAfter}
            </p>
          </div>
        )}

        {useKiwixViewer && <p className="text-[10px] text-muted-foreground leading-snug">{ui.kiwixHint}</p>}

        <div className="flex gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={ui.searchPlaceholder}
              className="pl-8 h-9 text-sm bg-white border-[#d0d7de]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && results[0]) openArticle(results[0].title);
              }}
            />
          </div>
          <Button type="button" variant="secondary" className="h-9 shrink-0 px-3" disabled={loading || !query.trim()} onClick={() => runSearch(query)}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : ui.go}
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error === "Search failed." ? ui.searchFailed : error}</p>}
        {results.length > 0 && (
          <ul className="flex-1 min-h-0 max-h-40 xl:max-h-[min(42vh,24rem)] overflow-y-auto border border-[#e5e5e5] rounded-md bg-white divide-y divide-[#eee] text-xs">
            {results.map((r) => (
              <li key={r.title}>
                <button
                  type="button"
                  className="w-full text-left px-2.5 py-2 hover:bg-[#f5f5f5] transition-colors"
                  onClick={() => openArticle(r.title)}
                >
                  <span className="font-medium text-[#0645ad]">{r.title.replace(/_/g, " ")}</span>
                  {r.snippet && <span className="block text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{r.snippet}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto pt-2 border-t border-[#e5e5e5] space-y-2">
          <div className="flex flex-col gap-1.5">
            {useKiwixViewer && iframeSrc && (
              <Button type="button" variant="outline" size="sm" className="h-8 gap-2 w-full justify-start text-xs" onClick={openKiwixInNewTab}>
                <Maximize2 className="w-3.5 h-3.5" />
                {ui.readerNewTab}
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" className="h-8 gap-2 w-full justify-start text-xs" onClick={openOnWikipedia}>
              <ExternalLink className="w-3.5 h-3.5" />
              {ui.wikipediaOrg}
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 min-w-0 min-h-0 flex-col xl:flex-row overflow-hidden">
        <div className="flex flex-1 min-w-0 min-h-0 flex-col relative">
        <div
          className="flex-1 min-w-0 min-h-0 flex flex-col bg-white border-b xl:border-b-0 border-[#e5e5e5] overflow-hidden"
          dir="ltr"
        >
          <div className="shrink-0 flex flex-wrap items-center gap-2 px-3 py-2 border-b border-[#e5e5e5] bg-white">
          <Button type="button" variant="outline" size="sm" className="h-8 px-2" disabled={!canBack} onClick={goBack} title={ui.back}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-8 px-2" disabled={!canForward} onClick={goForward} title={ui.forward}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-sm font-semibold text-[#202122] truncate flex-1 min-w-[8rem]">{currentTitle}</span>
          {showTextTab && (
            <div className="flex rounded-md border border-[#d0d7de] overflow-hidden text-[10px]">
              <button
                type="button"
                className={`px-2.5 py-1.5 font-medium uppercase tracking-wider ${centerTab === "reader" ? "bg-black text-white" : "bg-white text-[#333] hover:bg-[#f5f5f5]"}`}
                onClick={() => {
                  openedTextTabForSnippetRef.current = false;
                  setCenterTab("reader");
                }}
              >
                {ui.readerTab}
              </button>
              <button
                type="button"
                className={`px-2.5 py-1.5 font-medium uppercase tracking-wider border-l border-[#d0d7de] ${centerTab === "text" ? "bg-black text-white" : "bg-white text-[#333] hover:bg-[#f5f5f5]"}`}
                onClick={() => {
                  openedTextTabForSnippetRef.current = false;
                  setCenterTab("text");
                  if (useKiwixViewer) void syncTextSelectFromKiwixReader();
                }}
              >
                {ui.textSelectTab}
              </button>
            </div>
          )}
          </div>

          <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-white">
          {articleLoading && (
            <div className="flex flex-1 items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              {ui.loading}
            </div>
          )}
          {!articleLoading && articleError && (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-muted-foreground">
              <div>
                <p className="text-destructive mb-2">{articleError}</p>
                <Button variant="outline" size="sm" onClick={() => loadArticleContentOnly(currentApiKey, currentTitle)}>
                  {ui.retry}
                </Button>
              </div>
            </div>
          )}
          {!articleLoading && !articleError && useKiwixViewer && iframeSrc && centerTab === "reader" && (
            <iframe
              ref={kiwixIframeRef}
              key={iframeSrc}
              title={ui.iframeKiwixTitle}
              src={iframeSrc}
              className="w-full flex-1 min-h-[40vh] xl:min-h-0 border-0 bg-white"
              allow="fullscreen"
              referrerPolicy="no-referrer"
            />
          )}
          {!articleLoading &&
            !articleError &&
            useKiwixViewer &&
            centerTab === "text" &&
            wrappedTextHtml && (
              <div
                ref={textSelectRef}
                className="wiki-parse flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 bg-white text-[#202122] select-text cursor-text"
                dangerouslySetInnerHTML={{ __html: wrappedTextHtml }}
              />
            )}
          {!articleLoading && !articleError && !useKiwixViewer && bodyHtml && (
            <div
              ref={textSelectRef}
              className="wiki-parse flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 bg-white text-[#202122] select-text cursor-text"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
              onClick={(e) => {
                const a = e.target.closest("a");
                if (!a) return;
                const href = a.getAttribute("href");
                if (!href) return;
                if (href.startsWith("/api/zim/raw/")) return;
                const internal = titleFromZimHref(href);
                if (internal) {
                  e.preventDefault();
                  const { apiKey, label } = toApiKeyAndLabel(internal);
                  pushNavAndLoad(apiKey, label);
                  return;
                }
                if (href.startsWith("http")) {
                  e.preventDefault();
                  window.open(href, "_blank", "noopener,noreferrer");
                }
              }}
            />
          )}
          {!useKiwixViewer && !articleLoading && !articleError && bodyHtml && (
            <p className="shrink-0 text-[10px] text-muted-foreground px-4 py-2 border-t border-[#eee] bg-white">
              {ui.ccFooter}
            </p>
          )}
          </div>
        </div>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={ui.resizeSplitter}
          className="hidden xl:flex xl:absolute xl:z-30 xl:top-0 xl:bottom-0 w-3 cursor-col-resize select-none touch-none flex-col items-center justify-stretch border-l border-[#e5e5e5] bg-[#f0f0f0] hover:bg-[#e5e5e5] active:bg-[#ddd]"
          style={isXlLayout ? { right: assistantWidth } : undefined}
          onPointerDown={onSplitterPointerDown}
        >
          <div className="flex-1 w-px my-1 rounded-full bg-[#bbb] hover:bg-[#333] pointer-events-none" title={ui.resizeHandle} />
        </div>

        <div
          className="w-full flex flex-col bg-[#fafafa] border-t-2 xl:border-t-0 xl:border-l-2 border-black min-h-0 shrink-0 max-h-[50vh] xl:max-h-none xl:h-full xl:absolute xl:top-0 xl:right-0 xl:z-20 xl:shadow-[-10px_0_36px_rgba(0,0,0,0.12)] overflow-hidden"
          style={isXlLayout ? { width: assistantWidth, minWidth: MIN_ASSISTANT_WIDTH } : undefined}
          dir={ui.dir}
        >
          <div className="px-3 py-2.5 border-b-2 border-black bg-white flex-shrink-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <BookOpen className="w-4 h-4 text-[#333] flex-shrink-0" />
                <h2 className="font-bold text-xs uppercase tracking-widest truncate">{ui.readingAssistant}</h2>
              </div>
              <ChatLanguageToggle
                value={chatLanguage}
                onChange={setChatLanguage}
                compact
                className="flex-shrink-0"
                modes={["en", "fa", "ps"]}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-2 min-h-0">
          {messages.length === 0 && !isLoading && (
            <p className="text-xs text-[#999] py-4 text-center px-2">{ui.chatEmptyHint}</p>
          )}
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} isLoading={false} usedLibraryLabel={ui.chatUsedLibrary} />
            ))}
          </AnimatePresence>
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 py-3">
              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 border bg-[#f5f5f5] border-[#e5e5e5]">
                <span className="text-xs">…</span>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
          </div>

          <div className="p-2.5 border-t-2 border-black bg-white flex-shrink-0 space-y-2">
            <Button
              type="button"
              variant={snippetArmed ? "default" : "outline"}
              size="sm"
              disabled={articleLoading || !!articleError}
              className={`w-full h-9 gap-2 text-xs font-600 uppercase tracking-wider ${snippetArmed ? "bg-black text-white hover:bg-black/90" : ""}`}
              onClick={handleSnippetToolClick}
              title={
                useKiwixViewer && centerTab === "reader" ? ui.snippetTitleReader : ui.snippetTitleDefault
              }
            >
              <TextQuote className="w-4 h-4 shrink-0" />
              {snippetArmed
                ? ui.snippetSelectInArticle
                : useKiwixViewer && centerTab === "reader"
                  ? ui.snippetOpenTextSelect
                  : ui.snippetFromArticle}
            </Button>
            {pendingSnippet.trim() ? (
              <div
                className="flex items-center gap-2 rounded border border-[#ccc] bg-[#f0f0f0] px-2.5 py-2 text-xs text-[#333]"
                role="status"
              >
                <span className="min-w-0 flex-1 truncate font-medium">{ui.snippetAttachedBanner}</span>
                <button
                  type="button"
                  aria-label={ui.snippetRemoveAria}
                  className="shrink-0 flex h-7 w-7 items-center justify-center rounded border border-transparent text-[#555] hover:bg-black/5 hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-black"
                  onClick={() => setPendingSnippet("")}
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
            ) : null}
            <Textarea
              ref={composerTextareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handleComposerPaste}
              placeholder={ui.composerPlaceholder}
              className="resize-none min-h-[72px] w-full bg-white border border-[#cccccc] text-xs focus:border-black"
              rows={1}
            />
            <p className="text-[9px] text-[#888] leading-snug">{ui.composerFooter}</p>
          </div>
        </div>
        </div>
      </div>
    </div>
    {resizeMaskActive &&
      typeof document !== "undefined" &&
      createPortal(
        <div
          className="fixed inset-0 z-[2147483646] cursor-col-resize touch-none"
          style={{ background: "transparent" }}
          onPointerMove={onResizeMaskPointerMove}
          onPointerDown={(ev) => ev.preventDefault()}
          onPointerUp={onResizeMaskPointerEnd}
          onPointerCancel={onResizeMaskPointerEnd}
        />,
        document.body
      )}
    </>
  );
}
