import React, { useState, useEffect, useMemo } from "react";
import { ustud } from "@/api/ustudClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  BookOpen,
  ArrowLeft,
  FileText,
  Globe,
  BookMarked,
  Calculator,
  Pencil,
  Landmark,
  Microscope,
  Music,
  Heart,
  Dumbbell,
  Trash2,
  Briefcase,
  Laptop,
  Cog,
  Compass,
  Puzzle,
  Users,
  Library as LibraryBuildingIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AppLayout from "@/components/layout/AppLayout";
import SubjectCard from "@/components/library/SubjectCard";
import ReadingRoom from "@/components/library/ReadingRoom";
import WikipediaExplorer from "@/components/library/WikipediaExplorer";
import PdfCoverThumbnail from "@/components/library/PdfCoverThumbnail";
import {
  isVagueCurriculumLesson,
  resolveLibrarySubject,
  resolveLibrarySubjectForFile,
  buildSubjectRows,
  isDeletableLibraryArticle,
} from "@/lib/librarySubjects";
import { sortLibraryArticles } from "@/lib/libraryArticleSort";

const READING_PROGRESS_KEY = "ustud_library_read_progress";
/** Hidden curriculum lesson ids (non-PDF articles only); does not delete course files on disk. */
const LIBRARY_HIDDEN_ARTICLES_KEY = "ustud_library_hidden_article_ids";

const FILE_TYPE_ICONS = {
  wikipedia: <Globe className="w-4 h-4" />,
  pdf: <FileText className="w-4 h-4" />,
  book: <BookMarked className="w-4 h-4" />,
  text: <BookOpen className="w-4 h-4" />,
};

/** Row icon by subject (PDFs / lessons grouped under hub). */
const SUBJECT_ROW_ICONS = {
  core_math: <Calculator className="w-4 h-4 text-[#2563eb]" />,
  english_basics: <Pencil className="w-4 h-4 text-[#ea580c]" />,
  hub_history: <Landmark className="w-4 h-4 text-[#57534e]" />,
  core_science: <Microscope className="w-4 h-4 text-[#0d9488]" />,
  hub_music: <Music className="w-4 h-4 text-[#7c3aed]" />,
  hub_wikipedia: <Globe className="w-4 h-4 text-[#059669]" />,
  mental_health: <Heart className="w-4 h-4 text-[#db2777]" />,
  fitness_nutrition: <Dumbbell className="w-4 h-4 text-[#ca8a04]" />,
  core_curriculum: <BookOpen className="w-4 h-4 text-[#334155]" />,
  library_business: <Briefcase className="w-4 h-4 text-[#b45309]" />,
  library_computer_science: <Laptop className="w-4 h-4 text-[#4f46e5]" />,
  library_engineering: <Cog className="w-4 h-4 text-[#ea580c]" />,
  library_philosophy: <Compass className="w-4 h-4 text-[#7c3aed]" />,
  library_psychology: <Puzzle className="w-4 h-4 text-[#db2777]" />,
  library_sociology: <Users className="w-4 h-4 text-[#0d9488]" />,
  library_custom: <LibraryBuildingIcon className="w-4 h-4 text-[#0369a1]" />,
};

function articleListIcon(article) {
  if (article.file_type === "pdf" || article.file_type === "book") {
    return SUBJECT_ROW_ICONS[article.subject_id] || <FileText className="w-4 h-4 text-muted-foreground" />;
  }
  return FILE_TYPE_ICONS[article.file_type] || <BookOpen className="w-4 h-4" />;
}

