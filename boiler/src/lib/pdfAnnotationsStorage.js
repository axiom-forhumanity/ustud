/** Persist highlights + sticky notes per library document (localStorage). */

export function getDocumentAnnotationsKey(article) {
  const id = article?.id || article?.file_url || article?.title || "doc";
  const safe = String(id).replace(/[^\w./-]/g, "_").slice(0, 220);
  return `ustud_pdf_ann_${safe}`;
}

/** @returns {{ highlights: object[], notes: object[] }} */
export function loadAnnotations(article) {
  try {
    const raw = localStorage.getItem(getDocumentAnnotationsKey(article));
    if (!raw) return { highlights: [], notes: [] };
    const p = JSON.parse(raw);
    return {
      highlights: Array.isArray(p.highlights) ? p.highlights : [],
      notes: Array.isArray(p.notes) ? p.notes : [],
    };
  } catch {
    return { highlights: [], notes: [] };
  }
}

export function saveAnnotations(article, data) {
  try {
    localStorage.setItem(
      getDocumentAnnotationsKey(article),
      JSON.stringify({
        highlights: data.highlights || [],
        notes: data.notes || [],
        version: 1,
      })
    );
  } catch {
    /* quota */
  }
}
