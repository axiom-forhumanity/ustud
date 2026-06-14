import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Document, Page, pdfjs } from "react-pdf";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

/** Tailwind mb-8 between pages */
const PAGE_GAP = 32;
/** Pages above/below viewport to mount (canvas + text layer are heavy). */
const VIEW_BUFFER = 4;

function blockHeight(ratio, pageWidth, rotation) {
  const r = ((rotation % 360) + 360) % 360;
  const inner = r === 90 || r === 270 ? pageWidth / ratio : pageWidth * ratio;
  return inner + PAGE_GAP;
}

function buildPrefixOffsets(aspectRatios, pageWidth, rotation) {
  if (!aspectRatios?.length) return [];
  const out = [0];
  let acc = 0;
  for (let i = 0; i < aspectRatios.length; i++) {
    acc += blockHeight(aspectRatios[i], pageWidth, rotation);
    out.push(acc);
  }
  return out;
}

function pageFromScrollY(scrollTop, clientHeight, prefixOffsets) {
  const n = prefixOffsets.length - 1;
  if (n <= 0) return 1;
  const y = scrollTop + clientHeight * 0.35;
  for (let i = 0; i < n; i++) {
    if (prefixOffsets[i + 1] > y) return i + 1;
  }
  return n;
}

const PdfReader = forwardRef(function PdfReader(
  {
    url,
    scale = 1,
    rotation = 0,
    maxWidth = 880,
    scrollContainerRef = null,
    onDocumentLoad,
    onLoadFailed,
    onVisiblePageChange,
    onIndexingProgress,
    /** Called with pdf.js document when layout (aspect ratios) is ready */
    onPdfReady,
    /** Render tools/overlays per visible page */
    renderPageOverlay,
  },
  ref
) {
  const pdfRef = useRef(null);
  const pageWrapsRef = useRef(new Map());
  const onPdfReadyRef = useRef(onPdfReady);
  onPdfReadyRef.current = onPdfReady;

  const [pdfBuffer, setPdfBuffer] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [numPages, setNumPages] = useState(null);
  const [aspectRatios, setAspectRatios] = useState(null);
  const [loadErr, setLoadErr] = useState(false);

  const [visibleStart, setVisibleStart] = useState(1);
  const [visibleEnd, setVisibleEnd] = useState(1);

  const lastReportedPageRef = useRef(1);
  const failRef = useRef(onLoadFailed);
  const loadRef = useRef(onDocumentLoad);
  const visibleRef = useRef(onVisiblePageChange);
  const progressRef = useRef(onIndexingProgress);
  failRef.current = onLoadFailed;
  loadRef.current = onDocumentLoad;
  visibleRef.current = onVisiblePageChange;
  progressRef.current = onIndexingProgress;

  useEffect(() => {
    let cancelled = false;
    setPdfBuffer(null);
    setFetching(true);
    setLoadErr(false);
    setNumPages(null);
    setAspectRatios(null);
    lastReportedPageRef.current = 1;

    (async () => {
      try {
        const res = await fetch(url, { credentials: "same-origin" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        if (cancelled) return;
        setPdfBuffer(buf);
      } catch {
        if (!cancelled) {
          setLoadErr(true);
          failRef.current?.();
        }
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  const baseW = Math.max(240, Math.min(maxWidth, 900));
  const pageWidth = baseW * scale;

  const prefixOffsets = useMemo(
    () => buildPrefixOffsets(aspectRatios, pageWidth, rotation),
    [aspectRatios, pageWidth, rotation]
  );

  const updateVisibleWindow = useCallback(
    (scrollTop, clientHeight) => {
      if (!aspectRatios?.length || !numPages) return;
      if (clientHeight < 8) {
        const end = Math.min(numPages, 1 + VIEW_BUFFER * 2);
        setVisibleStart(1);
        setVisibleEnd(end);
        return;
      }
      const center = pageFromScrollY(scrollTop, clientHeight, prefixOffsets);
      const start = Math.max(1, center - VIEW_BUFFER);
      const end = Math.min(numPages, center + VIEW_BUFFER);
      setVisibleStart(start);
      setVisibleEnd(end);

      if (center !== lastReportedPageRef.current) {
        lastReportedPageRef.current = center;
        visibleRef.current?.(center);
      }
    },
    [aspectRatios, numPages, prefixOffsets]
  );

  const scrollToPage = useCallback(
    (pageNum) => {
      const el = scrollContainerRef?.current;
      if (!el || !aspectRatios?.length || !numPages) return;
      const p = Math.min(numPages, Math.max(1, Math.floor(pageNum)));
      const idx = p - 1;
      const top = prefixOffsets[idx] ?? 0;
      el.scrollTo({ top, behavior: "auto" });
      lastReportedPageRef.current = p;
      visibleRef.current?.(p);
    },
    [aspectRatios, numPages, prefixOffsets, scrollContainerRef]
  );

  useImperativeHandle(
    ref,
    () => ({
      scrollToPage,
      getPdf: () => pdfRef.current,
    }),
    [scrollToPage]
  );

  useEffect(() => {
    const el = scrollContainerRef?.current;
    if (!el || !aspectRatios?.length) return;

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        updateVisibleWindow(el.scrollTop, el.clientHeight);
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    updateVisibleWindow(el.scrollTop, el.clientHeight);
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollContainerRef, aspectRatios, updateVisibleWindow]);

  useEffect(() => {
    if (!aspectRatios?.length || !scrollContainerRef?.current) return;
    const el = scrollContainerRef.current;
    updateVisibleWindow(el.scrollTop, el.clientHeight);
  }, [pageWidth, rotation, aspectRatios, scrollContainerRef, updateVisibleWindow]);

  const handleLoadSuccess = useCallback(
    async (pdf) => {
      const n = pdf.numPages;
      setNumPages(n);
      visibleRef.current?.(1);
      lastReportedPageRef.current = 1;
      progressRef.current?.({ current: 0, total: n });

      const ratios = new Array(n);
      try {
        for (let i = 1; i <= n; i++) {
          const page = await pdf.getPage(i);
          const vp = page.getViewport({ scale: 1 });
          ratios[i - 1] = vp.height / Math.max(vp.width, 1);
          if (i % 20 === 0 || i === n) {
            progressRef.current?.({ current: i, total: n });
          }
          if (i % 8 === 0) {
            await new Promise((r) => requestAnimationFrame(r));
          }
        }
        setAspectRatios(ratios);
        progressRef.current?.({ current: n, total: n });
      } catch {
        const fallback = 11 / 8.5;
        setAspectRatios(Array.from({ length: n }, () => fallback));
        progressRef.current?.({ current: n, total: n });
      }
      /* Notify parent only after layout is ready so “Go to page” and scroll math work. */
      loadRef.current?.(n);
      onPdfReadyRef.current?.(pdf);
    },
    []
  );

  const handleDocError = useCallback(() => {
    pdfRef.current = null;
    setLoadErr(true);
    failRef.current?.();
  }, []);

  if (loadErr) {
    return null;
  }

  if (fetching && !pdfBuffer) {
    return (
      <div className="text-sm text-muted-foreground py-12 px-4 border border-[#e5e5e5] bg-white text-center">
        Loading PDF…
      </div>
    );
  }

  const totalHeight = prefixOffsets.length ? prefixOffsets[prefixOffsets.length - 1] : 0;
  const topSpacer =
    aspectRatios?.length && visibleStart > 1 ? prefixOffsets[visibleStart - 1] ?? 0 : 0;
  const bottomSpacer =
    aspectRatios?.length && numPages && visibleEnd < numPages
      ? totalHeight - (prefixOffsets[visibleEnd] ?? totalHeight)
      : 0;

  return (
    <Document
      file={pdfBuffer}
      onLoadSuccess={handleLoadSuccess}
      onLoadError={handleDocError}
      loading={
        <div className="text-sm text-muted-foreground py-8 px-4 border border-[#e5e5e5] bg-white">
          Opening document…
        </div>
      }
    >
      {!aspectRatios ? (
        <div className="text-sm text-muted-foreground py-10 px-4 border border-[#e5e5e5] bg-white text-center">
          Indexing pages for smooth scrolling…
          <br />
          <span className="text-xs text-[#888] mt-2 inline-block">Large textbooks may take a few seconds.</span>
        </div>
      ) : (
        <>
          {topSpacer > 0 ? <div className="w-full flex-shrink-0" style={{ height: topSpacer }} aria-hidden /> : null}
          {Array.from({ length: visibleEnd - visibleStart + 1 }, (_, k) => {
            const n = visibleStart + k;
            return (
              <div key={n} className="mb-8 flex justify-center scroll-mt-4">
                <div
                  ref={(el) => {
                    if (el) pageWrapsRef.current.set(n, el);
                    else pageWrapsRef.current.delete(n);
                  }}
                  className="relative inline-block align-top"
                >
                  <Page
                    pageNumber={n}
                    width={pageWidth}
                    rotate={rotation}
                    renderTextLayer
                    renderAnnotationLayer
                    className="border border-[#e5e5e5] bg-white shadow-sm"
                  />
                  {typeof renderPageOverlay === "function" && pdfRef.current
                    ? renderPageOverlay({
                        pageNumber: n,
                        pageWidth,
                        rotation,
                        pdf: pdfRef.current,
                        getPageWrap: () => pageWrapsRef.current.get(n),
                      })
                    : null}
                </div>
              </div>
            );
          })}
          {bottomSpacer > 0 ? (
            <div className="w-full flex-shrink-0" style={{ height: bottomSpacer }} aria-hidden />
          ) : null}
        </>
      )}
    </Document>
  );
});

PdfReader.displayName = "PdfReader";

export default PdfReader;