/** Map UStud modules + curriculum into library subjects and articles (filters vague lessons). */
async function fetchLibraryFromUStud() {
  const mods = await ustud.listModules();

  const articles = [];
  for (const m of mods) {
    let units = [];
    try {
      const cur = await ustud.getCurriculum(m.id);
      units = cur.units || [];
    } catch {
      units = [];
    }
    for (const unit of units) {
      for (const lesson of unit.lessons || []) {
        if (isVagueCurriculumLesson(lesson)) continue;
        const { subject_id, subject_name } = resolveLibrarySubject(m.id, unit);
        articles.push({
          id: `${m.id}__${unit.id}__${lesson.id}`,
          title: lesson.title,
          summary: lesson.description,
          content: "",
          subject_id,
          subject_name,
          file_type: "text",
          tags: lesson.topics || [],
          _unitId: unit.id,
          _lessonId: lesson.id,
          _moduleId: m.id,
          created_date: new Date().toISOString(),
        });
      }
    }

    try {
      const fileRes = await ustud.listModuleFiles(m.id);
      const files = fileRes.files || [];
      for (const f of files) {
        const encPath = f.rel_path.split("/").map(encodeURIComponent).join("/");
        const file_url = `/api/modules/${encodeURIComponent(m.id)}/content/${encPath}`;
        const baseTitle = f.title || f.rel_path;
        const displayTitle = (f.display_title && String(f.display_title).trim()) || baseTitle;
        const { subject_id, subject_name } = resolveLibrarySubjectForFile(m.id, f.rel_path, displayTitle);
        const ro = f.read_order;
        articles.push({
          id: `${m.id}__file__${f.rel_path}`,
          title: displayTitle,
          summary: "",
          content: "",
          subject_id,
          subject_name,
          file_type: f.file_type || "pdf",
          tags: [],
          _moduleId: m.id,
          _isContentFile: true,
          file_url,
          author: f.author || f.publisher || "",
          page_count: typeof f.page_count === "number" ? f.page_count : undefined,
          read_order: typeof ro === "number" && Number.isFinite(ro) ? ro : undefined,
          _libraryRelPath: f.rel_path,
          created_date: new Date().toISOString(),
        });
      }
    } catch {
      /* module may have no files endpoint data */
    }
  }
  return { articles: sortLibraryArticles(articles), moduleSummaries: mods };
}

