import React from "react";
import { motion } from "framer-motion";

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
  const percent = articleCount > 0 ? Math.round((readCount / articleCount) * 100) : 0;

  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="text-left w-full border-2 border-[#e5e5e5] hover:border-black bg-white p-5 transition-all duration-150"
    >
      <div className="text-3xl mb-3">{subject.icon || "📚"}</div>
      <h3 className="font-bold text-sm text-[#111111] uppercase tracking-wide">{subject.name}</h3>
      <p className="text-xs text-[#666666] mt-1">
        {readCount}/{articleCount} {articleCount === 1 ? "article" : "articles"} read
      </p>
      {subject.description && (
        <p className="text-xs text-[#999999] mt-1 line-clamp-2">{subject.description}</p>
      )}
      <ProgressBar percent={percent} />
    </motion.button>
  );
}