import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Send,
  X,
  Highlighter,
  BookOpen,
  Globe,
  FileText,
  BookMarked,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Square,
  StickyNote,
  Loader2,
  ExternalLink,
  Search,
  Printer,
  Download,
  MousePointer2,
  Trash2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { ustud } from "@/api/ustudClient";
import ChatMessage from "@/components/chat/ChatMessage";
import ChatLanguageToggle from "@/components/chat/ChatLanguageToggle";
import PdfReader from "./PdfReader";
import { PdfRegionLayer, PdfAnnotationMarkers } from "./PdfPageTools";
import { getLearnerProfileForApi } from "@/lib/learnerProfile";
import { useAutosizeTextarea } from "@/hooks/useAutosizeTextarea";
import { useChatLanguage } from "@/hooks/useChatLanguage";
import {
  extractTextPageRange,
  domRectToPdfRect,
  clientRectUnionRelativeToPage,
} from "@/lib/pdfContext";
import { loadAnnotations, saveAnnotations } from "@/lib/pdfAnnotationsStorage";
import { toast } from "@/components/ui/use-toast";

const FILE_TYPE_ICONS = {
  wikipedia: Globe,
  pdf: FileText,
  book: BookMarked,
  text: BookOpen,
};

const MAX_EXCERPT = 8000;
const MAX_PAGE_RANGE_IN_CHAT = 11000;

function buildReadingContext({
  article,
  selection,
  page,
  numPages,
  searchNote,
  pageRangeLabel,
  pageRangeText,
  regionSnippet,
  regionPage,
}) {
  const parts = [
    "The student is reading in the UStud library viewer.",
    `Document title: "${article.title}"`,
    article.subject_name && `Course / subject: ${article.subject_name}`,
    article.summary && `Summary: ${article.summary}`,
    page != null && `They are viewing PDF page ${page}${numPages ? ` of ${numPages}` : ""}.`,
    pageRangeLabel &&
      pageRangeText &&
      `They loaded this page range for context (${pageRangeLabel}):\n"""${pageRangeText.slice(0, MAX_PAGE_RANGE_IN_CHAT)}${pageRangeText.length > MAX_PAGE_RANGE_IN_CHAT ? "\n…" : ""}"""`,
    regionSnippet &&
      `They drew a region on PDF page ${regionPage ?? page} and extracted this text:\n"""${regionSnippet.slice(0, MAX_EXCERPT)}${regionSnippet.length > MAX_EXCERPT ? "\n…" : ""}"""`,
    selection &&
      `They selected this excerpt (focus your answer on it):\n"""${selection.slice(0, MAX_EXCERPT)}${selection.length > MAX_EXCERPT ? "\n…" : ""}"""`,
    searchNote,
  ];
  return parts.filter(Boolean).join("\n\n");
}

function persistAnnotations(article, highlights, notes) {
  saveAnnotations(article, { highlights, notes });
}

