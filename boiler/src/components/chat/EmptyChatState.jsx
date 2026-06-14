import React, { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { ustud } from "@/api/ustudClient";

const FALLBACK_PROMPTS = [
  "Explain photosynthesis in simple terms",
  "What is the Pythagorean theorem?",
  "Tell me an interesting fact about ancient Rome",
  "How do I write a good paragraph?",
  "What is a musical scale?",
  "Help me understand fractions",
];

/** Display name for the tutor persona (shown in the intro script). */
const TUTOR_PERSONA_NAME = "LearnSpace Tutor";

function learnerGreeting(profile) {
  const first = profile?.first_name?.trim();
  const full = profile?.full_name?.trim();
  if (first) return first;
  if (full) return full.split(/\s+/)[0] || null;
  return null;
}

export default function EmptyChatState({ profile, onPrompt }) {
  const learnerName = learnerGreeting(profile);
  const [prompts, setPrompts] = useState(FALLBACK_PROMPTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await ustud.getStarterPrompts(6);
        const list = Array.isArray(data.prompts) ? data.prompts.filter((p) => typeof p === "string" && p.trim()) : [];
        if (!cancelled && list.length >= 3) {
          setPrompts(list.slice(0, 8));
        }
      } catch {
        if (!cancelled) {
          const shuffled = [...FALLBACK_PROMPTS].sort(() => Math.random() - 0.5);
          setPrompts(shuffled);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col h-full min-h-[50vh] max-w-3xl mx-auto px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex gap-4 items-start text-left mb-10"
      >
        <div
          className="flex-shrink-0 w-10 h-10 border border-[#d4d4d4] bg-white flex items-center justify-center"
          aria-hidden
        >
          <Sparkles className="w-5 h-5 text-[#333333]" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0 border border-[#d4d4d4] bg-white px-4 py-4 shadow-sm">
          <p className="text-sm text-[#111111] leading-relaxed space-y-3">
            <span className="block">
              {learnerName ? (
                <>
                  Hello, <span className="font-semibold">{learnerName}</span>. It&apos;s good to see you.
                </>
              ) : (
                <>Hello. It&apos;s good to see you.</>
              )}
            </span>
            <span className="block">
              My name is <span className="font-semibold">{TUTOR_PERSONA_NAME}</span>. I am here to help you learn.
            </span>
            <span className="block">Do you understand that I am here to teach you?</span>
            <span className="block">Do you have any questions for me right now?</span>
          </p>
        </div>
      </motion.div>

      <div className="mt-auto">
        <p className="text-xs text-[#666666] mb-3 text-center sm:text-left">Or try one of these to get started:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {loading
            ? [...Array(6)].map((_, i) => (
                <div key={i} className="h-[52px] bg-[#f0f0f0] border border-[#e5e5e5] animate-pulse" />
              ))
            : prompts.map((prompt, i) => (
                <motion.button
                  key={`${prompt}-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 + i * 0.03 }}
                  type="button"
                  onClick={() => onPrompt(prompt)}
                  className="text-left px-4 py-3 bg-white border border-[#e5e5e5] text-sm text-[#333333] hover:text-black hover:border-black hover:bg-[#f5f5f5] transition-all"
                >
                  {prompt}
                </motion.button>
              ))}
        </div>
        {!loading && (
          <p className="text-[10px] text-[#999] mt-4 text-center sm:text-left uppercase tracking-wider">
            Suggestions from your local AI — start a new chat for different ideas
          </p>
        )}
      </div>
    </div>
  );
}
