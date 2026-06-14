import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import AppLayout from "@/components/layout/AppLayout";
import LearningQuiz from "@/components/profile/LearningQuiz";
import ProfileCard from "@/components/profile/ProfileCard";
import { PROFILE_STORAGE_KEY } from "@/lib/learnerProfile";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", date_of_birth: "", grade_level: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = () => {
    setLoading(true);
    try {
      const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        setProfile(p);
        setForm({
          first_name: p.first_name || "",
          last_name: p.last_name || "",
          date_of_birth: p.date_of_birth || "",
          grade_level: p.grade_level || "",
        });
      } else {
        setEditing(true);
      }
    } catch {
      setEditing(true);
    }
    setLoading(false);
  };

  const saveProfile = () => {
    setSaving(true);
    const data = {
      ...form,
      full_name: [form.first_name, form.last_name].filter(Boolean).join(" "),
    };
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(data));
    setProfile(data);
    setEditing(false);
    setSaving(false);
  };

  const onQuizComplete = (results) => {
    const data = {
      ...profile,
      ...form,
      full_name: [form.first_name, form.last_name].filter(Boolean).join(" "),
      learning_style: results.learning_style,
      personality_type: results.personality_type,
      quiz_scores: results.scores,
      quiz_completed: true,
    };
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(data));
    setProfile(data);
    setShowQuiz(false);
  };

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    </AppLayout>
  );

  if (showQuiz) return (
    <AppLayout>
      <LearningQuiz onComplete={onQuizComplete} onCancel={() => setShowQuiz(false)} studentName={form.first_name} />
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8 border-b-2 border-black pb-4">
          <h1 className="text-2xl font-bold mb-1 uppercase tracking-tight">My Profile</h1>
          <p className="text-[#666666] text-sm">This helps your AI tutor understand how you learn best</p>
        </div>

        {/* Profile card if completed */}
        {profile && !editing && (
          <ProfileCard profile={profile} onEdit={() => setEditing(true)} onRetakeQuiz={() => setShowQuiz(true)} />
        )}

        {/* Edit form */}
        <AnimatePresence>
          {editing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white border-2 border-black p-6 mb-6"
            >
              <h2 className="font-semibold mb-4">{profile ? "Edit Info" : "Welcome! Tell us about yourself"}</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First Name *</Label>
                    <Input value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} placeholder="Alex" className="mt-1" />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} placeholder="Smith" className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date of Birth</Label>
                    <Input type="date" value={form.date_of_birth} onChange={(e) => setForm((f) => ({ ...f, date_of_birth: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <Label>Grade Level</Label>
                    <Input value={form.grade_level} onChange={(e) => setForm((f) => ({ ...f, grade_level: e.target.value }))} placeholder="e.g. Grade 7" className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label>Notes for your AI tutor (optional)</Label>
                  <p className="text-xs text-muted-foreground mt-0.5 mb-1">
                    Anything you want the chat to remember (goals, subjects, preferences). Sent with each message.
                  </p>
                  <Textarea
                    value={form.ai_context_summary}
                    onChange={(e) => setForm((f) => ({ ...f, ai_context_summary: e.target.value }))}
                    placeholder="e.g. I prefer short answers. I'm studying for Grade 9 biology."
                    className="mt-1 min-h-[80px]"
                    rows={3}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button onClick={saveProfile} disabled={!form.first_name || saving} className="flex-1">
                    {saving ? "Saving..." : "Save"}
                  </Button>
                  {profile && (
                    <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quiz CTA */}
        {!editing && profile && (
          <div className="bg-[#f5f5f5] border-2 border-[#e5e5e5] p-6">
            <h2 className="font-semibold mb-2">
              {profile.quiz_completed ? "✅ Learning Profile Complete" : "🧠 Discover How You Learn"}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {profile.quiz_completed
                ? "Your AI tutor uses your learning profile to personalize every response."
                : "Take a short quiz to help your AI tutor understand your learning style and personality."}
            </p>
            <Button onClick={() => setShowQuiz(true)} variant={profile.quiz_completed ? "outline" : "default"}>
              {profile.quiz_completed ? "Retake Quiz" : "Start Learning Quiz →"}
            </Button>
          </div>
        )}

        {!profile && !editing && (
          <Button onClick={() => setEditing(true)} className="w-full">Set up my profile</Button>
        )}
      </div>
    </AppLayout>
  );
}
