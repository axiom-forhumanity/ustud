/** localStorage key — keep in sync with Profile.jsx */
export const PROFILE_STORAGE_KEY = "ustud_profile";

/**
 * Build optional `learner_profile` payload for POST /api/chat (non-empty fields only).
 * Reads fresh from localStorage each call so updates apply without reload.
 */
export function getLearnerProfileForApi() {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return undefined;
    const p = JSON.parse(raw);
    const payload = {
      full_name: p.full_name,
      first_name: p.first_name,
      last_name: p.last_name,
      grade_level: p.grade_level,
      learning_style: p.learning_style,
      personality_type: p.personality_type,
      ai_context_summary: p.ai_context_summary,
    };
    const out = {};
    for (const [k, v] of Object.entries(payload)) {
      if (v != null && String(v).trim() !== "") out[k] = String(v).trim();
    }
    return Object.keys(out).length ? out : undefined;
  } catch {
    return undefined;
  }
}
