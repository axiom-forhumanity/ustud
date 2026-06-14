/**
 * PDF text extraction and coordinate helpers (pdf.js).
 * @typedef {{ id: string, page: number, pdfRect: [number, number, number, number], color: string, textQuote?: string, createdAt: string }} PdfHighlight
 * @typedef {{ id: string, page: number, pdfX: number, pdfY: number, body: string, createdAt: string }} PdfStickyNote
 */

import { Util } from "pdfjs-dist";

/** Tighten PDF.js string joins before sending to the API (pairs with server-side preprocess). */
export function normalizeExtractedPdfText(s) {
  if (!s) return s;
  return s
    .replace(/\u00AD/g, "")
    .replace(/-\s*\n\s*/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}

export const MAX_RANGE_CHARS = 12000;
export const MAX_RANGE_PAGES = 25;

/**
 * @param {import("pdfjs-dist").PDFDocumentProxy} pdf
 */
export async function extractTextPageRange(pdf, fromPage, toPage, maxChars = MAX_RANGE_CHARS) {
  const lo = Math.max(1, Math.min(fromPage, toPage));
  const hi = Math.min(pdf.numPages, Math.max(fromPage, toPage));
  if (hi - lo + 1 > MAX_RANGE_PAGES) {
    throw new Error(`Choose at most ${MAX_RANGE_PAGES} pages`);
  }
  const parts = [];
  let total = 0;
  for (let p = lo; p <= hi; p++) {
    if (total >= maxChars) break;
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const text = normalizeExtractedPdfText(
      content.items
        .filter((item) => "str" in item && item.str)
        .map((item) => item.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
    );
    const header = `--- Page ${p} ---\n`;
    const chunk = header + text;
    const remain = maxChars - total;
    if (chunk.length > remain) {
      parts.push(chunk.slice(0, remain) + "\n…");
      break;
    }
    parts.push(chunk);
    total += chunk.length + 1;
    if (p % 2 === 0) await new Promise((r) => requestAnimationFrame(r));
  }
  return normalizeExtractedPdfText(parts.join("\n\n"));
}

function itemViewportBounds(item, viewport) {
  const m = item.transform;
  const w = item.width;
  const h = item.height || Math.abs(m[3]) * 1.2 || 12;
  const corners = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of corners) {
    const [px, py] = Util.applyTransform([x, y], m);
    const [vx, vy] = viewport.convertToViewportPoint(px, py);
    minX = Math.min(minX, vx);
    minY = Math.min(minY, vy);
    maxX = Math.max(maxX, vx);
    maxY = Math.max(maxY, vy);
  }
  return { left: minX, top: minY, right: maxX, bottom: maxY };
}

function intersects(a, b) {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

/**
 * rectRel: left/top/right/bottom relative to page root element (same coords as viewport.convertToViewportPoint output space).
 * @param {import("pdfjs-dist").PDFPageProxy} pdfPage
 */
export async function extractTextInViewportRect(pdfPage, pageWidth, rotation, rectRel) {
  const base = pdfPage.getViewport({ scale: 1, rotation });
  const scale = pageWidth / base.width;
  const viewport = pdfPage.getViewport({ scale, rotation });
  const content = await pdfPage.getTextContent();
  const pieces = [];
  for (const item of content.items) {
    if (!("str" in item) || !item.str?.trim()) continue;
    const b = itemViewportBounds(item, viewport);
    if (intersects(b, rectRel)) pieces.push(item.str);
  }
  return normalizeExtractedPdfText(pieces.join(" ").replace(/\s+/g, " ").trim());
}

/**
 * @param {import("pdfjs-dist").PDFPageProxy} pdfPage
 * @returns {[number, number, number, number]} minX, minY, maxX, maxY in PDF user space
 */
export function domRectToPdfRect(pdfPage, pageWidth, rotation, rectRel) {
  const base = pdfPage.getViewport({ scale: 1, rotation });
  const scale = pageWidth / base.width;
  const viewport = pdfPage.getViewport({ scale, rotation });
  const corners = [
    [rectRel.left, rectRel.top],
    [rectRel.right, rectRel.top],
    [rectRel.right, rectRel.bottom],
    [rectRel.left, rectRel.bottom],
  ];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [vx, vy] of corners) {
    const [px, py] = viewport.convertToPdfPoint(vx, vy);
    minX = Math.min(minX, px);
    minY = Math.min(minY, py);
    maxX = Math.max(maxX, px);
    maxY = Math.max(maxY, py);
  }
  return [minX, minY, maxX, maxY];
}

/**
 * @param {import("pdfjs-dist").PDFPageProxy} pdfPage
 * @param {[number, number, number, number]} pdfRect
 */
export function pdfRectToDomStyle(pdfPage, pageWidth, rotation, pdfRect) {
  const base = pdfPage.getViewport({ scale: 1, rotation });
  const scale = pageWidth / base.width;
  const viewport = pdfPage.getViewport({ scale, rotation });
  const [x0, y0] = viewport.convertToViewportPoint(pdfRect[0], pdfRect[1]);
  const [x1, y1] = viewport.convertToViewportPoint(pdfRect[2], pdfRect[3]);
  return {
    left: Math.min(x0, x1),
    top: Math.min(y0, y1),
    width: Math.abs(x1 - x0),
    height: Math.abs(y1 - y0),
  };
}

/**
 * @param {import("pdfjs-dist").PDFPageProxy} pdfPage
 * @param {number} pdfX
 * @param {number} pdfY
 */
export function pdfPointToDom(pdfPage, pageWidth, rotation, pdfX, pdfY) {
  const base = pdfPage.getViewport({ scale: 1, rotation });
  const scale = pageWidth / base.width;
  const viewport = pdfPage.getViewport({ scale, rotation });
  const [vx, vy] = viewport.convertToViewportPoint(pdfX, pdfY);
  return { left: vx, top: vy };
}

/** Union of DOMRects from a Selection, coordinates relative to page root element. */
export function clientRectUnionRelativeToPage(pageEl, clientRects) {
  const pr = pageEl.getBoundingClientRect();
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (let i = 0; i < clientRects.length; i++) {
    const x = clientRects[i];
    left = Math.min(left, x.left - pr.left);
    top = Math.min(top, x.top - pr.top);
    right = Math.max(right, x.right - pr.left);
    bottom = Math.max(bottom, x.bottom - pr.top);
  }
  if (!Number.isFinite(left)) return null;
  return { left, top, right, bottom };
}