export default function ReadingRoom({ article, onBack }) {
  const readerRef = useRef(null);
  const pdfWrapRef = useRef(null);
  const pdfReaderRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatComposerRef = useRef(null);

  const [pdfPage, setPdfPage] = useState(1);
  const [pdfNumPages, setPdfNumPages] = useState(null);
  const [pdfWidth, setPdfWidth] = useState(720);
  const [pdfScale, setPdfScale] = useState(1);
  const [pdfRotation, setPdfRotation] = useState(0);
  const [pdfIndexProgress, setPdfIndexProgress] = useState(null);
  const [pageJumpDraft, setPageJumpDraft] = useState("");
  const [pageJumpFocused, setPageJumpFocused] = useState(false);

  const [pdfDoc, setPdfDoc] = useState(null);
  const [readerTool, setReaderTool] = useState("default");

  const [contextFromDraft, setContextFromDraft] = useState("1");
  const [contextToDraft, setContextToDraft] = useState("1");
  const [contextPageRangeLabel, setContextPageRangeLabel] = useState("");
  const [contextPageRangeText, setContextPageRangeText] = useState("");
  const [pageRangeLoading, setPageRangeLoading] = useState(false);

  const [contextRegionText, setContextRegionText] = useState("");
  const [contextRegionPage, setContextRegionPage] = useState(null);

  const [highlights, setHighlights] = useState([]);
  const [notes, setNotes] = useState([]);

  const [notePlacementDraft, setNotePlacementDraft] = useState(null);
  const [noteBodyDraft, setNoteBodyDraft] = useState("");

  const notesRef = useRef(notes);
  const highlightsRef = useRef(highlights);
  notesRef.current = notes;
  highlightsRef.current = highlights;

  const effectivePdfPages = pdfNumPages ?? pdfIndexProgress?.total ?? null;

  const pageWidthPx = useMemo(
    () => Math.max(240, Math.min(pdfWidth, 900)) * pdfScale,
    [pdfWidth, pdfScale]
  );

  const onPdfLoadFailed = useCallback(() => {
    toast({
      title: "Could not load PDF",
      description: "Check that the UStud API is running and the file exists in your Library folder.",
      variant: "destructive",
    });
  }, []);

  const [selection, setSelection] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [librarySearch, setLibrarySearch] = useState(false);
  const [chatLanguage, setChatLanguage] = useChatLanguage();
  useAutosizeTextarea(chatComposerRef, input, { minHeight: 52, maxHeight: 120 });

  const Icon = FILE_TYPE_ICONS[article.file_type] || BookOpen;

  const articleKey = article.id || article.file_url || article.title || "";

  useEffect(() => {
    setPdfScale(1);
    setPdfRotation(0);
    setPdfPage(1);
    setPdfNumPages(null);
    setPdfIndexProgress(null);
    setPageJumpDraft("");
    setPageJumpFocused(false);
    setPdfDoc(null);
    setReaderTool("default");
    setContextPageRangeLabel("");
    setContextPageRangeText("");
    setContextRegionText("");
    setContextRegionPage(null);
    setContextFromDraft("1");
    setContextToDraft("1");
    const loaded = loadAnnotations(article);
    setHighlights(loaded.highlights);
    setNotes(loaded.notes);
  }, [articleKey]);

  useEffect(() => {
    if (!pageJumpFocused) setPageJumpDraft(effectivePdfPages ? String(pdfPage) : "");
  }, [pdfPage, effectivePdfPages, pageJumpFocused]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const el = pdfWrapRef.current;
    if (!el || article.file_type !== "pdf") return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        setPdfWidth(Math.max(240, e.contentRect.width - 8));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [article.file_type, articleKey]);

  useEffect(() => {
    const onMouseUp = () => {
      if (readerTool === "region") return;
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !readerRef.current) return;
      const anchor = sel.anchorNode;
      if (!anchor) return;
      const node = anchor.nodeType === Node.TEXT_NODE ? anchor.parentElement : anchor;
      if (!node || !readerRef.current.contains(node)) return;
      const text = sel.toString().trim();
      if (text.length >= 2) setSelection(text);
    };
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, [readerTool]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = useCallback(
    async (textOverride) => {
      const text = (textOverride ?? input).trim();
      if (!text || isLoading) return;
      const userMsg = { role: "user", content: text, timestamp: new Date().toISOString(), used_library: false };
      setMessages((m) => [...m, userMsg]);
      setInput("");
      setIsLoading(true);

      let searchContext = "";
      let usedLibrary = false;
      if (librarySearch) {
        try {
          const sr = await ustud.search(text, true);
          usedLibrary = !!(sr.results?.length || sr.synthesis);
          const parts = [];
          if (sr.synthesis) parts.push(`Reference search summary:\n${sr.synthesis}`);
          for (const r of (sr.results || []).slice(0, 5)) {
            parts.push(`[${r.source || "Source"}] ${r.title || ""}\n${r.snippet || r.content || ""}`);
          }
          searchContext = parts.join("\n\n").trim();
        } catch {
          searchContext = "";
        }
      }

      const readingBlock = buildReadingContext({
        article,
        selection: selection || undefined,
        page: article.file_type === "pdf" && article.file_url ? pdfPage : undefined,
        numPages: article.file_type === "pdf" && article.file_url ? pdfNumPages || undefined : undefined,
        searchNote: searchContext || undefined,
        pageRangeLabel: contextPageRangeLabel || undefined,
        pageRangeText: contextPageRangeText || undefined,
        regionSnippet: contextRegionText || undefined,
        regionPage: contextRegionPage,
      });

      let reply = "";
      try {
        const lp = getLearnerProfileForApi();
        const res = await ustud.chat({
          message: text,
          lesson_context: readingBlock,
          module_id: article._moduleId || undefined,
          lesson_id: article._lessonId || undefined,
          response_language: chatLanguage,
          tutor_mode: "reading",
          ...(lp ? { learner_profile: lp } : {}),
        });
        reply = res.response || "No response.";
      } catch {
        reply = "Could not reach the assistant. Is UStud running and Ollama available?";
      }

      setMessages((m) => [
        ...m,
        { role: "assistant", content: reply, timestamp: new Date().toISOString(), used_library: usedLibrary },
      ]);
      setIsLoading(false);
    },
    [
      article,
      chatLanguage,
      contextPageRangeLabel,
      contextPageRangeText,
      contextRegionPage,
      contextRegionText,
      input,
      isLoading,
      librarySearch,
      pdfNumPages,
      pdfPage,
      selection,
    ]
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const explainSelection = () => {
    if (!selection.trim()) return;
    sendMessage(
      "Explain the selected passage in simple terms, tied to this document. If it helps, add one short **Bigger picture:** sentence on how this idea fits the wider subject."
    );
  };

  const goToPdfPage = useCallback(() => {
    if (!effectivePdfPages) return;
    const raw = pageJumpDraft.trim();
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) return;
    const clamped = Math.min(effectivePdfPages, Math.max(1, n));
    setPageJumpDraft(String(clamped));
    pdfReaderRef.current?.scrollToPage(clamped);
    setPdfPage(clamped);
  }, [pageJumpDraft, effectivePdfPages]);

  const loadPageRangeContext = useCallback(async () => {
    const doc = pdfDoc || pdfReaderRef.current?.getPdf?.();
    if (!doc || !effectivePdfPages) {
      toast({ title: "PDF not ready", variant: "destructive" });
      return;
    }
    const from = parseInt(contextFromDraft, 10);
    const to = parseInt(contextToDraft, 10);
    if (Number.isNaN(from) || Number.isNaN(to)) {
      toast({ title: "Enter valid page numbers", variant: "destructive" });
      return;
    }
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    if (lo < 1 || hi > effectivePdfPages) {
      toast({ title: `Pages must be 1–${effectivePdfPages}`, variant: "destructive" });
      return;
    }
    setPageRangeLoading(true);
    try {
      const text = await extractTextPageRange(doc, lo, hi);
      setContextPageRangeText(text);
      setContextPageRangeLabel(`Pages ${lo}–${hi}`);
      toast({ title: "Page range added to assistant context" });
    } catch (err) {
      toast({
        title: "Could not extract pages",
        description: err?.message || String(err),
        variant: "destructive",
      });
    } finally {
      setPageRangeLoading(false);
    }
  }, [pdfDoc, effectivePdfPages, contextFromDraft, contextToDraft]);

  const saveHighlightFromSelection = useCallback(async () => {
    const doc = pdfDoc || pdfReaderRef.current?.getPdf?.();
    const sel = window.getSelection();
    if (!doc || !sel || sel.isCollapsed || !readerRef.current) return;
    const anchor = sel.anchorNode;
    const node = anchor?.nodeType === Node.TEXT_NODE ? anchor.parentElement : anchor;
    const pageEl = node?.closest?.("[data-page-number]");
    if (!pageEl || !readerRef.current.contains(pageEl)) {
      toast({ title: "Select text on the PDF first", variant: "destructive" });
      return;
    }
    const pn = parseInt(pageEl.getAttribute("data-page-number"), 10);
    if (Number.isNaN(pn)) return;
    const range = sel.getRangeAt(0);
    const rects = range.getClientRects();
    const rel = clientRectUnionRelativeToPage(pageEl, rects);
    if (!rel) return;
    try {
      const page = await doc.getPage(pn);
      const pdfRect = domRectToPdfRect(page, pageWidthPx, pdfRotation, rel);
      const quote = sel.toString().trim().slice(0, 500);
      const hl = {
        id: crypto.randomUUID?.() || String(Date.now()),
        page: pn,
        pdfRect,
        color: "rgba(250, 204, 21, 0.45)",
        textQuote: quote,
        createdAt: new Date().toISOString(),
      };
      setHighlights((prev) => {
        const next = [...prev, hl];
        persistAnnotations(article, next, notesRef.current);
        return next;
      });
      toast({ title: "Highlight saved" });
    } catch {
      toast({ title: "Could not save highlight", variant: "destructive" });
    }
  }, [pdfDoc, article, pageWidthPx, pdfRotation]);

  const deleteHighlight = useCallback(
    (id) => {
      setHighlights((prev) => {
        const next = prev.filter((h) => h.id !== id);
        persistAnnotations(article, next, notesRef.current);
        return next;
      });
    },
    [article]
  );

  const updateNote = useCallback(
    (id, body) => {
      setNotes((prev) => {
        const next = prev.map((n) => (n.id === id ? { ...n, body } : n));
        persistAnnotations(article, highlightsRef.current, next);
        return next;
      });
    },
    [article]
  );

  const deleteNote = useCallback(
    (id) => {
      setNotes((prev) => {
        const next = prev.filter((n) => n.id !== id);
        persistAnnotations(article, highlightsRef.current, next);
        return next;
      });
    },
    [article]
  );

  const confirmNewNote = useCallback(() => {
    if (!notePlacementDraft || !noteBodyDraft.trim()) {
      setNotePlacementDraft(null);
      setNoteBodyDraft("");
      return;
    }
    const note = {
      id: crypto.randomUUID?.() || String(Date.now()),
      page: notePlacementDraft.page,
      pdfX: notePlacementDraft.pdfX,
      pdfY: notePlacementDraft.pdfY,
      body: noteBodyDraft.trim(),
      createdAt: new Date().toISOString(),
    };
    setNotes((prev) => {
      const next = [...prev, note];
      persistAnnotations(article, highlightsRef.current, next);
      return next;
    });
    setNotePlacementDraft(null);
    setNoteBodyDraft("");
    setReaderTool("default");
    toast({ title: "Sticky note saved" });
  }, [notePlacementDraft, noteBodyDraft, article]);

  const renderPdfOverlays = useCallback(
    (ctx) => {
      const { pageNumber, pageWidth, rotation, pdf, getPageWrap } = ctx;
      return (
        <>
          <PdfAnnotationMarkers
            pdf={pdf}
            pageNumber={pageNumber}
            pageWidth={pageWidth}
            rotation={rotation}
            getPageWrap={getPageWrap}
            highlights={highlights}
            notes={notes}
            noteMode={readerTool === "note"}
            suppressPinPointer={readerTool === "region"}
            onRequestNotePlacement={(page, pdfX, pdfY) => {
              setNotePlacementDraft({ page, pdfX, pdfY });
              setNoteBodyDraft("");
            }}
            onUpdateNote={updateNote}
            onDeleteNote={deleteNote}
          />
          <PdfRegionLayer
            active={readerTool === "region"}
            pdf={pdf}
            pageNumber={pageNumber}
            pageWidth={pageWidth}
            rotation={rotation}
            getPageWrap={getPageWrap}
            onCaptured={(text, pn) => {
              setContextRegionText(text);
              setContextRegionPage(pn);
              setReaderTool("default");
              toast({ title: "Region text added to assistant context" });
            }}
            onEmpty={() => {
              toast({
                title: "No extractable text in region",
                description: "Try another area or a text-based PDF.",
                variant: "destructive",
              });
            }}
          />
        </>
      );
    },
    [readerTool, highlights, notes, updateNote, deleteNote]
  );

  const pdfAbsUrl = useMemo(() => {
    const u = article.file_url;
    if (!u) return "";
    if (/^https?:\/\//i.test(u)) return u;
    return new URL(u.startsWith("/") ? u : `/${u}`, window.location.origin).href;
  }, [article.file_url]);

  const pdfDownloadName = useMemo(() => {
    const base = (article.title || "document")
      .replace(/[^\w\-. ]+/g, "")
      .trim()
      .replace(/\s+/g, "_");
    const stem = base || "document";
    return stem.toLowerCase().endsWith(".pdf") ? stem : `${stem}.pdf`;
  }, [article.title]);

  const openPdfInBrowserTab = useCallback(() => {
    if (pdfAbsUrl) window.open(pdfAbsUrl, "_blank", "noopener,noreferrer");
  }, [pdfAbsUrl]);

  const printPdf = useCallback(() => {
    if (!pdfAbsUrl) return;
    const w = window.open(pdfAbsUrl, "_blank", "noopener,noreferrer");
    if (w) {
      w.addEventListener("load", () => {
        window.setTimeout(() => {
          try {
            w.print();
          } catch {
            /* ignore */
          }
        }, 600);
      });
    }
  }, [pdfAbsUrl]);

  const tbIcon = "h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-md border border-white/15 bg-white/[0.07] text-white hover:bg-white/[0.14] transition-colors disabled:pointer-events-none disabled:opacity-35";
  const tbIconOn = "border-white/35 bg-white/[0.2] shadow-inner";

  const shellH = "h-[calc(100dvh-3.5rem)] max-h-[calc(100dvh-3.5rem)]";

  return (
    <div className={`flex flex-col lg:flex-row ${shellH} overflow-hidden bg-background`}>
      <div ref={readerRef} className="flex-1 min-w-0 min-h-0 flex flex-col border-b-2 lg:border-b-0 lg:border-r-2 border-black overflow-hidden">
        <div className="px-4 py-3 border-b border-[#e5e5e5] bg-white flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-2 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Library
          </Button>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-[10px] font-600 uppercase tracking-wider text-[#666666] border border-[#cccccc] px-2 py-1">
              <Icon className="w-3 h-3" />
              {article.subject_name}
            </span>
            {article.file_type === "pdf" ? (
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                PDF
              </Badge>
            ) : null}
          </div>
          <h1 className="text-xl md:text-2xl font-bold">{article.title}</h1>
          {article.summary && <p className="text-sm text-[#666666] mt-1 italic">{article.summary}</p>}
        </div>

        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {article.file_type === "pdf" && article.file_url ? (
            <>
              <div className="flex-shrink-0 w-full min-w-0 border-b border-black/30 bg-[#3a3a3a] text-white z-10 shadow-sm">
                <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 px-1.5 py-1.5 sm:gap-2 sm:px-2">
                  <div className="flex min-w-0 items-center justify-start gap-1 overflow-x-auto [scrollbar-width:thin]">
                    <button
                      type="button"
                      className={`${tbIcon} ${readerTool === "default" ? tbIconOn : ""}`}
                      title="Select text"
                      onClick={() => setReaderTool("default")}
                    >
                      <MousePointer2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className={`${tbIcon} ${readerTool === "region" ? tbIconOn : ""}`}
                      title="Region — drag a box to send text to the assistant"
                      onClick={() => setReaderTool((t) => (t === "region" ? "default" : "region"))}
                    >
                      <Square className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className={`${tbIcon} ${readerTool === "note" ? tbIconOn : ""}`}
                      title="Sticky note"
                      onClick={() => setReaderTool((t) => (t === "note" ? "default" : "note"))}
                    >
                      <StickyNote className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className={tbIcon}
                      title="Save highlight from selection"
                      onClick={() => saveHighlightFromSelection()}
                      disabled={!selection}
                    >
                      <Highlighter className="w-4 h-4" />
                    </button>
                    <span className="mx-0.5 hidden h-6 w-px shrink-0 bg-white/25 sm:inline-block" aria-hidden />
                    {(highlights.length > 0 || notes.length > 0) && (
                      <button
                        type="button"
                        className={tbIcon}
                        title="Clear highlights and notes"
                        onClick={() => {
                          setHighlights([]);
                          setNotes([]);
                          persistAnnotations(article, [], []);
                          toast({ title: "Cleared highlights and notes" });
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {pdfIndexProgress && pdfIndexProgress.current < pdfIndexProgress.total ? (
                      <span className="hidden pl-1 text-[10px] text-white/60 tabular-nums md:inline whitespace-nowrap">
                        Indexing {pdfIndexProgress.current}/{pdfIndexProgress.total}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center justify-center gap-0.5 sm:gap-1.5">
                    <button
                      type="button"
                      className={tbIcon}
                      title="Zoom out"
                      onClick={() => setPdfScale((s) => Math.max(0.5, Math.round((s - 0.15) * 100) / 100))}
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="min-w-[2.75rem] text-center text-xs tabular-nums text-white/90">{Math.round(pdfScale * 100)}%</span>
                    <button
                      type="button"
                      className={tbIcon}
                      title="Zoom in"
                      onClick={() => setPdfScale((s) => Math.min(2.5, Math.round((s + 0.15) * 100) / 100))}
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <span className="mx-0.5 h-6 w-px shrink-0 bg-white/25" aria-hidden />
                    <button
                      type="button"
                      className={tbIcon}
                      title="Fit width (reset zoom & rotation)"
                      onClick={() => {
                        setPdfScale(1);
                        setPdfRotation(0);
                      }}
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                    <span className="mx-0.5 h-6 w-px shrink-0 bg-white/25" aria-hidden />
                    {effectivePdfPages && pdfNumPages ? (
                      <>
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          aria-label="Page number"
                          className="h-9 w-11 shrink-0 rounded-md border border-white/25 bg-black/25 px-1 text-center text-sm tabular-nums text-white placeholder:text-white/40 focus-visible:ring-1 focus-visible:ring-white/40"
                          value={pageJumpFocused ? pageJumpDraft : String(pdfPage)}
                          onFocus={() => {
                            setPageJumpFocused(true);
                            setPageJumpDraft(String(pdfPage));
                          }}
                          onBlur={() => setPageJumpFocused(false)}
                          onChange={(e) => setPageJumpDraft(e.target.value.replace(/\D/g, ""))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              goToPdfPage();
                            }
                          }}
                        />
                        <span className="whitespace-nowrap text-xs text-white/75">
                          of {effectivePdfPages}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-white/50">…</span>
                    )}
                    <button
                      type="button"
                      className={tbIcon}
                      title="Rotate 90°"
                      onClick={() => setPdfRotation((r) => (r + 90) % 360)}
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex min-w-0 items-center justify-end gap-1">
                    <button
                      type="button"
                      className={tbIcon}
                      title="Search & outline — opens in browser tab (Ctrl+F)"
                      onClick={openPdfInBrowserTab}
                    >
                      <Search className="w-4 h-4" />
                    </button>
                    <button type="button" className={tbIcon} title="Print" onClick={printPdf}>
                      <Printer className="w-4 h-4" />
                    </button>
                    <a
                      href={article.file_url}
                      download={pdfDownloadName}
                      className={`${tbIcon} no-underline`}
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      type="button"
                      className={tbIcon}
                      title="Open in new tab"
                      onClick={openPdfInBrowserTab}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 w-full min-w-0 border-b border-[#e5e5e5] bg-[#f4f4f4] px-3 py-2">
                <div className="flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-2 justify-between">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="text-[10px] font-600 uppercase tracking-wider text-[#555]">Assistant context</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-[#666]">From</span>
                      <Input
                        className="h-8 w-12 border-[#ccc] bg-white text-center text-xs tabular-nums px-1"
                        value={contextFromDraft}
                        onChange={(e) => setContextFromDraft(e.target.value.replace(/\D/g, ""))}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-[#666]">To</span>
                      <Input
                        className="h-8 w-12 border-[#ccc] bg-white text-center text-xs tabular-nums px-1"
                        value={contextToDraft}
                        onChange={(e) => setContextToDraft(e.target.value.replace(/\D/g, ""))}
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-8 text-[10px] uppercase tracking-wider"
                      disabled={pageRangeLoading || !effectivePdfPages}
                      onClick={loadPageRangeContext}
                    >
                      {pageRangeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Load text
                    </Button>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 text-right text-[10px]">
                    {readerTool === "region" && (
                      <span className="font-500 text-red-700">Drag on the page for region capture</span>
                    )}
                    {readerTool === "note" && <span className="font-500 text-amber-800">Click to place a note</span>}
                  </div>
                </div>
              </div>

              <div
                ref={pdfWrapRef}
                className="flex-1 overflow-y-auto overflow-x-hidden bg-[#525659] px-2 py-3 sm:px-4 min-h-0 overscroll-contain touch-pan-y"
              >
                <div className="mx-auto max-w-[100%]">
                  <PdfReader
                    ref={pdfReaderRef}
                    url={article.file_url}
                    scale={pdfScale}
                    rotation={pdfRotation}
                    maxWidth={pdfWidth}
                    scrollContainerRef={pdfWrapRef}
                    onDocumentLoad={(n) => {
                      setPdfNumPages(n);
                      setPdfPage(1);
                      setContextToDraft(String(n));
                    }}
                    onPdfReady={(pdf) => setPdfDoc(pdf)}
                    onLoadFailed={onPdfLoadFailed}
                    onVisiblePageChange={setPdfPage}
                    onIndexingProgress={setPdfIndexProgress}
                    renderPageOverlay={renderPdfOverlays}
                  />
                </div>
              </div>
            </>
          ) : article.content ? (
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="max-w-3xl markdown-content text-foreground leading-relaxed select-text cursor-text">
                <ReactMarkdown>{article.content}</ReactMarkdown>
              </div>
            </div>
          ) : article.file_url ? (
            <div className="flex-1 overflow-y-auto px-4 py-4 text-center border border-[#e5e5e5] bg-white">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-muted-foreground mb-4 text-sm">Preview not available in-app.</p>
              <Button asChild>
                <a href={article.file_url} target="_blank" rel="noopener noreferrer">
                  Open file
                </a>
              </Button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <p className="text-muted-foreground">No content available.</p>
            </div>
          )}
        </div>
      </div>

      <div className="w-full lg:w-[400px] lg:min-w-[360px] flex flex-col bg-[#fafafa] border-t-2 lg:border-t-0 border-black min-h-0 shrink-0 max-h-[40vh] lg:max-h-none lg:h-full overflow-hidden">
        <div className="px-4 py-3 border-b-2 border-black bg-white flex-shrink-0 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen className="w-4 h-4 text-[#333] flex-shrink-0" />
              <h2 className="font-bold text-xs uppercase tracking-widest">Reading assistant</h2>
            </div>
            <ChatLanguageToggle value={chatLanguage} onChange={setChatLanguage} compact className="flex-shrink-0" />
          </div>
          <p className="text-[10px] text-[#666] leading-snug">
            {article.file_type === "pdf"
              ? "Context chips below are sent with each message. Use the toolbar for region capture, page range, or selected text."
              : "Context chips below are sent with each message."}
          </p>
        </div>

        <div className="mx-3 mt-2 space-y-2 flex-shrink-0 max-h-[40vh] overflow-y-auto">
          {contextPageRangeLabel && contextPageRangeText ? (
            <div className="p-2 border border-[#333] bg-white text-xs rounded-sm">
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="font-600 uppercase tracking-wider text-[10px] text-[#666]">Pages</span>
                <button
                  type="button"
                  onClick={() => {
                    setContextPageRangeLabel("");
                    setContextPageRangeText("");
                  }}
                  className="p-0.5 hover:bg-[#f5f5f5]"
                  aria-label="Clear page range context"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[#111] font-medium">{contextPageRangeLabel}</p>
              <p className="text-[#555] line-clamp-3 mt-0.5">{contextPageRangeText.slice(0, 200)}…</p>
            </div>
          ) : null}
          {contextRegionText ? (
            <div className="p-2 border border-red-200 bg-red-50/80 text-xs rounded-sm">
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="font-600 uppercase tracking-wider text-[10px] text-red-800">Region p.{contextRegionPage}</span>
                <button
                  type="button"
                  onClick={() => {
                    setContextRegionText("");
                    setContextRegionPage(null);
                  }}
                  className="p-0.5 hover:bg-white"
                  aria-label="Clear region context"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[#111] line-clamp-4 whitespace-pre-wrap">{contextRegionText}</p>
            </div>
          ) : null}
          {selection ? (
            <div className="p-2 border border-[#333] bg-white text-xs rounded-sm">
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="font-600 uppercase tracking-wider text-[10px] text-[#666] flex items-center gap-1">
                  <Highlighter className="w-3 h-3" /> Selection
                </span>
                <button type="button" onClick={() => setSelection("")} className="p-0.5 hover:bg-[#f5f5f5]" aria-label="Clear selection">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[#111] max-h-24 overflow-y-auto whitespace-pre-wrap leading-snug">
                {selection.slice(0, 1500)}
                {selection.length > 1500 ? "…" : ""}
              </p>
              <Button type="button" variant="outline" size="sm" className="w-full h-7 text-[10px] mt-2 uppercase tracking-wider" onClick={explainSelection}>
                Explain this selection
              </Button>
            </div>
          ) : null}
          {highlights.length > 0 ? (
            <div className="p-2 border border-amber-200 bg-amber-50/50 text-xs rounded-sm">
              <p className="font-600 uppercase tracking-wider text-[10px] text-amber-900 mb-2">Saved highlights ({highlights.length})</p>
              <ul className="space-y-1 max-h-24 overflow-y-auto">
                {highlights.map((h) => (
                  <li key={h.id} className="flex items-start justify-between gap-1 text-[10px]">
                    <span className="text-[#333] line-clamp-2 flex-1">p.{h.page}: {h.textQuote || "(mark)"}</span>
                    <button type="button" className="text-destructive shrink-0 p-0.5" onClick={() => deleteHighlight(h.id)} aria-label="Remove highlight">
                      <X className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
          {messages.length === 0 && !isLoading && (
            <p className="text-xs text-[#999] py-6 text-center px-2">Try: “What is this page about?” or add context chips above.</p>
          )}
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} isLoading={false} />
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

        <div className="p-3 border-t-2 border-black bg-white flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <Switch id="library-read" checked={librarySearch} onCheckedChange={setLibrarySearch} />
            <Label htmlFor="library-read" className="text-[10px] text-[#666] cursor-pointer normal-case tracking-normal">
              Search Wikipedia &amp; course packs too
            </Label>
          </div>
          <div className="flex gap-2 items-end">
            <Textarea
              ref={chatComposerRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about what you're reading…"
              className="resize-none min-h-[52px] flex-1 bg-white border border-[#cccccc] text-sm focus:border-black text-xs"
              rows={1}
            />
            <Button
              type="button"
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-[52px] w-[52px] flex-shrink-0 bg-black text-white hover:bg-[#222]"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={!!notePlacementDraft} onOpenChange={(o) => !o && setNotePlacementDraft(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New sticky note</DialogTitle>
          </DialogHeader>
          <Textarea
            className="min-h-[100px] text-sm"
            placeholder="Write your note…"
            value={noteBodyDraft}
            onChange={(e) => setNoteBodyDraft(e.target.value)}
            autoFocus
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setNotePlacementDraft(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmNewNote} disabled={!noteBodyDraft.trim()}>
              Save note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
