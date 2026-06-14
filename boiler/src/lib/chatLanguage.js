/** Persisted preference for tutor reply language (all chat surfaces). */

/** @typedef {"en"|"fa"|"ps"|"auto"} ChatLanguage */

export const CHAT_LANGUAGE_KEY = "ustud_chat_language";

const VALID = new Set(["en", "fa", "ps", "auto"]);

export function getChatLanguage() {
  try {
    const v = localStorage.getItem(CHAT_LANGUAGE_KEY);
    if (v && VALID.has(v)) return v;
  } catch {
    /* ignore */
  }
  return "auto";
}

export function setChatLanguage(v) {
  if (!VALID.has(v)) return;
  try {
    localStorage.setItem(CHAT_LANGUAGE_KEY, v);
    window.dispatchEvent(new CustomEvent("ustud-chat-language", { detail: v }));
  } catch {
    /* ignore */
  }
}

export function chatLanguageLabels() {
  return {
    en: "English",
    fa: "فارسی",
    ps: "پښتو",
    auto: "Auto",
  };
}
