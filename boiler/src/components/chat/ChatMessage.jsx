import React from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Sparkles, User, BookOpen } from "lucide-react";

export default function ChatMessage({ message, isLoading, usedLibraryLabel }) {
  const isAssistant = message.role === "assistant";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 py-3 ${isAssistant ? "" : "flex-row-reverse"}`}
    >
      {/* Avatar */}
      <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0 border ${isAssistant ? "bg-[#f5f5f5] border-[#e5e5e5]" : "bg-black border-black"}`}>
        {isAssistant
          ? <Sparkles className="w-4 h-4 text-[#333333]" />
          : <User className="w-4 h-4 text-white" />
        }
      </div>

      {/* Bubble */}
      <div className={`max-w-[80%] ${isAssistant ? "" : "items-end flex flex-col"}`}>
        <div
          dir="auto"
          className={`px-4 py-3 text-sm leading-relaxed ${
            isAssistant
              ? "bg-white border border-[#e5e5e5] text-[#111111]"
              : "bg-black text-white"
          }`}
        >
          {isLoading ? (
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          ) : isAssistant ? (
            <div className="markdown-content" dir="auto">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>
        {isAssistant && message.used_library && (
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground" dir="auto">
            <BookOpen className="w-3 h-3 shrink-0" /> {usedLibraryLabel ?? "Used library"}
          </div>
        )}
      </div>
    </motion.div>
  );
}