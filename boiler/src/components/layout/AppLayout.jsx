import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
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
    try {
      const raw = localStorage.getItem("ustud_profile");
      if (raw) {
        const j = JSON.parse(raw);
        setUser({
          full_name: j.full_name,
          email: j.email || "learner@local",
          role: j.role || "user",
        });
      } else {
        setUser({ email: "learner@local", role: "user" });
      }
    } catch {
      setUser({ email: "learner@local", role: "user" });
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black border-b-2 border-white">
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="flex items-center gap-2 font-bold text-sm tracking-tight text-white hover:text-white/90"
            >
              <div className="w-6 h-6 bg-white flex items-center justify-center">
                <span className="text-black text-xs font-bold">L</span>
              </div>
              LEARNSPACE
            </Link>
            <nav className="hidden md:flex items-center gap-0">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-3 py-2 text-xs font-600 uppercase tracking-wider transition-all border-b-2 ${
                      active
                        ? "border-white text-white"
                        : "border-transparent text-white/65 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.label}
                  </Link>
                );
              })}
              {user?.role === "admin" && (
                <Link
                  to="/admin"
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-600 uppercase tracking-wider transition-all border-b-2 ${
                    location.pathname === "/admin"
                      ? "border-white text-white"
                      : "border-transparent text-white/65 hover:text-white hover:bg-white/10"
                  }`}
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
                <div className="w-6 h-6 bg-white flex items-center justify-center">
                  <span className="text-black text-xs font-bold">
                    {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "?"}
                  </span>
                </div>
                <span className="text-xs text-white/80">{user.full_name || user.email}</span>
              </div>
            )}
            <button
              type="button"
              className="md:hidden p-2 rounded-sm text-white hover:bg-white/10"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-white/20 bg-black px-4 pb-4"
            >
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 py-3 text-sm text-white/75 hover:text-white border-b border-white/15"
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
              {user?.role === "admin" && (
                <Link
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 py-3 text-sm text-white/75 hover:text-white"
                >
                  <Settings className="w-4 h-4" /> Admin
                </Link>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="pt-14">{children}</main>
    </div>
  );
}
