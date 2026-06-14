import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";

const QUIZ_QUESTIONS = [
  // Learning Style questions
  {
    id: "ls1",
    category: "learning",
    question: "When you're learning something new, what helps most?",
    emoji: "📖",
    options: [
      { label: "Seeing diagrams, charts or pictures", scores: { visual: 3 } },
      { label: "Hearing someone explain it out loud", scores: { auditory: 3 } },
      { label: "Reading about it and taking notes", scores: { reading_writing: 3 } },
      { label: "Trying it hands-on yourself", scores: { kinesthetic: 3 } },
    ],
  },
  {
    id: "ls2",
    category: "learning",
    question: "When you remember things best, it's usually because...",
    emoji: "🧠",
    options: [
      { label: "You can picture it in your head", scores: { visual: 3 } },
      { label: "You said it out loud or heard it", scores: { auditory: 3 } },
      { label: "You wrote it down", scores: { reading_writing: 3 } },
      { label: "You did it or made something", scores: { kinesthetic: 3 } },
    ],
  },
  {
    id: "ls3",
    category: "learning",
    question: "In class, you pay most attention when the teacher...",
    emoji: "🏫",
    options: [
      { label: "Shows videos or draws on the board", scores: { visual: 3 } },
      { label: "Tells stories and talks through examples", scores: { auditory: 3 } },
      { label: "Gives you worksheets or books to read", scores: { reading_writing: 3 } },
      { label: "Does experiments or group activities", scores: { kinesthetic: 3 } },
    ],
  },
  {
    id: "ls4",
    category: "learning",
    question: "When you study for a test, you usually...",
    emoji: "✏️",
    options: [
      { label: "Draw maps or color-code your notes", scores: { visual: 2, creator: 1 } },
      { label: "Read your notes out loud or quiz yourself", scores: { auditory: 3 } },
      { label: "Rewrite or reread your notes many times", scores: { reading_writing: 3 } },
      { label: "Walk around or use flashcards to stay active", scores: { kinesthetic: 2, explorer: 1 } },
    ],
  },
  // Personality questions
  {
    id: "p1",
    category: "personality",
    question: "You have a free afternoon. What sounds most fun?",
    emoji: "🌤️",
    options: [
      { label: "Exploring somewhere new or going on an adventure", scores: { explorer: 3 } },
      { label: "Hanging out and talking with friends", scores: { connector: 3 } },
      { label: "Solving a puzzle or figuring something out", scores: { analyst: 3 } },
      { label: "Making something — art, music, writing, or building", scores: { creator: 3 } },
    ],
  },
  {
    id: "p2",
    category: "personality",
    question: "When there's a problem to solve in a group, you tend to...",
    emoji: "🤝",
    options: [
      { label: "Jump in with ideas and try things out", scores: { explorer: 2, kinesthetic: 1 } },
      { label: "Make sure everyone feels heard and included", scores: { connector: 3 } },
      { label: "Think it through carefully before speaking", scores: { analyst: 3 } },
      { label: "Come up with a creative or unusual solution", scores: { creator: 3 } },
    ],
  },
  {
    id: "p3",
    category: "personality",
    question: "Which kind of school project excites you most?",
    emoji: "🎒",
    options: [
      { label: "A field trip or outdoor project", scores: { explorer: 3, kinesthetic: 1 } },
      { label: "A team presentation or debate", scores: { connector: 2, auditory: 1 } },
      { label: "A research report with facts and data", scores: { analyst: 2, reading_writing: 1 } },
      { label: "Drawing, performing, or making a video", scores: { creator: 3, visual: 1 } },
    ],
  },
  {
    id: "p4",
    category: "personality",
    question: "When something goes wrong, your first reaction is to...",
    emoji: "😅",
    options: [
      { label: "Try a different approach right away", scores: { explorer: 3 } },
      { label: "Talk to someone about it", scores: { connector: 3 } },
      { label: "Figure out exactly what went wrong", scores: { analyst: 3 } },
      { label: "Think of a totally different way to do it", scores: { creator: 3 } },
    ],
  },
  {
    id: "p5",
    category: "personality",
    question: "Your dream job out of these would be...",
    emoji: "🚀",
    options: [
      { label: "Explorer, scientist, or athlete", scores: { explorer: 3, kinesthetic: 1 } },
      { label: "Teacher, counselor, or social worker", scores: { connector: 3, auditory: 1 } },
      { label: "Engineer, lawyer, or researcher", scores: { analyst: 3, reading_writing: 1 } },
      { label: "Artist, musician, writer, or inventor", scores: { creator: 3, visual: 1 } },
    ],
  },
];

const LEARNING_STYLE_LABELS = {
  visual: { label: "Visual Learner", emoji: "👁️", desc: "You learn best by seeing — diagrams, colors, and pictures help you understand." },
  auditory: { label: "Auditory Learner", emoji: "👂", desc: "You learn best by hearing — listening, discussing, and talking things through." },
  reading_writing: { label: "Reading/Writing Learner", emoji: "📝", desc: "You learn best through words — reading, writing, and taking notes." },
  kinesthetic: { label: "Hands-On Learner", emoji: "🙌", desc: "You learn best by doing — trying things, moving, and building." },
  mixed: { label: "Mixed Learner", emoji: "🌀", desc: "You learn well in many ways — you're flexible and adaptable." },
};

