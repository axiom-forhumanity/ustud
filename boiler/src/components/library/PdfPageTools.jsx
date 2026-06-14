import React, { useState, useCallback, useRef, useEffect } from "react";
import { extractTextInViewportRect, pdfRectToDomStyle, pdfPointToDom } from "@/lib/pdfContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote, Trash2 } from "lucide-react";

/** Red drag-rectangle → extract text for assistant context. */
export function PdfRegionLayer({ active, pdf, pageNumber, pageWidth, rotation, getPageWrap, onCaptured, onEmpty }) {
  const dragRef = useRef(null);
  const rectRef = useRef(null);
  const [rect, setRect] = useState(null);

  const onPointerDown = useCallback(
    (e) => {
      if (!active || e.button !== 0) return;
      const wrap = getPageWrap?.();
      if (!wrap) return;
      const r = wrap.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      dragRef.current = { x0: x, y0: y, wrap };
      rectRef.current = { left: x, top: y, width: 0, height: 0 };
      setRect({ left: x, top: y, width: 0, height: 0 });
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [active, getPageWrap]
  );

  const onPointerMove = useCallback((e) => {
    if (!dragRef.current) return;
    const { x0, y0, wrap } = dragRef.current;
    const r = wrap.getBoundingClientRect();
    const x1 = e.clientX - r.left;
    const y1 = e.clientY - r.top;
    const next = {
      left: Math.min(x0, x1),
      top: Math.min(y0, y1),
      width: Math.abs(x1 - x0),
      height: Math.abs(y1 - y0),
    };
    rectRef.current = next;
    setRect(next);
  }, []);

  const onPointerUp = useCallback(
    async (e) => {
      if (!active) return;
      dragRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* */
      }
      const cur = rectRef.current;
      rectRef.current = null;
      setRect(null);
      if (!cur || !pdf || cur.width < 4 || cur.height < 4) return;
      const rel = {
        left: cur.left,
        top: cur.top,
        right: cur.left + cur.width,
        bottom: cur.top + cur.height,
      };
      try {
        const page = await pdf.getPage(pageNumber);
        const text = await extractTextInViewportRect(page, pageWidth, rotation, rel);
        if (text && text.length > 2) onCaptured?.(text, pageNumber);
        else onEmpty?.();
      } catch {
        onEmpty?.();
      }
    },
    [active, pdf, pageNumber, pageWidth, rotation, onCaptured, onEmpty]
  );

  if (!active) return null;

  return (
    <>
      <div
        className="absolute inset-0 z-20 cursor-crosshair touch-none bg-transparent"
        style={{ userSelect: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      {rect && rect.width > 1 && rect.height > 1 ? (
        <div
          className="absolute z-30 pointer-events-none border-2 border-red-600 bg-red-500/10"
          style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
        />
      ) : null}
    </>
  );
}

/**
 * Highlight rectangles + sticky note pins for one page (PDF-space → viewport).
 */
export function PdfAnnotationMarkers({
  pdf,
  pageNumber,
  pageWidth,
  rotation,
  getPageWrap,
  highlights,
  notes,
  noteMode,
  /** When true, pins don’t steal pointer events (e.g. region drag on top). */
  suppressPinPointer = false,
  onRequestNotePlacement,
  onUpdateNote,
  onDeleteNote,
}) {
  const [pageProxy, setPageProxy] = useState(null);
  const [openNoteId, setOpenNoteId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!pdf) {
      setPageProxy(null);
      return;
    }
    (async () => {
      try {
        const p = await pdf.getPage(pageNumber);
        if (!cancelled) setPageProxy(p);
      } catch {
        if (!cancelled) setPageProxy(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdf, pageNumber, pageWidth, rotation]);

  const wrap = getPageWrap?.();
  if (!wrap || !pageProxy) return null;

  const pageHighlights = (highlights || []).filter((h) => h.page === pageNumber);
  const pageNotes = (notes || []).filter((n) => n.page === pageNumber);

  return (
    <>
      {noteMode ? (
        <button
          type="button"
          className="absolute inset-0 z-[17] cursor-cell bg-transparent border-0 p-0 w-full h-full"
          aria-label="Click to place sticky note"
          onClick={async (e) => {
            if (!pdf || !onRequestNotePlacement) return;
            const r = wrap.getBoundingClientRect();
            const vx = e.clientX - r.left;
            const vy = e.clientY - r.top;
            try {
              const page = await pdf.getPage(pageNumber);
              const base = page.getViewport({ scale: 1, rotation });
              const scale = pageWidth / base.width;
              const viewport = page.getViewport({ scale, rotation });
              const [px, py] = viewport.convertToPdfPoint(vx, vy);
              onRequestNotePlacement(pageNumber, px, py);
            } catch {
              /* */
            }
          }}
        />
      ) : null}
      {pageHighlights.map((h) => {
        const st = pdfRectToDomStyle(pageProxy, pageWidth, rotation, h.pdfRect);
        return (
          <div
            key={h.id}
            className="absolute z-[15] pointer-events-none rounded-sm mix-blend-multiply"
            style={{
              left: st.left,
              top: st.top,
              width: Math.max(st.width, 4),
              height: Math.max(st.height, 4),
              backgroundColor: h.color || "rgba(250, 204, 21, 0.45)",
            }}
            title={h.textQuote || "Highlight"}
          />
        );
      })}
      {pageNotes.map((n) => {
        const { left, top } = pdfPointToDom(pageProxy, pageWidth, rotation, n.pdfX, n.pdfY);
        return (
          <Popover key={n.id} open={openNoteId === n.id} onOpenChange={(o) => setOpenNoteId(o ? n.id : null)}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`absolute z-[25] w-7 h-7 -translate-x-1/2 -translate-y-full flex items-center justify-center rounded-full border-2 border-amber-700 bg-amber-100 shadow text-amber-900 hover:bg-amber-200 ${suppressPinPointer ? "pointer-events-none" : "pointer-events-auto"}`}
                style={{ left, top }}
                aria-label="Sticky note"
                onClick={(e) => e.stopPropagation()}
              >
                <StickyNote className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="start">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Note</p>
              <Textarea
                className="text-xs min-h-[72px] mb-2"
                value={n.body}
                onChange={(e) => onUpdateNote?.(n.id, e.target.value)}
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="w-full gap-1 h-8 text-xs"
                onClick={() => {
                  onDeleteNote?.(n.id);
                  setOpenNoteId(null);
                }}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </Button>
            </PopoverContent>
          </Popover>
        );
      })}
    </>
  );
}

export { domRectToPdfRect } from "@/lib/pdfContext";
