import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import AppLayout from "@/components/layout/AppLayout";
import LearningQuiz from "@/components/profile/LearningQuiz";
import ProfileCard from "@/components/profile/ProfileCard";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", date_of_birth: "", grade_level: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    const u = await base44.auth.me();
    setUser(u);
    const profiles = await base44.entities.StudentProfile.filter({ user_email: u.email });
    if (profiles.length > 0) {
      setProfile(profiles[0]);
      setForm({
        first_name: profiles[0].first_name || "",
        last_name: profiles[0].last_name || "",
        date_of_birth: profiles[0].date_of_birth || "",
        grade_level: profiles[0].grade_level || "",
      });
    } else {
      setEditing(true);
    }
    setLoading(false);
  };

  const saveProfile = async () => {
    setSaving(true);
    const data = { ...form, user_email: user.email };
    if (profile) {
      const updated = await base44.entities.StudentProfile.update(profile.id, data);
      setProfile(updated);
    } else {
      const created = await base44.entities.StudentProfile.create(data);
      setProfile(created);
    }
    setEditing(false);
    setSaving(false);
  };

  const onQuizComplete = async (results) => {
    const aiSummary = await base44.integrations.Core.InvokeLLM({
      prompt: `Based on this student's learning assessment results, write a brief 2-3 sentence teaching guide for an AI tutor. Be specific and practical.

Learning style: ${results.learning_style} (visual: ${results.scores.visual}, auditory: ${results.scores.auditory}, reading/writing: ${results.scores.reading_writing}, kinesthetic: ${results.scores.kinesthetic})
Personality type: ${results.personality_type} (explorer: ${results.scores.explorer}, connector: ${results.scores.connector}, analyst: ${results.scores.analyst}, creator: ${results.scores.creator})

Name: ${form.first_name}`,
    });

    const data = {
      learning_style: results.learning_style,
      personality_type: results.personality_type,
      quiz_scores: results.scores,
      quiz_completed: true,
      ai_context_summary: aiSummary,
    };

    let updated;
    if (profile) {
      updated = await base44.entities.StudentProfile.update(profile.id, data);
    } else {
      updated = await base44.entities.StudentProfile.create({ ...form, user_email: user.email, ...data });
    }
    setProfile(updated);
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
                    <Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} placeholder="Alex" className="mt-1" />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder="Smith" className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date of Birth</Label>
                    <Input type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <Label>Grade Level</Label>
                    <Input value={form.grade_level} onChange={e => setForm(f => ({ ...f, grade_level: e.target.value }))} placeholder="e.g. Grade 7" className="mt-1" />
                  </div>
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