const PERSONALITY_LABELS = {
  explorer: { label: "The Explorer", emoji: "🧭", desc: "Curious, energetic, and always ready to try something new." },
  connector: { label: "The Connector", emoji: "💛", desc: "Warm, empathetic, and great at understanding people." },
  analyst: { label: "The Analyst", emoji: "🔍", desc: "Thoughtful, precise, and loves digging into how things work." },
  creator: { label: "The Creator", emoji: "🎨", desc: "Imaginative, original, and always full of fresh ideas." },
};

export default function LearningQuiz({ onComplete, onCancel, studentName }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null);
  const [results, setResults] = useState(null);

  const question = QUIZ_QUESTIONS[current];
  const totalQuestions = QUIZ_QUESTIONS.length;
  const progress = ((current) / totalQuestions) * 100;

  const handleSelect = (option) => {
    setSelected(option);
  };

  const handleNext = () => {
    if (!selected) return;
    const updated = { ...answers };
    Object.entries(selected.scores).forEach(([key, val]) => {
      updated[key] = (updated[key] || 0) + val;
    });
    setAnswers(updated);
    setSelected(null);

    if (current + 1 >= totalQuestions) {
      calculateResults(updated);
    } else {
      setCurrent(current + 1);
    }
  };

  const calculateResults = (scores) => {
    const lsKeys = ["visual", "auditory", "reading_writing", "kinesthetic"];
    const pKeys = ["explorer", "connector", "analyst", "creator"];

    const topLS = lsKeys.reduce((a, b) => (scores[a] || 0) > (scores[b] || 0) ? a : b);
    const topP = pKeys.reduce((a, b) => (scores[a] || 0) > (scores[b] || 0) ? a : b);

    // Check if it's truly mixed (top two are close)
    const lsScores = lsKeys.map(k => ({ k, v: scores[k] || 0 })).sort((a, b) => b.v - a.v);
    const isMixed = lsScores[0].v - lsScores[1].v <= 1;

    setResults({
      learning_style: isMixed ? "mixed" : topLS,
      personality_type: topP,
      scores,
    });
  };

  if (results) {
    const ls = LEARNING_STYLE_LABELS[results.learning_style];
    const pt = PERSONALITY_LABELS[results.personality_type];

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl mx-auto px-4 py-8 text-center"
      >
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold mb-2">Your Learning Profile</h2>
        <p className="text-[#666666] mb-8 text-sm">
          {studentName ? `Great work, ${studentName}!` : "Great work!"} Here's what we found out about you.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-left">
          <div className="bg-white border-2 border-black p-5">
            <div className="text-3xl mb-2">{ls.emoji}</div>
            <h3 className="font-bold mb-1">{ls.label}</h3>
            <p className="text-sm text-[#666666]">{ls.desc}</p>
          </div>
          <div className="bg-white border-2 border-black p-5">
            <div className="text-3xl mb-2">{pt.emoji}</div>
            <h3 className="font-bold mb-1">{pt.label}</h3>
            <p className="text-sm text-[#666666]">{pt.desc}</p>
          </div>
        </div>

        {/* Score breakdown */}
        <div className="bg-[#f5f5f5] border border-[#e5e5e5] p-4 mb-6 text-left">
          <p className="text-[10px] font-600 text-[#666666] uppercase tracking-wider mb-3">Score Breakdown</p>
          {[
            { label: "Visual", key: "visual" },
            { label: "Auditory", key: "auditory" },
            { label: "Reading/Writing", key: "reading_writing" },
            { label: "Hands-On", key: "kinesthetic" },
          ].map(({ label, key }) => {
            const val = results.scores[key] || 0;
            const max = 12;
            return (
              <div key={key} className="mb-2">
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="font-500">{label}</span><span className="text-[#666666]">{val}</span>
                </div>
                <div className="h-1.5 bg-[#e5e5e5] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(val / max) * 100}%` }}
                    transition={{ delay: 0.3 }}
                    className="h-full bg-black"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <Button onClick={() => onComplete(results)} className="w-full bg-black text-white hover:bg-[#222] uppercase tracking-wider text-xs">
          <CheckCircle className="w-4 h-4 mr-2" /> Save My Profile
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      {/* Progress */}
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Question {current + 1} of {totalQuestions}</span>
            <span>{QUIZ_QUESTIONS[current].category === "learning" ? "Learning Style" : "Personality"}</span>
          </div>
          <div className="h-1.5 bg-border rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${progress}%` }}
              className="h-full bg-primary rounded-full transition-all duration-500"
            />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">{question.emoji}</div>
            <h2 className="text-xl font-semibold">{question.question}</h2>
          </div>

          <div className="space-y-2 mb-8">
            {question.options.map((option, i) => (
              <button
                key={i}
                onClick={() => handleSelect(option)}
                className={`w-full text-left px-5 py-4 border-2 text-sm transition-all duration-150 ${
                  selected === option
                    ? "border-black bg-black text-white"
                    : "border-[#e5e5e5] bg-white text-[#333333] hover:border-black hover:bg-[#f5f5f5]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 border-2 flex items-center justify-center flex-shrink-0 transition-all ${selected === option ? "border-white bg-white" : "border-[#cccccc]"}`}>
                    {selected === option && <div className="w-1.5 h-1.5 bg-black" />}
                  </div>
                  {option.label}
                </div>
              </button>
            ))}
          </div>

          <Button onClick={handleNext} disabled={!selected} className="w-full">
            {current + 1 >= totalQuestions ? "See My Results" : "Next"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}