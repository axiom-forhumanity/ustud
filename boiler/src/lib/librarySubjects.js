/**
 * Library subject hubs, lesson quality filter, and per-module display mapping.
 */

/** Lesson stubs to hide from Library (no real reading value). */
const EXPLICIT_SKIP_LESSON_IDS = new Set([
  "letters_a_m",
  "letters_n_z",
  "numbers_1",
  "numbers_2",
]);

/**
 * True if this curriculum lesson should not appear as a library article.
 */
export function isVagueCurriculumLesson(lesson) {
  if (!lesson?.title?.trim()) return true;
  if (EXPLICIT_SKIP_LESSON_IDS.has(lesson.id)) return true;

  const title = lesson.title.trim();
  const desc = (lesson.description || "").trim();
  if (!desc || desc.length < 12) return true;

  const d = desc.toLowerCase();
  // Alphabet “half” placeholder lessons
  if (/^the (first|second) half of the alphabet\.?$/.test(d)) return true;
  // “Letters X to Y” with only a short blurb
  if (/^letters?\s+[a-z]\s+to\s+[a-z]/i.test(title) && desc.length < 55) return true;

  const norm = (s) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const nt = norm(title);
  const nd = norm(desc);
  if (desc.length < 50 && nt && nd && (nt === nd || (nt.length > 8 && nd.length > 8 && (nt.includes(nd) || nd.includes(nt)))))
    return true;

  return false;
}

/**
 * Map API module + unit to library subject id/name shown in the grid.
 */
export function resolveLibrarySubject(moduleId, unit) {
  if (moduleId === "core_curriculum") {
    if (unit?.id === "math_basics") {
      return { subject_id: "core_math", subject_name: "Mathematics" };
    }
    if (unit?.id === "science_basics") {
      return { subject_id: "core_science", subject_name: "Science" };
    }
    return { subject_id: "core_curriculum", subject_name: "Core Curriculum" };
  }
  if (moduleId === "english_basics") {
    return { subject_id: "english_basics", subject_name: "English" };
  }
  if (moduleId === "mental_health") {
    return { subject_id: "mental_health", subject_name: "Wellbeing" };
  }
  if (moduleId === "fitness_nutrition") {
    return { subject_id: "fitness_nutrition", subject_name: "Fitness & Nutrition" };
  }
  if (moduleId === "_ustud_flat_library") {
    /* Loose PDFs are filed under Core curriculum in the UI */
    return { subject_id: "core_curriculum", subject_name: "Core curriculum" };
  }
  return { subject_id: moduleId, subject_name: moduleId.replace(/_/g, " ") };
}

const FLAT_LIBRARY_MODULE_ID = "_ustud_flat_library";

/**
 * Top-level `Library/<Folder>/…` names → existing hub ids or dedicated library_* ids.
 * Keys are lowercased with runs of spaces/underscores collapsed to a single space.
 */
const FLAT_LIBRARY_FOLDER_SUBJECT = {
  mathematics: { subject_id: "core_math", subject_name: "Mathematics" },
  math: { subject_id: "core_math", subject_name: "Mathematics" },
  english: { subject_id: "english_basics", subject_name: "English" },
  history: { subject_id: "hub_history", subject_name: "History" },
  biology: { subject_id: "core_science", subject_name: "Science" },
  chemistry: { subject_id: "core_science", subject_name: "Science" },
  physics: { subject_id: "core_science", subject_name: "Science" },
  science: { subject_id: "core_science", subject_name: "Science" },
  engineering: { subject_id: "library_engineering", subject_name: "Engineering" },
  "computer science": { subject_id: "library_computer_science", subject_name: "Computer Science" },
  business: { subject_id: "library_business", subject_name: "Business" },
  philosophy: { subject_id: "library_philosophy", subject_name: "Philosophy" },
  /** Economics PDFs live under the same hub as Business */
  economics: { subject_id: "library_business", subject_name: "Business" },
  psychology: { subject_id: "library_psychology", subject_name: "Psychology" },
  sociology: { subject_id: "library_sociology", subject_name: "Sociology" },
  /** Statistics → Mathematics */
  statistics: { subject_id: "core_math", subject_name: "Mathematics" },
};

