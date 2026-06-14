/**
 * Sort library articles for learner-friendly reading order within each subject.
 * Uses optional read_order from API, then heuristics (intro / vol N / edition), then title.
 */

function articleTitle(a) {
  return String(a.display_title || a.title || "").trim();
}

function articleRelPath(a) {
  return String(a._libraryRelPath || a.rel_path || "").replace(/\\/g, "/");
}

/** Subfolder key: segments after first path segment (e.g. Business/Accounting/x.pdf -> Accounting) */
function subfolderSortKey(a) {
  const p = articleRelPath(a);
  const parts = p.split("/").filter(Boolean);
  if (parts.length >= 2) {
    return parts.slice(0, -1).join("/").toLowerCase();
  }
  return "";
}

function introScore(title) {
  const t = title.toLowerCase();
  if (/\bintroduction to\b|\bintroductory\b|\bintro\b/.test(t)) return 0;
  if (/\bprinciples of\b|\bfundamentals of\b|\bprinciples\b/.test(t)) return 1;
  if (/\boverview\b|\bbasics\b|\bgetting started\b/.test(t)) return 2;
  return 50;
}

function volumeScore(title) {
  const t = title.toLowerCase();
  const m = t.match(/\bvol(?:ume)?\.?\s*(\d+)\b|\bvol(\d+)\b|\bbook\s*(\d+)\b/);
  if (m) {
    const n = parseInt(m[1] || m[2] || m[3], 10);
    return Number.isFinite(n) ? n : 99;
  }
  return 0;
}

function editionPenalty(title) {
  const t = title.toLowerCase();
  const m = t.match(/\b(\d+)\s*e\b|\b(\d+)(?:st|nd|rd|th)\s+ed/i);
  if (m) {
    const n = parseInt(m[1] || m[2], 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function sortKeyForArticle(a) {
  const ro = a.read_order;
  const readOrder = typeof ro === "number" && Number.isFinite(ro) ? ro : 10_000;
  const title = articleTitle(a);
  const sub = subfolderSortKey(a);
  return [
    readOrder,
    sub,
    introScore(title),
    volumeScore(title),
    editionPenalty(title),
    title.toLowerCase(),
    articleRelPath(a).toLowerCase(),
  ];
}

function compareKeys(ka, kb) {
  for (let i = 0; i < ka.length; i++) {
    const va = ka[i];
    const vb = kb[i];
    if (va < vb) return -1;
    if (va > vb) return 1;
  }
  return 0;
}

/**
 * Stable sort: primary by subject_id, then reading order heuristics within subject.
 */
export function sortLibraryArticles(articles) {
  if (!articles?.length) return articles || [];
  const copy = [...articles];
  copy.sort((a, b) => {
    const sid = String(a.subject_id || "").localeCompare(String(b.subject_id || ""));
    if (sid !== 0) return sid;
    return compareKeys(sortKeyForArticle(a), sortKeyForArticle(b));
  });
  return copy;
}
