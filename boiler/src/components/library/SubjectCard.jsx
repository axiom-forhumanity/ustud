import React from "react";
import { motion } from "framer-motion";

const FALLBACK_ICON = "📚";

/** Background tint by logical kind (emoji is always shown; color hints the topic). */
function subjectIconBoxClass(iconKind) {
  const box = "w-10 h-10 flex items-center justify-center flex-shrink-0 border border-black/10 text-[1.5rem] leading-none";
  switch (iconKind) {
    case "math":
      return `${box} bg-[#2563eb]/15`;
    case "english":
      return `${box} bg-[#ea580c]/15`;
    case "history":
      return `${box} bg-[#57534e]/15`;
    case "science":
      return `${box} bg-[#0d9488]/15`;
    case "music":
      return `${box} bg-[#7c3aed]/15`;
    case "wikipedia":
      return `${box} bg-[#059669]/15`;
    case "wellbeing":
      return `${box} bg-[#db2777]/15`;
    case "fitness":
      return `${box} bg-[#ca8a04]/15`;
    case "library":
      return `${box} bg-[#1e293b]/15`;
    case "library_business":
      return `${box} bg-[#b45309]/15`;
    case "library_computer_science":
      return `${box} bg-[#4f46e5]/15`;
    case "library_engineering":
      return `${box} bg-[#ea580c]/15`;
    case "library_philosophy":
      return `${box} bg-[#7c3aed]/15`;
    case "library_psychology":
      return `${box} bg-[#db2777]/15`;
    case "library_sociology":
      return `${box} bg-[#0d9488]/15`;
    case "library_custom":
      return `${box} bg-[#0369a1]/15`;
    case "course":
    default:
      return `${box} bg-[#334155]/15`;
  }
}

function SubjectIcon({ icon, iconKind }) {
  const raw = icon != null && String(icon).trim() ? String(icon).trim() : "";
  const emoji = raw || FALLBACK_ICON;
  return (
    <div className={subjectIconBoxClass(iconKind)} title="" aria-hidden>
      <span role="img">{emoji}</span>
    </div>
  );
}

function ProgressBar({ percent }) {
  const endColor = percent === 100 ? "#22c55e" : percent > 60 ? "#4ade80" : percent > 30 ? "#86efac" : "#cccccc";

  return (
    <div className="mt-3">
      <div className="flex justify-between text-[10px] text-[#999999] mb-1 uppercase tracking-wider font-600">
        <span>Progress</span>
        <span style={{ color: percent > 0 ? "#22c55e" : "#999999" }}>{percent}%</span>
      </div>
      <div className="h-1.5 bg-[#e5e5e5] w-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-full"
          style={{ background: `linear-gradient(to right, #cccccc, ${endColor})` }}
        />
      </div>
    </div>
  );
}

export default function SubjectCard({ subject, articleCount, readCount = 0, onClick }) {
  const isLiveWikipedia = subject.id === "hub_wikipedia";
  const percent = articleCount > 0 ? Math.round((readCount / articleCount) * 100) : 0;
  const iconKind = subject.iconKind || "course";

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="text-left w-full border-2 border-[#e5e5e5] hover:border-black bg-white p-5 transition-all duration-150"
    >
      <div className="mb-3">
        <SubjectIcon icon={subject.icon} iconKind={iconKind} />
      </div>
      <h3 className="font-bold text-sm text-[#111111] uppercase tracking-wide">{subject.name}</h3>
      {isLiveWikipedia ? (
        <p className="text-xs text-[#666666] mt-1">Offline ZIM — search & read (no Wi‑Fi needed)</p>
      ) : (
        <p className="text-xs text-[#666666] mt-1">
          {readCount}/{articleCount} {articleCount === 1 ? "article" : "articles"} read
        </p>
      )}
      {subject.description && <p className="text-xs text-[#999999] mt-1 line-clamp-2">{subject.description}</p>}
      <ProgressBar percent={isLiveWikipedia ? 0 : percent} />
    </motion.button>
  );
}
