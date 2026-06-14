import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, MessageSquare, Settings, ChevronDown, BookOpen, User } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

export default function ChatSidebar({
  conversations,
  activeConversation,
  onSelect,
  onNew,
  profile,
  ollamaUrl,
  setOllamaUrl,
  ollamaModel,
  setOllamaModel,
}) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="w-60 flex-shrink-0 border-r-2 border-black bg-white flex flex-col h-screen">
      {/* Logo */}
      <div className="px-4 py-3 border-b-2 border-black">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-black flex items-center justify-center">
            <span className="text-white text-xs font-bold">L</span>
          </div>
          <span className="font-bold text-xs uppercase tracking-widest">LearnSpace</span>
        </div>
        <Button onClick={onNew} className="w-full h-8 text-xs uppercase tracking-wider font-600 bg-black text-white hover:bg-[#222]" size="sm">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> New Chat
        </Button>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto py-1">
        {conversations.length === 0 ? (
          <p className="text-xs text-[#999999] text-center py-8 px-4">No conversations yet</p>
        ) : (
          <div>
            {conversations.map((convo) => (
              <button
                key={convo.id}
                onClick={() => onSelect(convo)}
                className={`w-full text-left px-4 py-2.5 text-xs transition-all border-b border-[#e5e5e5] ${activeConversation?.id === convo.id ? "bg-black text-white" : "hover:bg-[#f5f5f5] text-[#333333]"}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare className="w-3 h-3 flex-shrink-0 opacity-50" />
                  <span className="truncate font-500">{convo.title || "Untitled"}</span>
                </div>
                <p className={`text-xs mt-0.5 pl-5 ${activeConversation?.id === convo.id ? "text-[#cccccc]" : "text-[#999999]"}`}>
                  {convo.updated_date ? format(new Date(convo.updated_date), "MMM d") : ""}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="border-t-2 border-black">
        <Link to="/library" className="flex items-center gap-2 px-4 py-3 text-xs text-[#666666] hover:text-black hover:bg-[#f5f5f5] border-b border-[#e5e5e5] uppercase tracking-wider font-600">
          <BookOpen className="w-3.5 h-3.5" /> Library
        </Link>
        <Link to="/profile" className="flex items-center gap-2 px-4 py-3 text-xs text-[#666666] hover:text-black hover:bg-[#f5f5f5] border-b border-[#e5e5e5] uppercase tracking-wider font-600">
          <User className="w-3.5 h-3.5" />
          {profile ? profile.first_name : "Profile"}
        </Link>

        {/* AI Settings */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 px-4 py-3 text-xs text-[#666666] hover:text-black hover:bg-[#f5f5f5] w-full uppercase tracking-wider font-600"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>AI Settings</span>
          <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${showSettings ? "rotate-180" : ""}`} />
        </button>

        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="px-4 pb-3 space-y-2 bg-[#f5f5f5] border-t border-[#e5e5e5]"
          >
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-[#666666]">Ollama URL</Label>
              <Input value={ollamaUrl} onChange={(e) => setOllamaUrl(e.target.value)} className="h-7 text-xs mt-1 border border-[#cccccc] bg-white" />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-[#666666]">Model</Label>
              <Input value={ollamaModel} onChange={(e) => setOllamaModel(e.target.value)} placeholder="llama3" className="h-7 text-xs mt-1 border border-[#cccccc] bg-white" />
            </div>
            <p className="text-[10px] text-[#888888] leading-snug">
              UStud uses Ollama via the backend. Turn on &quot;Wikipedia &amp; course packs&quot; in the chat header to search before answering.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
