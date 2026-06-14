import React, { useState, useEffect, useRef } from "react";
import { ustud } from "@/api/ustudClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Send, BookOpen, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatMessage from "@/components/chat/ChatMessage";
import EmptyChatState from "@/components/chat/EmptyChatState";
import ChatLanguageToggle from "@/components/chat/ChatLanguageToggle";
import { PROFILE_STORAGE_KEY, getLearnerProfileForApi } from "@/lib/learnerProfile";
import { useChatLanguage } from "@/hooks/useChatLanguage";
import { useAutosizeTextarea } from "@/hooks/useAutosizeTextarea";

const STORAGE_KEY = "ustud_conversations";

function loadStoredConversations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveConversations(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (_) {}
}

export default function Chat() {
  const [profile] = useState(() => {
    try {
      const p = localStorage.getItem(PROFILE_STORAGE_KEY);
      return p ? JSON.parse(p) : null;
    } catch {
      return null;
    }
  });
  const [conversations, setConversations] = useState(loadStoredConversations);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [librarySearch, setLibrarySearch] = useState(false);
  const [moduleId, setModuleId] = useState(null);
  const [unitId, setUnitId] = useState(null);
  const [lessonId, setLessonId] = useState(null);
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState("gemma3:4b");
  const [starterPromptsKey, setStarterPromptsKey] = useState(0);
  const [chatLanguage, setChatLanguage] = useChatLanguage();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  useAutosizeTextarea(inputRef, input, { minHeight: 52, maxHeight: 200 });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startNewConversation = () => {
    setActiveConversation(null);
    setMessages([]);
    setInput("");
    setStarterPromptsKey((k) => k + 1);
  };

  const loadConversation = (convo) => {
    setActiveConversation(convo);
    setMessages(convo.messages || []);
    setLibrarySearch(convo.library_search_enabled || false);
    setModuleId(convo.module_id || null);
    setUnitId(convo.unit_id || null);
    setLessonId(convo.lesson_id || null);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    const userMsg = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
      used_library: false,
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    let lessonContext = "";
    let usedLibrary = false;
    if (librarySearch) {
      try {
        const sr = await ustud.search(text, true);
        usedLibrary = !!(sr.results?.length || sr.synthesis);
        const parts = [];
        if (sr.synthesis) parts.push(`Summary:\n${sr.synthesis}`);
        for (const r of (sr.results || []).slice(0, 6)) {
          parts.push(`[${r.source || "Source"}] ${r.title || ""}\n${r.snippet || r.content || ""}`);
        }
        lessonContext = parts.join("\n\n").trim();
      } catch (_) {
        lessonContext = "";
      }
    }

    let assistantContent = "";
    try {
      const lp = getLearnerProfileForApi();
      const res = await ustud.chat({
        message: text,
        lesson_context: lessonContext || undefined,
        module_id: moduleId || undefined,
        lesson_id: lessonId || undefined,
        response_language: chatLanguage,
        ...(lp ? { learner_profile: lp } : {}),
      });
      assistantContent = res.response || "No response.";
    } catch (err) {
      assistantContent =
        "Could not reach the server. Start UStud (`python run.py` on port 8765) and ensure Ollama is running.";
    }

    const assistantMsg = {
      role: "assistant",
      content: assistantContent,
      timestamp: new Date().toISOString(),
      used_library: usedLibrary,
    };
    const finalMessages = [...newMessages, assistantMsg];
    setMessages(finalMessages);

    const title = text.slice(0, 50) + (text.length > 50 ? "…" : "");
    const basePayload = {
      title,
      messages: finalMessages,
      library_search_enabled: librarySearch,
      module_id: moduleId,
      unit_id: unitId,
      lesson_id: lessonId,
      updated_date: new Date().toISOString(),
    };

    if (activeConversation) {
      const updated = { ...activeConversation, ...basePayload, id: activeConversation.id };
      setActiveConversation(updated);
      const next = conversations.map((c) => (c.id === updated.id ? updated : c));
      setConversations(next);
      saveConversations(next);
    } else {
      const id = crypto.randomUUID?.() || String(Date.now());
      const newConvo = { id, ...basePayload };
      setActiveConversation(newConvo);
      const next = [newConvo, ...conversations];
      setConversations(next);
      saveConversations(next);
    }

    setIsLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <ChatSidebar
        conversations={conversations}
        activeConversation={activeConversation}
        onSelect={loadConversation}
        onNew={startNewConversation}
        profile={profile}
        ollamaUrl={ollamaUrl}
        setOllamaUrl={setOllamaUrl}
        ollamaModel={ollamaModel}
        setOllamaModel={setOllamaModel}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b-2 border-black bg-white px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-black flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm uppercase tracking-wide">
                {activeConversation?.title || "New Conversation"}
              </h1>
              <p className="text-[10px] text-[#666666] uppercase tracking-wider">
                AI Tutor · {ollamaModel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap justify-end">
            <ChatLanguageToggle value={chatLanguage} onChange={setChatLanguage} />
            <div className="flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-[#666666]" />
              <Label htmlFor="lib-search" className="text-[10px] text-[#666666] cursor-pointer normal-case tracking-normal font-500">
                Search library
              </Label>
              <Switch id="lib-search" checked={librarySearch} onCheckedChange={setLibrarySearch} />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 ? (
            <EmptyChatState
              key={starterPromptsKey}
              profile={profile}
              onPrompt={(p) => setInput(p)}
            />
          ) : (
            <div className="max-w-3xl mx-auto space-y-1">
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <ChatMessage
                    key={i}
                    message={msg}
                    isLoading={isLoading && i === messages.length - 1 && msg.role === "assistant" && msg.content === ""}
                  />
                ))}
              </AnimatePresence>
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 py-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex items-center gap-1 pt-2">
                    <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="border-t-2 border-black bg-white px-4 py-4">
          <div className="max-w-3xl mx-auto">
            {librarySearch && (
              <div className="flex items-center gap-2 mb-2 text-xs text-[#333333] bg-[#f5f5f5] border border-[#e5e5e5] px-3 py-1.5">
                <BookOpen className="w-3 h-3" />
                Library search is on — I&apos;ll look through your books &amp; articles first
              </div>
            )}
            <div className="flex gap-2 items-end">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything… (Enter to send, Shift+Enter for new line)"
                className="resize-none min-h-[52px] flex-1 bg-white border border-[#cccccc] text-sm focus:border-black"
                rows={1}
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="h-[52px] w-[52px] flex-shrink-0 bg-black text-white hover:bg-[#222222]"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
