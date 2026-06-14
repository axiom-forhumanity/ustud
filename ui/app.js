const API_BASE = window.location.origin + "/api";
const USER_ID = "default";

let currentModule = null;
let currentUnit = null;
let currentLesson = null;
let completedLessons = new Set();
let translateToLocal = false;
let targetLang = "fa";

async function fetchAPI(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  const res = await fetch(API_BASE + path, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
    signal: controller.signal,
  });
  clearTimeout(timeout);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function showLoading(show) {
  const el = document.getElementById("loadingOverlay");
  el.classList.toggle("hidden", !show);
}

function showToast(message) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

/** Split long unbroken text into paragraphs and list items (fallback when LLM doesn't add breaks) */
function ensureParagraphBreaks(text) {
  if (!text || text.length < 100) return text;
  let out = text;
  out = out.replace(/([.!?])\s*\*\s+/g, "$1\n\n* ");
  out = out.replace(/([.!?])\s*-\s+/g, "$1\n\n- ");
  out = out.replace(/([.!?])\s+([A-Z])/g, "$1\n\n$2");
  out = out.replace(/\n\n+/g, "\n\n").trim();
  return out;
}

/** Simple Markdown to HTML - headers, bold, lists, paragraphs */
function markdownToHtml(text) {
  if (!text) return "";
  text = ensureParagraphBreaks(text);
  let html = escapeHtml(text);
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  const lines = html.split("\n");
  const out = [];
  let inList = false;
  let listTag = "ul";
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const ulMatch = line.match(/^[-*] (.+)$/);
    const olMatch = line.match(/^\d+\. (.+)$/);
    if (ulMatch) {
      if (!inList) { inList = true; listTag = "ul"; out.push("<ul>"); }
      out.push("<li>" + ulMatch[1] + "</li>");
    } else if (olMatch) {
      if (!inList) { inList = true; listTag = "ol"; out.push("<ol>"); }
      out.push("<li>" + olMatch[1] + "</li>");
    } else {
      if (inList) { out.push("</" + listTag + ">"); inList = false; }
      if (line.trim()) out.push("<p>" + line + "</p>");
    }
  }
  if (inList) out.push("</" + listTag + ">");
  return out.join("\n");
}

async function loadModules() {
  try {
    showLoading(true);
    const mods = await fetchAPI("/modules");
    const ul = document.getElementById("moduleList");
    ul.innerHTML = mods.map((m) => `<li data-id="${m.id}">${escapeHtml(m.name)}</li>`).join("");
    ul.querySelectorAll("li").forEach((li) => {
      li.addEventListener("click", () => selectModule(li.dataset.id));
    });
  } catch (e) {
    showToast("Could not load courses. Is the server running?");
  } finally {
    showLoading(false);
  }
}

async function selectModule(moduleId) {
  currentModule = moduleId;
  document.querySelectorAll(".sidebar li").forEach((li) => {
    li.classList.toggle("active", li.dataset.id === moduleId);
  });

  try {
    showLoading(true);
    const [curriculum, progress] = await Promise.all([
      fetchAPI(`/modules/${moduleId}/curriculum`),
      fetchAPI(`/progress/${USER_ID}/${moduleId}`),
    ]);
    completedLessons = new Set(progress.completed_lessons || []);

    const nav = document.getElementById("curriculumNav");
    nav.innerHTML = curriculum.units
      .map((unit) => {
        const lessons = unit.lessons || [];
        let prevCompleted = true;
        return `
      <div class="unit-block">
        <h4>${escapeHtml(unit.name)}</h4>
        ${lessons
          .map((l) => {
            const unlocked = prevCompleted;
            prevCompleted = completedLessons.has(l.id);
            return `
          <a href="#" class="lesson-link ${unlocked ? "" : "locked"}" data-unit="${unit.id}" data-lesson="${l.id}" ${unlocked ? "" : 'aria-disabled="true"'}>
            <span class="lesson-check">${completedLessons.has(l.id) ? "✓" : "○"}</span>
            ${escapeHtml(l.title)}
          </a>
        `;
          })
          .join("")}
      </div>
    `;
      })
      .join("");

    nav.querySelectorAll(".lesson-link").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        if (a.classList.contains("locked")) return;
        loadLesson(moduleId, a.dataset.unit, a.dataset.lesson);
      });
    });
  } catch (e) {
    showToast("Could not load curriculum.");
  } finally {
    showLoading(false);
  }
}