function normalizeFlatFolderKey(segment) {
  return String(segment || "")
    .trim()
    .toLowerCase()
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugifyForLibrarySubject(segment) {
  const s = normalizeFlatFolderKey(segment).replace(/\s+/g, "_");
  return s.replace(/[^a-z0-9_]/g, "").replace(/_+/g, "_").replace(/^_|_$/g, "") || "misc";
}

/**
 * First path segment under the flat Library folder → subject hub (e.g. Business/Accounting/a.pdf → Business).
 */
export function subjectFromFlatLibraryRelPath(relPath = "") {
  const norm = String(relPath).replace(/\\/g, "/").trim();
  if (!norm) return null;
  const parts = norm.split("/").filter((p) => p && p !== "." && p !== "..");
  if (parts.length < 2) return null;
  const top = parts[0];
  const key = normalizeFlatFolderKey(top);
  if (FLAT_LIBRARY_FOLDER_SUBJECT[key]) {
    return { ...FLAT_LIBRARY_FOLDER_SUBJECT[key] };
  }
  const slug = slugifyForLibrarySubject(top);
  const subject_id = `library_${slug}`;
  const subject_name = top.replace(/_/g, " ").trim() || slug;
  return { subject_id, subject_name };
}

/**
 * Normalize display title / filename stem for keyword matching.
 */
function fileLabelFromTitleAndPath(displayTitle, relPath) {
  const fromTitle = String(displayTitle || "").trim();
  const base = fromTitle || String(relPath || "").split("/").pop() || "";
  return base
    .replace(/\.[^./\\]+$/i, "")
    .replace(/_/g, " ")
    .trim();
}

/**
 * Guess subject hub from PDF / file name (e.g. "Calculus", "Music-In-World-Cultures").
 */
export function inferSubjectFromFileLabel(displayTitle, relPath = "") {
  const raw = fileLabelFromTitleAndPath(displayTitle, relPath);
  const s = raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return null;

  if (/\b(nutriti|nutrition|nutrit|diet|vitamin|vitamins|healthy eating|meal plan)\b/.test(s)) {
    return { subject_id: "fitness_nutrition", subject_name: "Fitness & Nutrition" };
  }
  if (/\b(music|musical|composer|orchestra|instrument|songs?|opera|jazz|melody|rhythm)\b/.test(s)) {
    return { subject_id: "hub_music", subject_name: "Music" };
  }
  if (/\b(microeconomics|macroeconomics|econometrics?|economics)\b/.test(s)) {
    return { subject_id: "library_business", subject_name: "Business" };
  }
  if (
    /\b(calculus|probability|algebra|geometry|trigonometry|statistics|statistical|matrix|matrices|mathematic|arithmetic|equation|logarithm|derivative|integral|linear\s+algebra)\b/.test(
      s
    )
  ) {
    return { subject_id: "core_math", subject_name: "Mathematics" };
  }
  if (/\b(biology|chemistry|physics|science|laboratory|atom|molecule|organism|ecology)\b/.test(s)) {
    return { subject_id: "core_science", subject_name: "Science" };
  }
  if (/\b(history|historical|civilization|empire|ancient|revolution|renaissance|archaeology)\b/.test(s)) {
    return { subject_id: "hub_history", subject_name: "History" };
  }
  if (/\b(english|writing|grammar|essay|literature|vocabulary|composition|spelling)\b/.test(s)) {
    return { subject_id: "english_basics", subject_name: "English" };
  }
  return null;
}

/**
 * Subject for uploaded files (path hints + title/filename inference).
 */
export function resolveLibrarySubjectForFile(moduleId, relPath = "", displayTitle = "") {
  const p = String(relPath).toLowerCase().replace(/\\/g, "/");
  const inferred = inferSubjectFromFileLabel(displayTitle, relPath);

  if (moduleId === "core_curriculum") {
    if (p.includes("math")) {
      return { subject_id: "core_math", subject_name: "Mathematics" };
    }
    if (p.includes("science")) {
      return { subject_id: "core_science", subject_name: "Science" };
    }
    if (inferred) return inferred;
    return { subject_id: "core_curriculum", subject_name: "Core curriculum" };
  }

  if (moduleId === FLAT_LIBRARY_MODULE_ID) {
    const fromPath = subjectFromFlatLibraryRelPath(relPath);
    if (fromPath) return fromPath;
    if (inferred) return inferred;
    return { subject_id: "core_curriculum", subject_name: "Core curriculum" };
  }

  if (inferred) {
    return inferred;
  }
  return resolveLibrarySubject(moduleId, { id: "__files__" });
}

/**
 * Ordered tiles: primary hubs (match learner UI) then extra courses.
 * `virtual` = show even with 0 articles.
 */
/** Single Unicode emoji per subject (plain string); keep in sync with `library_subjects` DB seed. */
export const LIBRARY_SUBJECT_DEFINITIONS = [
  {
    id: "core_math",
    name: "Mathematics",
    description: "Numbers, shapes, and problem solving",
    icon: "🔢",
    iconKind: "math",
    virtual: false,
  },
  {
    id: "english_basics",
    name: "English",
    description: "Reading, writing, and language",
    icon: "✏️",
    iconKind: "english",
    virtual: false,
  },
  {
    id: "hub_history",
    name: "History",
    description: "People, events, and civilizations",
    icon: "🏛️",
    iconKind: "history",
    virtual: true,
  },
  {
    id: "core_science",
    name: "Science",
    description: "Biology, physics, chemistry, and more",
    icon: "🔬",
    iconKind: "science",
    virtual: false,
  },
  {
    id: "hub_music",
    name: "Music",
    description: "Theory, history, and appreciation",
    icon: "🎵",
    iconKind: "music",
    virtual: true,
  },
  {
    id: "hub_wikipedia",
    name: "Wikipedia",
    description: "Encyclopedia articles on any topic",
    icon: "🌐",
    iconKind: "wikipedia",
    virtual: true,
  },
  {
    id: "core_curriculum",
    name: "Core curriculum",
    description: "Cross-topic lessons, course files, and PDFs from your Library folder",
    icon: "📚",
    iconKind: "course",
    virtual: false,
  },
  {
    id: "mental_health",
    name: "Wellbeing",
    description: "Mental health and emotional skills",
    icon: "🧠",
    iconKind: "wellbeing",
    virtual: false,
  },
  {
    id: "fitness_nutrition",
    name: "Fitness & Nutrition",
    description: "Movement, food, and healthy habits",
    icon: "⚽",
    iconKind: "fitness",
    virtual: false,
  },
];

const DEFINITION_ICON_BY_ID = Object.fromEntries(
  LIBRARY_SUBJECT_DEFINITIONS.map((d) => [d.id, d.icon || ""])
);

/**
 * Tile emoji + SubjectCard `iconKind` for library-folder hubs and fallbacks.
 * Used for subject grid tiles and list-row icon tinting (see Library.jsx).
 */
const SUBJECT_HUB_VISUAL = {
  library_business: { icon: "💼", iconKind: "library_business" },
  library_computer_science: { icon: "💻", iconKind: "library_computer_science" },
  library_engineering: { icon: "⚙️", iconKind: "library_engineering" },
  library_philosophy: { icon: "🧭", iconKind: "library_philosophy" },
  library_psychology: { icon: "🧩", iconKind: "library_psychology" },
  library_sociology: { icon: "👥", iconKind: "library_sociology" },
};

/**
 * Emoji + iconKind for any subject id (definitions, library hubs, unknown `library_*`).
 */
export function getSubjectHubVisual(subjectId) {
  const id = String(subjectId || "").trim();
  if (SUBJECT_HUB_VISUAL[id]) {
    return { ...SUBJECT_HUB_VISUAL[id] };
  }
  const fromDef = LIBRARY_SUBJECT_DEFINITIONS.find((d) => d.id === id);
  if (fromDef) {
    return {
      icon: fromDef.icon && String(fromDef.icon).trim() ? fromDef.icon.trim() : "📚",
      iconKind: fromDef.iconKind || "course",
    };
  }
  if (id.startsWith("library_")) {
    return { icon: "📘", iconKind: "library_custom" };
  }
  return { icon: "📚", iconKind: "course" };
}

/**
 * Emoji for a library subject hub (article grouping). Defaults to 📚.
 */
export function getLibrarySubjectIconEmoji(subjectId) {
  return getSubjectHubVisual(subjectId).icon;
}

/**
 * Overlay `icon` from API/DB rows (e.g. `GET /api/library/subjects`) onto built subject rows.
 */
export function mergeLibrarySubjectIconsFromDb(subjects, dbRows) {
  if (!dbRows?.length) return subjects;
  const map = {};
  for (const r of dbRows) {
    if (r?.id && r.icon != null && String(r.icon).trim()) {
      map[r.id] = String(r.icon).trim();
    }
  }
  return subjects.map((s) => ({
    ...s,
    icon: map[s.id] || (s.icon && String(s.icon).trim()) || "📚",
  }));
}

/**
 * Curriculum-backed lessons (markdown/text in YAML) — safe to hide from Library.
 * PDFs and epubs under module content/ are files on disk and are not deletable here.
 */
export function isDeletableLibraryArticle(article) {
  if (!article || article._isContentFile) return false;
  return Boolean(article._moduleId && article._unitId && article._lessonId);
}

export function buildSubjectRows(articles, moduleSummaries) {
  const hasArticles = new Set(articles.map((a) => a.subject_id));
  const modIds = new Set((moduleSummaries || []).map((m) => m.id));

  const toRow = (def) => ({
    id: def.id,
    name: def.name,
    description: def.description,
    icon: def.icon && String(def.icon).trim() ? def.icon.trim() : "📚",
    iconKind: def.iconKind,
    created_date: new Date().toISOString(),
  });

  // Always show the six primary tiles (Math, English, History, Science, Music, Wikipedia)
  const rows = LIBRARY_SUBJECT_DEFINITIONS.slice(0, 6).map(toRow);

  const rest = LIBRARY_SUBJECT_DEFINITIONS.slice(6);
  for (const def of rest) {
    const include = hasArticles.has(def.id) || modIds.has(def.id);
    if (include) rows.push(toRow(def));
  }

  for (const m of moduleSummaries || []) {
    if (m.id === "core_curriculum") continue;
    if (m.id === "_ustud_flat_library") continue;
    if (rows.some((r) => r.id === m.id)) continue;
    if (m.id.startsWith("hub_")) continue;
    rows.push({
      id: m.id,
      name: m.name || m.id,
      description: (m.content_packs || []).join(", ") || "Course",
      icon: "📚",
      iconKind: "course",
      created_date: new Date().toISOString(),
    });
  }

  const rowIds = new Set(rows.map((r) => r.id));
  const extras = [];
  for (const a of articles || []) {
    const sid = a?.subject_id;
    if (!sid || rowIds.has(sid)) continue;
    rowIds.add(sid);
    const vis = getSubjectHubVisual(sid);
    extras.push({
      id: sid,
      name: a.subject_name || sid.replace(/^library_/, "").replace(/_/g, " ") || sid,
      description: "PDFs from your Library folder",
      icon: vis.icon,
      iconKind: vis.iconKind,
      created_date: new Date().toISOString(),
    });
  }
  extras.sort((a, b) => a.name.localeCompare(b.name));
  rows.push(...extras);

  return rows;
}
