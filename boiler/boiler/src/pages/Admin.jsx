import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Upload, BookOpen, FolderOpen, FileText, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import AppLayout from "@/components/layout/AppLayout";

const SUBJECT_COLORS = ["blue", "green", "purple", "orange", "pink", "red"];
const SUBJECT_ICONS = ["📚", "🔢", "🎵", "🌍", "🔬", "✏️", "🎨", "🏛️", "💻", "⚽"];

export default function Admin() {
  const [user, setUser] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [articles, setArticles] = useState([]);
  const [activeTab, setActiveTab] = useState("subjects");
  const [loading, setLoading] = useState(true);
  const [newSubject, setNewSubject] = useState({ name: "", description: "", icon: "📚", color: "blue" });
  const [newArticle, setNewArticle] = useState({ title: "", subject_id: "", file_type: "text", content: "", tags: "" });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const u = await base44.auth.me();
    setUser(u);
    const [subs, arts] = await Promise.all([
      base44.entities.LibrarySubject.list(),
      base44.entities.LibraryArticle.list("-created_date", 100),
    ]);
    setSubjects(subs);
    setArticles(arts);
    setLoading(false);
  };

  if (!loading && user?.role !== "admin") {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <h2 className="text-xl font-semibold mb-2">Admin Only</h2>
          <p className="text-muted-foreground">This page is for teachers and administrators.</p>
        </div>
      </AppLayout>
    );
  }

  const createSubject = async () => {
    if (!newSubject.name) return;
    const created = await base44.entities.LibrarySubject.create({ ...newSubject, created_by_email: user.email });
    setSubjects(prev => [created, ...prev]);
    setNewSubject({ name: "", description: "", icon: "📚", color: "blue" });
  };

  const deleteSubject = async (id) => {
    await base44.entities.LibrarySubject.delete(id);
    setSubjects(prev => prev.filter(s => s.id !== id));
  };

  const createArticle = async () => {
    if (!newArticle.title || !newArticle.subject_id) return;
    const subject = subjects.find(s => s.id === newArticle.subject_id);
    const tags = newArticle.tags.split(",").map(t => t.trim()).filter(Boolean);
    const created = await base44.entities.LibraryArticle.create({
      ...newArticle,
      subject_name: subject?.name || "",
      tags,
      word_count: newArticle.content?.split(" ").length || 0,
      uploaded_by: user.email,
    });
    setArticles(prev => [created, ...prev]);
    setNewArticle({ title: "", subject_id: "", file_type: "text", content: "", tags: "" });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !newArticle.subject_id) {
      alert("Please select a subject first");
      return;
    }
    setUploading(true);
    setUploadProgress("Reading file...");

    const text = await file.text();
    setUploadProgress("Processing content...");

    const subject = subjects.find(s => s.id === newArticle.subject_id);
    const fileType = file.name.endsWith(".pdf") ? "pdf" : "text";
    const title = newArticle.title || file.name.replace(/\.[^/.]+$/, "");
    const tags = newArticle.tags.split(",").map(t => t.trim()).filter(Boolean);

    setUploadProgress("Saving to library...");
    const created = await base44.entities.LibraryArticle.create({
      title,
      subject_id: newArticle.subject_id,
      subject_name: subject?.name || "",
      content: text.slice(0, 50000),
      file_type: fileType,
      tags,
      word_count: text.split(" ").length,
      uploaded_by: user.email,
    });

    setArticles(prev => [created, ...prev]);
    setUploadProgress("");
    setUploading(false);
    setNewArticle({ title: "", subject_id: "", file_type: "text", content: "", tags: "" });
    e.target.value = "";
  };

  const deleteArticle = async (id) => {
    await base44.entities.LibraryArticle.delete(id);
    setArticles(prev => prev.filter(a => a.id !== id));
  };

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8 border-b-2 border-black pb-4">
          <h1 className="text-2xl font-bold mb-1 uppercase tracking-tight">Admin Panel</h1>
          <p className="text-[#666666] text-sm">Manage library subjects and content</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-2 border-black mb-6 w-fit">
          {["subjects", "articles"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 text-xs font-600 uppercase tracking-wider transition-all ${activeTab === tab ? "bg-black text-white" : "text-[#666666] hover:text-black hover:bg-[#f5f5f5]"}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "subjects" && (
          <div className="space-y-6">
            {/* Add subject */}
            <div className="bg-white border-2 border-[#e5e5e5] p-6">
              <h2 className="font-bold mb-4 uppercase tracking-wide text-sm">Add New Subject</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <Label>Name *</Label>
                  <Input value={newSubject.name} onChange={e => setNewSubject(s => ({ ...s, name: e.target.value }))} placeholder="e.g. Mathematics" className="mt-1" />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <Label>Description</Label>
                  <Input value={newSubject.description} onChange={e => setNewSubject(s => ({ ...s, description: e.target.value }))} placeholder="Brief description" className="mt-1" />
                </div>
                <div>
                  <Label>Icon</Label>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {SUBJECT_ICONS.map(icon => (
                      <button key={icon} onClick={() => setNewSubject(s => ({ ...s, icon }))}
                        className={`text-xl p-1.5 rounded-lg transition-all ${newSubject.icon === icon ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-muted"}`}>
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Color</Label>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {SUBJECT_COLORS.map(color => (
                      <button key={color} onClick={() => setNewSubject(s => ({ ...s, color }))}
                        className={`w-7 h-7 rounded-full bg-${color}-200 border-2 transition-all ${newSubject.color === color ? "border-foreground scale-110" : "border-transparent"}`} />
                    ))}
                  </div>
                </div>
              </div>
              <Button onClick={createSubject} disabled={!newSubject.name} className="mt-4">
                <Plus className="w-4 h-4 mr-2" /> Add Subject
              </Button>
            </div>

            {/* Subjects list */}
            <div className="space-y-2">
              {subjects.map(subject => (
                <div key={subject.id} className="bg-white border border-[#e5e5e5] px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{subject.icon}</span>
                    <div>
                      <p className="font-medium">{subject.name}</p>
                      <p className="text-sm text-muted-foreground">{articles.filter(a => a.subject_id === subject.id).length} articles</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteSubject(subject.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "articles" && (
          <div className="space-y-6">
            {/* Add article */}
            <div className="bg-white border-2 border-[#e5e5e5] p-6">
              <h2 className="font-bold mb-4 uppercase tracking-wide text-sm">Add Article or Upload File</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Title</Label>
                    <Input value={newArticle.title} onChange={e => setNewArticle(a => ({ ...a, title: e.target.value }))} placeholder="Article title (optional for file upload)" className="mt-1" />
                  </div>
                  <div>
                    <Label>Subject *</Label>
                    <Select value={newArticle.subject_id} onValueChange={v => setNewArticle(a => ({ ...a, subject_id: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select subject" /></SelectTrigger>
                      <SelectContent>
                        {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.icon} {s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Tags (comma-separated)</Label>
                  <Input value={newArticle.tags} onChange={e => setNewArticle(a => ({ ...a, tags: e.target.value }))} placeholder="e.g. algebra, equations, grade7" className="mt-1" />
                </div>
                <div>
                  <Label>Content (paste text)</Label>
                  <Textarea value={newArticle.content} onChange={e => setNewArticle(a => ({ ...a, content: e.target.value }))} placeholder="Paste article content here..." className="mt-1 h-32" />
                </div>
                <div className="flex gap-3">
                  <Button onClick={createArticle} disabled={!newArticle.subject_id}>
                    <Plus className="w-4 h-4 mr-2" /> Add Article
                  </Button>
                  <div className="relative">
                    <input ref={fileInputRef} type="file" accept=".txt,.md,.pdf,.csv" className="hidden" onChange={handleFileUpload} />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading || !newArticle.subject_id}>
                      {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{uploadProgress}</> : <><Upload className="w-4 h-4 mr-2" />Upload File</>}
                    </Button>
                  </div>
                </div>
                {!newArticle.subject_id && <p className="text-xs text-muted-foreground">Select a subject before uploading</p>}
              </div>
            </div>

            {/* Articles list */}
            <div className="space-y-2">
              {articles.map(article => (
                <div key={article.id} className="bg-white border border-[#e5e5e5] px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{article.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-xs">{article.subject_name}</Badge>
                        <Badge variant="outline" className="text-xs">{article.file_type}</Badge>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteArticle(article.id)} className="text-muted-foreground hover:text-destructive flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}