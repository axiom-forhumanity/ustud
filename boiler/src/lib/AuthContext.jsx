import React, { createContext, useContext } from "react";

/**
 * Offline-first: no external auth. UStud runs locally with FastAPI + Ollama.
 */
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const value = {
    user: { email: "learner@local", full_name: "Learner", role: "user" },
    isAuthenticated: true,
    isLoadingAuth: false,
    isLoadingPublicSettings: false,
    authError: null,
    appPublicSettings: null,
    logout: () => {},
    navigateToLogin: () => {},
    checkAppState: async () => {},
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
