import React, { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

const THUMB_WIDTH = 56;

/**
 * Lazy first-page PDF thumbnail. Loads the document only when intersecting the viewport.
 */
export default function PdfCoverThumbnail({ fileUrl, className = "", fallback = null }) {
  const rootRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [err, setErr] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || !fileUrl) return undefined;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: "120px", threshold: 0.01 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [fileUrl]);

  if (!fileUrl || err) {
    return (
      <div
        ref={rootRef}
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-sm border border-[#e5e5e5] bg-[#fafafa] ${className}`}
        style={{ width: THUMB_WIDTH, height: 72 }}
      >
        {fallback}
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`relative shrink-0 overflow-hidden rounded-sm border border-[#e5e5e5] bg-[#fafafa] ${className}`}
      style={{ width: THUMB_WIDTH, height: 72 }}
    >
      {!visible ? (
        <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden />
      ) : (
        <Document
          file={fileUrl}
          loading={null}
          onLoadSuccess={() => setLoaded(true)}
          onLoadError={() => setErr(true)}
          options={{ withCredentials: false }}
        >
          <Page
            pageNumber={1}
            width={THUMB_WIDTH}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="!bg-transparent"
            loading={null}
          />
        </Document>
      )}
      {visible && !loaded && !err ? (
        <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden />
      ) : null}
    </div>
  );
}
