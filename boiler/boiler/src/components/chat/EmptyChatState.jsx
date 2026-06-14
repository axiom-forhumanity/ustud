import React from "react";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const STARTER_PROMPTS = [
  "Explain photosynthesis in simple terms",
  "What is the Pythagorean theorem?",
  "Tell me an interesting fact about ancient Rome",
  "How do I write a good paragraph?",
  "What is a musical scale?",
  "Help me understand fractions",
];

export default function EmptyChatState({ profile, onPrompt }) {
  const name = profile?.first_name ? `, ${profile.first_name}` : "";

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] max-w-2xl mx-auto text-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Sparkles className="w-8 h-8 text-[#333333] mx-auto mb-6 block" strokeWidth={1.5} aria-hidden />
        <h2 className="text-2xl font-bold mb-2">
          Hello{name}! What would you like to learn today?
        </h2>
        <p className="text-[#666666] mb-8 text-sm">
          Ask me anything — I'm here to help you understand and explore.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
          {STARTER_PROMPTS.map((prompt, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              onClick={() => onPrompt(prompt)}
              className="text-left px-4 py-3 bg-white border border-[#e5e5e5] text-sm text-[#333333] hover:text-black hover:border-black hover:bg-[#f5f5f5] transition-all"
            >
              {prompt}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}