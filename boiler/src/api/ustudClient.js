/**
 * UStud local API — same origin in production; proxied in Vite dev.
 */
const API_BASE = "/api";

async function fetchAPI(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  try {
    const res = await fetch(API_BASE + path, {
      headers: { "Content-Type": "application/json", ...options.headers },
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export const ustud = {
  listModules: () => fetchAPI("/modules"),
  getCurriculum: (moduleId) => fetchAPI(`/modules/${encodeURIComponent(moduleId)}/curriculum`),
  listModuleFiles: (moduleId) => fetchAPI(`/modules/${encodeURIComponent(moduleId)}/files`),
  getLesson: (moduleId, unitId, lessonId) =>
    fetchAPI(
      `/modules/${encodeURIComponent(moduleId)}/lessons/${encodeURIComponent(unitId)}/${encodeURIComponent(lessonId)}`
    ),
  getProgress: (userId, moduleId) => fetchAPI(`/progress/${encodeURIComponent(userId)}/${encodeURIComponent(moduleId)}`),
  completeLesson: (userId, moduleId, lessonId, score = null) =>
    fetchAPI(`/progress/${encodeURIComponent(userId)}/${encodeURIComponent(moduleId)}/${encodeURIComponent(lessonId)}/complete`, {
      method: "POST",
      body: JSON.stringify({ score }),
    }),
  chat: (body) =>
    fetchAPI("/chat", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  /** Short questions for empty chat (Ollama-generated when available). */
  getStarterPrompts: (count = 6) =>
    fetchAPI(`/chat/starter-prompts?count=${encodeURIComponent(count)}`),
  search: (query, synthesize = false) =>
    fetchAPI("/search", {
      method: "POST",
      body: JSON.stringify({ query, synthesize }),
    }),
  translate: (text, target = "fa") =>
    fetchAPI("/translate", {
      method: "POST",
      body: JSON.stringify({ text, target }),
    }),
};
