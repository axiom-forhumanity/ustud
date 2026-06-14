/**
 * Parse ZIM-served Wikipedia HTML for assistant context (plain text + sections).
 */

const MAX_SECTION_CHARS = 12000;
const MAX_FULL_CHARS = 80000;

export function wikiHtmlToPlainText(html) {
  if (!html || typeof html !== "string") return "";
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const root = doc.querySelector(".mw-parser-output") || doc.body;
    if (!root) return "";
    const t = root.innerText || "";
    return t.replace(/\n{3,}/g, "\n\n").trim();
  } catch {
    return "";
  }
}

/**
 * Split article into top-level sections by h2 under .mw-parser-output.
 * @returns {{ id: string, heading: string, text: string }[]}
 */
export function extractWikiSections(html) {
  if (!html || typeof html !== "string") return [];
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const root = doc.querySelector(".mw-parser-output");
    if (!root) return [];
    const sections = [];
    let current = { id: "_intro", heading: "Introduction", parts: [] };
    const flush = () => {
      const text = current.parts.join("\n").trim();
      if (text.length > 0) {
        sections.push({
          id: current.id,
          heading: current.heading,
          text: text.slice(0, MAX_SECTION_CHARS) + (text.length > MAX_SECTION_CHARS ? "\n…" : ""),
        });
      }
    };
    for (const node of root.children) {
      if (node.tagName === "H2") {
        flush();
        const label =
          node.querySelector(".mw-headline")?.textContent?.trim() ||
          node.textContent?.trim() ||
          "Section";
        const id = node.id || `sec_${sections.length}`;
        current = { id, heading: label, parts: [] };
      } else {
        current.parts.push(node.textContent || "");
      }
    }
    flush();
    return sections;
  } catch {
    return [];
  }
}

export function wikiFullArticlePlain(html) {
  const t = wikiHtmlToPlainText(html);
  if (t.length <= MAX_FULL_CHARS) return t;
  return t.slice(0, MAX_FULL_CHARS) + "\n…";
}

export { MAX_FULL_CHARS, MAX_SECTION_CHARS };
