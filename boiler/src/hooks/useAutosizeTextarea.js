import { useLayoutEffect } from "react";

/**
 * Grows the textarea with wrapped lines up to maxHeightPx, then scrolls inside.
 * @param {React.RefObject<HTMLTextAreaElement | null>} textareaRef
 * @param {string} value
 * @param {{ minHeight?: number; maxHeight?: number }} [opts]
 */
export function useAutosizeTextarea(textareaRef, value, opts = {}) {
  const minHeight = opts.minHeight ?? 52;
  const maxHeight = opts.maxHeight ?? 200;

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const full = el.scrollHeight;
    const next = Math.min(Math.max(full, minHeight), maxHeight);
    el.style.height = `${next}px`;
    el.style.overflowY = full > maxHeight ? "auto" : "hidden";
  }, [textareaRef, value, minHeight, maxHeight]);
}
