import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Globe, FileText, BookMarked, BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";

const FILE_TYPE_ICONS = {
  wikipedia: Globe,
  pdf: FileText,
  book: BookMarked,
  text: BookOpen,
};

export default function ArticleViewer({ article, onBack }) {
  const Icon = FILE_TYPE_ICONS[article.file_type] || BookOpen;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Library
      </Button>

      {/* Header */}
      <div className="mb-8 border-b-2 border-black pb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="flex items-center gap-1.5 text-[10px] font-600 uppercase tracking-wider text-[#666666] border border-[#cccccc] px-2 py-1">
            <Icon className="w-3 h-3" />
            {article.subject_name}
          </span>
          {article.source && (
            <span className="text-xs text-[#999999]">· {article.source}</span>
          )}
        </div>
        <h1 className="text-3xl font-bold mb-3">{article.title}</h1>
        {article.summary && (
          <p className="text-base text-[#666666] italic">{article.summary}</p>
        )}
        {article.tags && article.tags.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {article.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
            ))}
          </div>
        )}
        {article.word_count && (
          <p className="text-xs text-muted-foreground mt-2">
            ~{article.word_count.toLocaleString()} words · {Math.ceil(article.word_count / 200)} min read
          </p>
        )}
      </div>

      {/* Content */}
      <div className="prose-wrapper">
        {article.file_type === "pdf" && article.file_url ? (
          <iframe
            title={article.title}
            src={article.file_url}
            className="w-full min-h-[75vh] border border-[#e5e5e5] bg-white"
          />
        ) : article.content ? (
          <div className="markdown-content text-foreground leading-relaxed">
            <ReactMarkdown>{article.content}</ReactMarkdown>
          </div>
        ) : article.file_url ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-muted-foreground mb-4">This article is stored as a file.</p>
            <Button asChild>
              <a href={article.file_url} target="_blank" rel="noopener noreferrer">Open File</a>
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground">No content available.</p>
        )}
      </div>
    </div>
  );
}