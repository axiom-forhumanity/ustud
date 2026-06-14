import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { MessageSquare, BookOpen, User, Settings, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const NAV_ITEMS = [
  { path: "/", label: "Chat", icon: MessageSquare },
  { path: "/library", label: "Library", icon: BookOpen },
  { path: "/profile", label: "Profile", icon: User },
];

export default function AppLayout({ children }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b-2 border-black">
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 font-bold text-sm tracking-tight">
              <div className="w-6 h-6 bg-black flex items-center justify-center">
                <span className="text-white text-xs font-bold">L</span>
              </div>
              LEARNSPACE
            </Link>
            <nav className="hidden md:flex items-center gap-0">
              {NAV_ITEMS.map(item => {
                const Icon = item.icon;
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-3 py-2 text-xs font-600 uppercase tracking-wider transition-all border-b-2 ${active ? "border-black text-black" : "border-transparent text-[#666666] hover:text-black hover:bg-[#f5f5f5]"}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.label}
                  </Link>
                );
              })}
              {user?.role === "admin" && (
                <Link
                  to="/admin"
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-600 uppercase tracking-wider transition-all border-b-2 ${location.pathname === "/admin" ? "border-black text-black" : "border-transparent text-[#666666] hover:text-black hover:bg-[#f5f5f5]"}`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  Admin
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden md:flex items-center gap-2">
                <div className="w-6 h-6 bg-black flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "?"}
                  </span>
                </div>
                <span className="text-xs text-[#666666]">{user.full_name || user.email}</span>
              </div>
            )}
            <button
              className="md:hidden p-2 hover:bg-[#f5f5f5]"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-[#e5e5e5] bg-white px-4 pb-4"
            >
              {NAV_ITEMS.map(item => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 py-3 text-sm text-[#666666] hover:text-black border-b border-[#e5e5e5]"
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
              {user?.role === "admin" && (
                <Link to="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-3 text-sm text-[#666666] hover:text-black">
                  <Settings className="w-4 h-4" /> Admin
                </Link>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="pt-14">
        {children}
      </main>
    </div>
  );
}