async function loadLesson(moduleId, unitId, lessonId) {
  currentUnit = unitId;
  currentLesson = lessonId;

  document.querySelectorAll(".lesson-link").forEach((a) => {
    a.classList.toggle("active", a.dataset.lesson === lessonId);
  });

  try {
    showLoading(true);
    const unlocked = await fetchAPI(
      `/modules/${moduleId}/lessons/${unitId}/${lessonId}/unlocked?user_id=${USER_ID}`
    );
    if (!unlocked.unlocked) {
      showToast("Complete the previous lesson first.");
      showLoading(false);
      return;
    }

    const lesson = await fetchAPI(`/modules/${moduleId}/lessons/${unitId}/${lessonId}`);
    document.getElementById("welcome").classList.add("hidden");
    document.getElementById("lessonView").classList.remove("hidden");
    document.getElementById("lessonTitle").textContent = lesson.title;
    document.getElementById("lessonDesc").textContent = lesson.description;

    let content = lesson.content;
    if (translateToLocal && content) {
      try {
        const tr = await fetchAPI("/translate", {
          method: "POST",
          body: JSON.stringify({ text: content, target: targetLang }),
        });
        content = tr.translated;
        if (tr.success === false) {
          showToast("Translation unavailable. Make sure Ollama is running (ollama serve).");
        }
      } catch (e) {
        showToast("Could not translate. Is the server running?");
      }
    }
    document.getElementById("lessonContent").innerHTML = markdownToHtml(content);

    const completeBtn = document.getElementById("completeBtn");
    completeBtn.onclick = () => completeLesson(moduleId, lessonId);
    completeBtn.textContent = completedLessons.has(lessonId) ? "Completed ✓" : "Mark Complete";
    completeBtn.classList.toggle("completed", completedLessons.has(lessonId));
    completeBtn.disabled = completedLessons.has(lessonId);
  } catch (e) {
    showToast("Could not load lesson.");
  } finally {
    showLoading(false);
  }
}

async function completeLesson(moduleId, lessonId) {
  try {
    await fetchAPI(`/progress/${USER_ID}/${moduleId}/${lessonId}/complete`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    completedLessons.add(lessonId);
    if (currentModule) await selectModule(currentModule);
    const completeBtn = document.getElementById("completeBtn");
    completeBtn.textContent = "Completed ✓";
    completeBtn.classList.add("completed");
    completeBtn.disabled = true;
    showToast("Lesson completed!");
  } catch (e) {
    showToast("Could not save progress.");
  }
}

document.getElementById("translateToggle").addEventListener("change", (e) => {
  translateToLocal = e.target.checked;
  if (currentLesson) loadLesson(currentModule, currentUnit, currentLesson);
});

document.getElementById("langSelect").addEventListener("change", (e) => {
  targetLang = e.target.value;
  if (translateToLocal && currentLesson) loadLesson(currentModule, currentUnit, currentLesson);
});

document.getElementById("chatSend").addEventListener("click", sendChat);
document.getElementById("chatInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendChat();
});

document.getElementById("searchBtn").addEventListener("click", runSearch);
document.getElementById("searchInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") runSearch();
});

async function runSearch() {
  const query = document.getElementById("searchInput").value.trim();
  if (!query) return;
  const withAI = document.getElementById("searchWithAI").checked;
  const resultsEl = document.getElementById("searchResults");
  const synthesisEl = document.getElementById("searchSynthesis");
  const listEl = document.getElementById("searchList");
  resultsEl.classList.remove("hidden");
  synthesisEl.innerHTML = "";
  listEl.innerHTML = "<p>Searching...</p>";
  try {
    const res = await fetchAPI("/search", {
      method: "POST",
      body: JSON.stringify({ query, synthesize: withAI }),
    });
    if (res.synthesis) {
      synthesisEl.innerHTML = escapeHtml(res.synthesis);
      synthesisEl.style.display = "block";
    } else {
      synthesisEl.style.display = "none";
    }
    if (res.results && res.results.length) {
      listEl.innerHTML = res.results.map((r) => `
        <div class="search-result-item">
          <div class="source">${escapeHtml(r.source)}</div>
          <div class="title">${escapeHtml(r.title)}</div>
          <div class="snippet">${escapeHtml(r.snippet)}</div>
        </div>
      `).join("");
    } else {
      listEl.innerHTML = "<p>No results found. Try different keywords.</p>";
    }
  } catch (e) {
    listEl.innerHTML = "<p>Search failed. Is the server running?</p>";
  }
}

/** Build assistant message HTML with Cursor-style copy button */
function buildAssistantMessage(text, isError) {
  const raw = escapeHtml(text);
  const content = isError ? escapeHtml(text) : markdownToHtml(text);
  const copySvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  return `<div class="chat-message assistant copyable-block ${isError ? "error" : ""}" data-raw="${raw}">
    <button class="copy-btn" title="Copy" aria-label="Copy output">${copySvg}</button>
    <div class="chat-message-content">${content}</div>
  </div>`;
}

