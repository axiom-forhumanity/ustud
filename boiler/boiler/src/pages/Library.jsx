import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, BookOpen, ArrowLeft, FileText, Globe, BookMarked } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AppLayout from "@/components/layout/AppLayout";
import SubjectCard from "@/components/library/SubjectCard";
import ArticleViewer from "@/components/library/ArticleViewer";

const FILE_TYPE_ICONS = {
  wikipedia: <Globe className="w-4 h-4" />,
  pdf: <FileText className="w-4 h-4" />,
  book: <BookMarked className="w-4 h-4" />,
  text: <BookOpen className="w-4 h-4" />,
};

export default function Library() {
  const [subjects, setSubjects] = useState([]);
  const [articles, setArticles] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [readArticleIds, setReadArticleIds] = useState(new Set());

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const u = await base44.auth.me();
    setUser(u);
    const [subs, arts, progress] = await Promise.all([
      base44.entities.LibrarySubject.list("-created_date", 50),
      base44.entities.LibraryArticle.list("-created_date", 200),
      base44.entities.ReadingProgress.filter({ user_email: u.email }, "-created_date", 500),
    ]);
    setSubjects(subs);
    setArticles(arts);
    setReadArticleIds(new Set(progress.map(p => p.article_id)));
    setLoading(false);
  };

  const handleOpenArticle = async (article) => {
    setSelectedArticle(article);
    if (!readArticleIds.has(article.id)) {
      setReadArticleIds(prev => new Set([...prev, article.id]));
      await base44.entities.ReadingProgress.create({
        user_email: user.email,
        article_id: article.id,
        subject_id: article.subject_id,
      });
    }
  };

  const filteredArticles = articles.filter(a => {
    const matchesSubject = !selectedSubject || a.subject_id === selectedSubject.id;
    const matchesSearch = !search ||
      a.title?.toLowerCase().includes(search.toLowerCase()) ||
      a.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()));
    return matchesSubject && matchesSearch;
  });

  const isAdmin = user?.role === "admin";

  if (selectedArticle) {
    return (
      <AppLayout>
        <ArticleViewer
          article={selectedArticle}
          onBack={() => setSelectedArticle(null)}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
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
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Subjects grid (only shown when not in a subject) */}
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
                {subjects.map(subject => (
                  <SubjectCard
                    key={subject.id}
                    subject={subject}
                    articleCount={articles.filter(a => a.subject_id === subject.id).length}
                    readCount={articles.filter(a => a.subject_id === subject.id && readArticleIds.has(a.id)).length}
                    onClick={() => setSelectedSubject(subject)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Articles list */}
        {(selectedSubject || search) && (
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
                  {filteredArticles.map((article, i) => (
                    <motion.button
                      key={article.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => handleOpenArticle(article)}
                      className="w-full text-left bg-white border border-[#e5e5e5] px-5 py-4 hover:border-black hover:bg-[#f5f5f5] transition-all duration-150 group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-muted-foreground flex-shrink-0">
                            {FILE_TYPE_ICONS[article.file_type] || <BookOpen className="w-4 h-4" />}
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                              {article.title}
                            </p>
                            {article.summary && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{article.summary}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {article.tags?.slice(0, 2).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                          ))}
                          {readArticleIds.has(article.id) && (
                            <span className="w-2 h-2 bg-green-500 flex-shrink-0" title="Read" />
                          )}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {/* Wikipedia progress on home view */}
        {!selectedSubject && !search && !loading && articles.filter(a => a.file_type === "wikipedia").length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-[#666666] uppercase tracking-wider mb-3">Wikipedia Articles</h2>
            <div className="bg-white border border-[#e5e5e5] p-4">
              {(() => {
                const wikiArts = articles.filter(a => a.file_type === "wikipedia");
                const wikiRead = wikiArts.filter(a => readArticleIds.has(a.id)).length;
                const pct = wikiArts.length > 0 ? Math.round((wikiRead / wikiArts.length) * 100) : 0;
                const endColor = pct === 100 ? "#22c55e" : pct > 60 ? "#4ade80" : pct > 30 ? "#86efac" : "#cccccc";
                return (
                  <>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-[#666666]">{wikiRead} of {wikiArts.length} articles accessed</span>
                      <span style={{ color: pct > 0 ? "#22c55e" : "#999999" }} className="font-bold">{pct}%</span>
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
    </AppLayout>
  );
}