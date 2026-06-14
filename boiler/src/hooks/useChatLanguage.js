import { useState, useEffect, useCallback } from "react";
import { getChatLanguage, setChatLanguage as persistChatLanguage } from "@/lib/chatLanguage";

/**
 * Synced with localStorage + cross-tab / same-tab updates.
 * @returns {[import("@/lib/chatLanguage").ChatLanguage, (v: import("@/lib/chatLanguage").ChatLanguage) => void]}
 */
export function useChatLanguage() {
  const [lang, setLang] = useState(getChatLanguage);

  useEffect(() => {
    const sync = () => setLang(getChatLanguage());
    window.addEventListener("storage", sync);
    window.addEventListener("ustud-chat-language", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("ustud-chat-language", sync);
    };
  }, []);

  const update = useCallback((v) => {
    persistChatLanguage(v);
    setLang(getChatLanguage());
  }, []);

  return [lang, update];
}