function setupCopyButton(block) {
  const btn = block.querySelector(".copy-btn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const raw = block.getAttribute("data-raw") || block.querySelector(".chat-message-content")?.textContent || "";
    try {
      await navigator.clipboard.writeText(raw);
      showToast("Copied to clipboard");
      btn.classList.add("copied");
      setTimeout(() => btn.classList.remove("copied"), 1500);
    } catch (_) {
      showToast("Could not copy");
    }
  });
}

async function sendChat() {
  const input = document.getElementById("chatInput");
  const msg = input.value.trim();
  if (!msg) return;
  input.value = "";

  const messages = document.getElementById("chatMessages");
  messages.innerHTML += `<div class="chat-message user">${escapeHtml(msg)}</div>`;
  const typingId = "typing-" + Date.now();
  messages.innerHTML += `<div id="${typingId}" class="chat-message assistant typing">Thinking...</div>`;
  messages.scrollTop = messages.scrollHeight;

  const sendBtn = document.getElementById("chatSend");
  sendBtn.disabled = true;

  try {
    const body = {
      message: msg,
      module_id: currentModule || null,
      lesson_id: currentLesson || null,
    };
    const res = await fetchAPI("/chat", {
      method: "POST",
      body: JSON.stringify(body),
    });
    let responseText = res.response || "No response.";
    if (translateToLocal && targetLang === "fa") {
      try {
        const tr = await fetchAPI("/translate", { method: "POST", body: JSON.stringify({ text: responseText, target: "fa" }) });
        responseText = tr.translated || responseText;
      } catch (_) {}
    }
    document.getElementById(typingId).outerHTML = buildAssistantMessage(responseText);
    const blocks = messages.querySelectorAll(".copyable-block");
    if (blocks.length) setupCopyButton(blocks[blocks.length - 1]);
  } catch (e) {
    const errMsg = e.name === "AbortError" ? "Request timed out. Is Ollama running? Start it with: ollama serve" : "Could not get a response. Make sure Ollama is running (ollama serve) and the model is pulled (ollama pull smollm2:135m).";
    document.getElementById(typingId).outerHTML = buildAssistantMessage(errMsg, true);
  }
  messages.scrollTop = messages.scrollHeight;
  sendBtn.disabled = false;
}

document.getElementById("translateChatBtn").addEventListener("click", async function translateAllToDari() {
  const assistants = document.querySelectorAll("#chatMessages .chat-message.assistant:not(.error):not(.typing)");
  const users = document.querySelectorAll("#chatMessages .chat-message.user");
  if (!assistants.length && !users.length) {
    showToast("No messages to translate.");
    return;
  }
  const btn = this;
  btn.disabled = true;
  btn.textContent = "Translating...";
  let anyTranslated = false;
  try {
    for (const el of users) {
      const text = el.textContent;
      if (!text) continue;
      const tr = await fetchAPI("/translate", { method: "POST", body: JSON.stringify({ text, target: "fa" }) });
      const out = tr.translated || text;
      if (tr.success) anyTranslated = true;
      el.textContent = out;
    }
    for (const el of assistants) {
      const raw = el.getAttribute("data-raw") || el.querySelector(".chat-message-content")?.textContent?.trim() || el.textContent?.trim() || "";
      if (!raw) continue;
      const tr = await fetchAPI("/translate", { method: "POST", body: JSON.stringify({ text: raw, target: "fa" }) });
      const translated = tr.translated || raw;
      if (tr.success) anyTranslated = true;
      const contentEl = el.querySelector(".chat-message-content");
      if (contentEl) {
        contentEl.innerHTML = markdownToHtml(translated);
        el.setAttribute("data-raw", translated);
      } else {
        const copySvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
        el.innerHTML = `<button class="copy-btn" title="Copy" aria-label="Copy output">${copySvg}</button><div class="chat-message-content">${markdownToHtml(translated)}</div>`;
        el.setAttribute("data-raw", translated);
        el.classList.add("copyable-block");
        setupCopyButton(el);
      }
    }
    if (anyTranslated) {
      showToast("Chat translated to Dari.");
    } else {
      showToast("Translation unavailable. Start Ollama (ollama serve) and pull a model (ollama pull gemma3:4b).");
    }
  } catch (e) {
    showToast("Translation failed. Make sure Ollama is running (ollama serve).");
  }
  btn.disabled = false;
  btn.textContent = "Translate to Dari";
});

loadModules();
