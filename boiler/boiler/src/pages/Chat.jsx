import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Send, BookOpen, Sparkles, Plus, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatMessage from "@/components/chat/ChatMessage";
import EmptyChatState from "@/components/chat/EmptyChatState";

export default function Chat() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [librarySearch, setLibrarySearch] = useState(false);
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState("llama3");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadUser = async () => {
    const u = await base44.auth.me();
    setUser(u);
    const profiles = await base44.entities.StudentProfile.filter({ user_email: u.email });
    if (profiles.length > 0) setProfile(profiles[0]);
    const convos = await base44.entities.ChatConversation.filter({ user_email: u.email }, "-updated_date", 30);
    setConversations(convos);
  };

  const startNewConversation = () => {
    setActiveConversation(null);
    setMessages([]);
    setInput("");
  };

  const loadConversation = async (convo) => {
    setActiveConversation(convo);
    setMessages(convo.messages || []);
    setLibrarySearch(convo.library_search_enabled || false);
  };

  const buildSystemPrompt = () => {
    let sys = `You are a friendly, patient educational assistant called LearnSpace. 
You help students learn and understand topics clearly and engagingly.
Use simple, encouraging language appropriate for students.`;

    if (profile) {
      sys += `\n\nStudent profile:
Name: ${profile.first_name} ${profile.last_name || ""}
Learning style: ${profile.learning_style || "unknown"}
Personality type: ${profile.personality_type || "unknown"}`;
      if (profile.ai_context_summary) {
        sys += `\nTeaching notes: ${profile.ai_context_summary}`;
      }
    }
    return sys;
  };

  const searchLibrary = async (query) => {
    const articles = await base44.entities.LibraryArticle.list("-created_date", 100);
    const lower = query.toLowerCase();
    const matches = articles.filter(a =>
      a.title?.toLowerCase().includes(lower) ||
      a.content?.toLowerCase().includes(lower) ||
      a.summary?.toLowerCase().includes(lower) ||
      a.tags?.some(t => t.toLowerCase().includes(lower))
    ).slice(0, 3);

    if (matches.length === 0) return null;
    return matches.map(m =>
      `--- Article: "${m.title}" ---\n${m.content ? m.content.slice(0, 1500) : m.summary || ""}`
    ).join("\n\n");
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = { role: "user", content: input.trim(), timestamp: new Date().toISOString(), used_library: false };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    let libraryContext = null;
    if (librarySearch) {
      libraryContext = await searchLibrary(input.trim());
    }

    const systemPrompt = buildSystemPrompt();
    const contextualPrompt = libraryContext
      ? `${systemPrompt}\n\nRelevant library content found:\n${libraryContext}\n\nUse the above content to inform your answer if relevant.`
      : systemPrompt;

    const ollamaMessages = [
      { role: "system", content: contextualPrompt },
      ...newMessages.map(m => ({ role: m.role, content: m.content }))
    ];

    let assistantContent = "";
    try {
      const response = await fetch(`${ollamaUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: ollamaModel,
          messages: ollamaMessages,
          stream: true
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const assistantMsg = { role: "assistant", content: "", timestamp: new Date().toISOString(), used_library: !!libraryContext };
      const withAssistant = [...newMessages, assistantMsg];
      setMessages(withAssistant);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter(l => l.trim());
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.message?.content) {
              assistantContent += parsed.message.content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...updated[updated.length - 1], content: assistantContent };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch (err) {
      assistantContent = "⚠️ Could not connect to Ollama. Make sure Ollama is running at " + ollamaUrl + " and the model `" + ollamaModel + "` is installed.";
      setMessages(prev => {
        const updated = [...prev];
        if (updated[updated.length - 1].role === "assistant") {
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: assistantContent };
        } else {
          updated.push({ role: "assistant", content: assistantContent, timestamp: new Date().toISOString(), used_library: false });
        }
        return updated;
      });
    }

    const finalMessages = newMessages.concat([{
      role: "assistant", content: assistantContent,
      timestamp: new Date().toISOString(), used_library: !!libraryContext
    }]);

    if (activeConversation) {
      const updated = await base44.entities.ChatConversation.update(activeConversation.id, {
        messages: finalMessages, library_search_enabled: librarySearch
      });
      setActiveConversation(updated);
      setConversations(prev => prev.map(c => c.id === updated.id ? updated : c));
    } else {
      const title = input.trim().slice(0, 50) + (input.length > 50 ? "..." : "");
      const u = user || await base44.auth.me();
      const newConvo = await base44.entities.ChatConversation.create({
        title, user_email: u.email, messages: finalMessages, library_search_enabled: librarySearch
      });
      setActiveConversation(newConvo);
      setConversations(prev => [newConvo, ...prev]);
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

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b-2 border-black bg-white px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-black flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm uppercase tracking-wide">
                {activeConversation?.title || "New Conversation"}
              </h1>
              <p className="text-[10px] text-[#666666] uppercase tracking-wider">AI Tutor · {ollamaModel}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-[#666666]" />
              <Label htmlFor="lib-search" className="text-[10px] text-[#666666] cursor-pointer normal-case tracking-normal font-500">
                Search library
              </Label>
              <Switch
                id="lib-search"
                checked={librarySearch}
                onCheckedChange={setLibrarySearch}
              />
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 ? (
            <EmptyChatState profile={profile} onPrompt={(p) => setInput(p)} />
          ) : (
            <div className="max-w-3xl mx-auto space-y-1">
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <ChatMessage key={i} message={msg} isLoading={isLoading && i === messages.length - 1 && msg.role === "assistant" && msg.content === ""} />
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

        {/* Input */}
        <div className="border-t-2 border-black bg-white px-4 py-4">
          <div className="max-w-3xl mx-auto">
            {librarySearch && (
              <div className="flex items-center gap-2 mb-2 text-xs text-[#333333] bg-[#f5f5f5] border border-[#e5e5e5] px-3 py-1.5">
                <BookOpen className="w-3 h-3" />
                Library search is on — I'll look through your books & articles first
              </div>
            )}
            <div className="flex gap-2 items-end">
              <Textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything... (Enter to send, Shift+Enter for new line)"
                className="resize-none min-h-[52px] max-h-[200px] flex-1 bg-white border border-[#cccccc] text-sm focus:border-black"
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