function loadReadIds() {
  try {
    const raw = localStorage.getItem(READING_PROGRESS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveReadIds(set) {
  localStorage.setItem(READING_PROGRESS_KEY, JSON.stringify([...set]));
}

function loadHiddenArticleIds() {
  try {
    const raw = localStorage.getItem(LIBRARY_HIDDEN_ARTICLES_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function saveHiddenArticleIds(set) {
  localStorage.setItem(LIBRARY_HIDDEN_ARTICLES_KEY, JSON.stringify([...set]));
}

export default function Library() {
  const [articles, setArticles] = useState([]);
  const [moduleSummaries, setModuleSummaries] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [readArticleIds, setReadArticleIds] = useState(loadReadIds);
  const [hiddenArticleIds, setHiddenArticleIds] = useState(loadHiddenArticleIds);
  const [articlePendingRemove, setArticlePendingRemove] = useState(null);
  const [zimDeepLinkTitle, setZimDeepLinkTitle] = useState(null);
  const zimDeepLinkHandledRef = React.useRef(false);

  const visibleArticles = useMemo(
    () => articles.filter((a) => !hiddenArticleIds.has(a.id)),
    [articles, hiddenArticleIds]
  );

  const subjects = useMemo(
    () => buildSubjectRows(visibleArticles, moduleSummaries),
    [visibleArticles, moduleSummaries]
  );

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (zimDeepLinkHandledRef.current || !subjects.length) return;
    const sp = new URLSearchParams(window.location.search);
    const raw = sp.get("openZimTitle");
    if (!raw?.trim()) return;
    zimDeepLinkHandledRef.current = true;
    const title = decodeURIComponent(raw.trim());
    sp.delete("openZimTitle");
    const qs = sp.toString();
    const hash = window.location.hash?.startsWith("#") ? window.location.hash : "#/library";
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}${hash}`);
    const hub = subjects.find((s) => s.id === "hub_wikipedia");
    if (hub) setSelectedSubject(hub);
    setZimDeepLinkTitle(title);
  }, [subjects]);

  const loadAll = async () => {
    setLoading(true);
    setUser({ email: "learner@local", role: "user" });
    try {
      const { articles: arts, moduleSummaries: mods } = await fetchLibraryFromUStud();
      setArticles(arts);
      setModuleSummaries(mods);
    } catch {
      setArticles([]);
      setModuleSummaries([]);
    }
    setLoading(false);
  };

  const confirmRemoveArticle = () => {
    const a = articlePendingRemove;
    if (!a?.id) {
      setArticlePendingRemove(null);
      return;
    }
    const nextHidden = new Set([...hiddenArticleIds, a.id]);
    setHiddenArticleIds(nextHidden);
    saveHiddenArticleIds(nextHidden);
    if (readArticleIds.has(a.id)) {
      const nextRead = new Set([...readArticleIds]);
      nextRead.delete(a.id);
      setReadArticleIds(nextRead);
      saveReadIds(nextRead);
    }
    setArticlePendingRemove(null);
    if (selectedArticle?.id === a.id) setSelectedArticle(null);
  };

  const handleOpenArticle = async (article) => {
    let opened = { ...article };

    if (article._isContentFile && article.file_url) {
      setSelectedArticle(opened);
      if (!readArticleIds.has(opened.id)) {
        const next = new Set([...readArticleIds, opened.id]);
        setReadArticleIds(next);
        saveReadIds(next);
      }
      return;
    }

    if (article._moduleId && article._unitId && article._lessonId) {
      try {
        const full = await ustud.getLesson(article._moduleId, article._unitId, article._lessonId);
        opened = {
          ...article,
          title: full.title,
          summary: full.description,
          content: full.content || full.description,
          tags: full.topics || article.tags,
        };
      } catch {
        /* keep stub lesson */
      }
    }

    setSelectedArticle(opened);
    if (!readArticleIds.has(opened.id)) {
      const next = new Set([...readArticleIds, opened.id]);
      setReadArticleIds(next);
      saveReadIds(next);
    }
  };

  const filteredArticles = visibleArticles.filter((a) => {
    const matchesSubject = !selectedSubject || a.subject_id === selectedSubject.id;
    const matchesSearch =
      !search ||
      a.title?.toLowerCase().includes(search.toLowerCase()) ||
      a.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    return matchesSubject && matchesSearch;
  });

  const isAdmin = user?.role === "admin";

  if (selectedArticle) {
    return (
      <AppLayout>
        <ReadingRoom article={selectedArticle} onBack={() => setSelectedArticle(null)} />
      </AppLayout>
    );
  }

  if (selectedSubject?.id === "hub_wikipedia" && !search) {
    return (
      <AppLayout>
        <div className="flex flex-col h-[calc(100dvh-3.5rem)] min-h-0 bg-white text-[#202122] [color-scheme:light]">
          <header className="shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-[#e5e5e5] bg-white">
            <Button variant="ghost" size="sm" onClick={() => setSelectedSubject(null)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold truncate">{selectedSubject.name}</h1>
              {selectedSubject.description ? (
                <p className="text-xs text-muted-foreground truncate">{selectedSubject.description}</p>
              ) : null}
            </div>
          </header>
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <WikipediaExplorer
              initialZimTitle={zimDeepLinkTitle}
              onInitialZimConsumed={() => setZimDeepLinkTitle(null)}
            />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          {selectedSubject ? (
            <div className="flex items-center gap-3 mb-4">
              <Button variant="ghost" size="sm" onClick={() => setSelectedSubject(null)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <div>
                <h1 className="text-2xl font-semibold">{selectedSubject.name}</h1>
                <p className="text-muted-foreground text-sm">{selectedSubject.description}</p>
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <h1 className="text-2xl font-bold mb-1 uppercase tracking-tight">Library</h1>
              <p className="text-[#666666] text-sm">Browse your subjects and articles</p>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {!selectedSubject && !search && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Subjects</h2>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
                ))}
              </div>
            ) : subjects.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No subjects yet.{isAdmin ? " Add some from the Admin panel." : " Ask your teacher to add subjects."}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {subjects.map((subject) => (
                  <SubjectCard
                    key={subject.id}
                    subject={subject}
                    articleCount={visibleArticles.filter((a) => a.subject_id === subject.id).length}
                    readCount={visibleArticles.filter((a) => a.subject_id === subject.id && readArticleIds.has(a.id)).length}
                    onClick={() => setSelectedSubject(subject)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {((selectedSubject && selectedSubject.id !== "hub_wikipedia") || search) && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
              {filteredArticles.length} Article{filteredArticles.length !== 1 ? "s" : ""}
            </h2>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No articles found.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {filteredArticles.map((article, i) => {
                    const deletable = isDeletableLibraryArticle(article);
                    return (
                      <motion.div
                        key={article.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-stretch gap-0 bg-white border border-[#e5e5e5] hover:border-black transition-all duration-150 group"
                      >
                        <button
                          type="button"
                          onClick={() => handleOpenArticle(article)}
                          className="flex-1 min-w-0 text-left px-5 py-4 hover:bg-[#f5f5f5] transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              {article.file_type === "pdf" && article._isContentFile && article.file_url ? (
                                <PdfCoverThumbnail
                                  fileUrl={article.file_url}
                                  fallback={
                                    <span className="text-muted-foreground flex h-full w-full items-center justify-center">
                                      {articleListIcon(article)}
                                    </span>
                                  }
                                />
                              ) : (
                                <span className="text-muted-foreground flex-shrink-0">{articleListIcon(article)}</span>
                              )}
                              <div className="min-w-0">
                                <p className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                                  {article.title}
                                </p>
                                {article._isContentFile && (article.author || article.page_count != null) ? (
                                  <p className="text-xs text-[#888888] mt-0.5 truncate">
                                    {[
                                      article.author || null,
                                      article.page_count != null ? `${article.page_count} pages` : null,
                                    ]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </p>
                                ) : null}
                                {article.summary ? (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{article.summary}</p>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {article.tags?.slice(0, 2).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {readArticleIds.has(article.id) && (
                                <span className="w-2 h-2 bg-green-500 flex-shrink-0" title="Read" />
                              )}
                            </div>
                          </div>
                        </button>
                        {deletable && (
                          <div className="flex items-center pr-2 border-l border-[#e5e5e5] bg-[#fafafa]">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                              title="Remove from Library"
                              aria-label={`Remove ${article.title} from Library`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setArticlePendingRemove(article);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {!selectedSubject && !search && !loading && visibleArticles.filter((a) => a.file_type === "wikipedia").length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-[#666666] uppercase tracking-wider mb-3">Wikipedia Articles</h2>
            <div className="bg-white border border-[#e5e5e5] p-4">
              {(() => {
                const wikiArts = visibleArticles.filter((a) => a.file_type === "wikipedia");
                const wikiRead = wikiArts.filter((a) => readArticleIds.has(a.id)).length;
                const pct = wikiArts.length > 0 ? Math.round((wikiRead / wikiArts.length) * 100) : 0;
                const endColor = pct === 100 ? "#22c55e" : pct > 60 ? "#4ade80" : pct > 30 ? "#86efac" : "#cccccc";
                return (
                  <>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-[#666666]">
                        {wikiRead} of {wikiArts.length} articles accessed
                      </span>
                      <span style={{ color: pct > 0 ? "#22c55e" : "#999999" }} className="font-bold">
                        {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#e5e5e5] w-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="h-full"
                        style={{ background: `linear-gradient(to right, #cccccc, ${endColor})` }}
                      />
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!articlePendingRemove} onOpenChange={(open) => !open && setArticlePendingRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Library?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{articlePendingRemove?.title}&quot; will be hidden from your Library list. This only affects what you
              see here; it does not delete PDFs or other files from course folders on your computer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmRemoveArticle}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
