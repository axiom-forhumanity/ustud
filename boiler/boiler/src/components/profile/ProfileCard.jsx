import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, RefreshCw } from "lucide-react";
import { format } from "date-fns";

const LEARNING_STYLE_LABELS = {
  visual: { label: "Visual Learner", emoji: "👁️" },
  auditory: { label: "Auditory Learner", emoji: "👂" },
  reading_writing: { label: "Reading/Writing", emoji: "📝" },
  kinesthetic: { label: "Hands-On Learner", emoji: "🙌" },
  mixed: { label: "Mixed Learner", emoji: "🌀" },
};

const PERSONALITY_LABELS = {
  explorer: { label: "The Explorer", emoji: "🧭" },
  connector: { label: "The Connector", emoji: "💛" },
  analyst: { label: "The Analyst", emoji: "🔍" },
  creator: { label: "The Creator", emoji: "🎨" },
  unknown: { label: "Not yet set", emoji: "❓" },
};

export default function ProfileCard({ profile, onEdit, onRetakeQuiz }) {
  const ls = LEARNING_STYLE_LABELS[profile.learning_style] || { label: "Not set", emoji: "?" };
  const pt = PERSONALITY_LABELS[profile.personality_type] || { label: "Not set", emoji: "?" };

  return (
    <div className="bg-white border-2 border-black p-6 mb-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="w-12 h-12 bg-black flex items-center justify-center mb-3">
            <span className="text-xl font-bold text-white">
              {profile.first_name?.[0]?.toUpperCase()}
            </span>
          </div>
          <h2 className="text-xl font-bold">{profile.first_name} {profile.last_name}</h2>
          <div className="flex items-center gap-2 mt-1">
            {profile.grade_level && (
              <span className="text-[10px] font-600 uppercase tracking-wider border border-[#cccccc] px-2 py-0.5 text-[#333333]">
                {profile.grade_level}
              </span>
            )}
            {profile.date_of_birth && (
              <span className="text-xs text-[#666666]">
                Born {format(new Date(profile.date_of_birth), "MMMM d, yyyy")}
              </span>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onEdit} className="border-black text-black hover:bg-black hover:text-white text-xs uppercase tracking-wider">
          <Pencil className="w-3 h-3 mr-1.5" /> Edit
        </Button>
      </div>

      {profile.quiz_completed && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#f5f5f5] border border-[#e5e5e5] p-4">
            <div className="text-2xl mb-1">{ls.emoji}</div>
            <p className="text-[10px] uppercase tracking-wider text-[#666666] font-600">Learning Style</p>
            <p className="font-bold text-sm mt-0.5">{ls.label}</p>
          </div>
          <div className="bg-[#f5f5f5] border border-[#e5e5e5] p-4">
            <div className="text-2xl mb-1">{pt.emoji}</div>
            <p className="text-[10px] uppercase tracking-wider text-[#666666] font-600">Personality</p>
            <p className="font-bold text-sm mt-0.5">{pt.label}</p>
          </div>
        </div>
      )}
    </div>
  );
}