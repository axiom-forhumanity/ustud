import React from "react";
import { Languages } from "lucide-react";
import { chatLanguageLabels } from "@/lib/chatLanguage";

/**
 * Segmented control: English | فارسی | پښتو | Auto (omit `modes` for all four).
 * @param {{ value: string, onChange: (m: string) => void, className?: string, compact?: boolean, modes?: readonly ("en"|"fa"|"ps"|"auto")[] }} props
 */
export default function ChatLanguageToggle({ value, onChange, className = "", compact = false, modes: modesProp }) {
  const labels = chatLanguageLabels();
  const all = /** @type {const} */ (["en", "fa", "ps", "auto"]);
  const modes = modesProp?.length ? modesProp : all;
  const activeMode = modes.includes(value) ? value : modes[0] ?? "en";

  const titleFor = (m) => {
    if (m === "en") return "Replies in English";
    if (m === "fa") return "Replies in Persian (Dari), Arabic script";
    if (m === "ps") return "Replies in Pashto, Arabic script";
    return "Match language: Arabic script (Persian/Pashto) if you type that way, otherwise English";
  };

  return (
    <div className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
      <Languages className="w-3.5 h-3.5 text-[#666666] flex-shrink-0" aria-hidden />
      {!compact && (
        <span className="text-[10px] font-600 uppercase tracking-wider text-[#666666] hidden sm:inline">Reply</span>
      )}
      <div
        role="group"
        aria-label="Tutor reply language"
        className="inline-flex flex-wrap border border-[#cccccc] bg-[#fafafa] p-0.5 max-w-full"
      >
        {modes.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            className={`px-1.5 sm:px-2 py-1 text-[10px] font-600 uppercase tracking-wide transition-colors min-w-0 ${
              activeMode === m
                ? "bg-black text-white"
                : "text-[#555555] hover:bg-white hover:text-black"
            }`}
            title={titleFor(m)}
          >
            {labels[m]}
          </button>
        ))}
      </div>
    </div>
  );
}
