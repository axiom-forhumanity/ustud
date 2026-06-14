/**
 * Wikipedia Library + reading assistant chrome (en / fa / ps).
 * @param {string} lang
 */
export function wikipediaExplorerUiStrings(lang) {
  const key = lang === "fa" || lang === "ps" ? lang : "en";
  return STR[key];
}

/** Match snippet blocks in any supported UI language (composer parsing). */
export const COMPOSER_ARTICLE_SNIP_RES = [
  /— From article —\s*\n"""([\s\S]*?)"""/,
  /— از مقاله —\s*\n"""([\s\S]*?)"""/,
  /— له مقالې —\s*\n"""([\s\S]*?)"""/,
];

export const COMPOSER_PASTE_SNIP_RES = [
  /— From pasted screenshot —\s*\n"""([\s\S]*?)"""/,
  /— از تصویر چسبانده‌شده —\s*\n"""([\s\S]*?)"""/,
  /— له چاپ شوی انځور څخه —\s*\n"""([\s\S]*?)"""/,
];

const MAX_CTX_SNIP = 24000;

export function extractComposerSnippetsFromMessage(message) {
  let fromArticle = "";
  let fromPaste = "";
  for (const re of COMPOSER_ARTICLE_SNIP_RES) {
    const m = message.match(re);
    if (m) {
      fromArticle = m[1].trim();
      break;
    }
  }
  for (const re of COMPOSER_PASTE_SNIP_RES) {
    const m = message.match(re);
    if (m) {
      fromPaste = m[1].trim();
      break;
    }
  }
  return { fromArticle, fromPaste };
}

/** Combined excerpt for tutor lesson_context (any UI language). */
export function extractComposerSnippetForContext(message) {
  const { fromArticle, fromPaste } = extractComposerSnippetsFromMessage(message);
  const parts = [fromArticle, fromPaste].filter(Boolean);
  if (!parts.length) return "";
  return parts.join("\n\n").slice(0, MAX_CTX_SNIP);
}

const STR = {
  en: {
    dir: "ltr",
    checkingLibrary: "Checking offline library…",
    noZimTitleHasFiles: "No usable full Wikipedia ZIM",
    noZimTitleEmpty: "No offline Wikipedia (ZIM) found",
    noZimBodyHasFiles:
      "UStud only loads full Wikipedia packs (filenames like wikipedia_*_all_*). Simple English and Wiktionary files are ignored. Set USTUD_ZIM_PATH if needed.",
    noZimBodyEmpty: "Download a full Wikipedia .zim from Kiwix.",
    folderLabel: "Folder:",
    downloadLink: "download.kiwix.org → wikipedia",
    wikipedia: "Wikipedia",
    offline: "Offline",
    preview: "Preview",
    previewModeTitle: "Preview mode",
    previewModeBodyBefore: "Install",
    previewModeBodyAfter: "or set USTUD_KIWIX_SERVE_URL.",
    kiwixHint:
      "Use Text & select in the center for the assistant. Reader tab follows system light/dark.",
    searchPlaceholder: "Search titles…",
    go: "Go",
    searchFailed: "Search failed.",
    readerNewTab: "Reader in new tab",
    wikipediaOrg: "wikipedia.org",
    back: "Back",
    forward: "Forward",
    readerTab: "Reader",
    textSelectTab: "Text & select",
    loading: "Loading…",
    retry: "Retry",
    iframeKiwixTitle: "Kiwix Wikipedia",
    ccFooter: "CC BY-SA where applicable. Wikipedia® is a trademark of the Wikimedia Foundation, Inc.",
    resizeSplitter: "Drag to resize reading assistant",
    resizeHandle: "Resize panel",
    readingAssistant: "Reading assistant",
    chatEmptyHint:
      "Snippet from article (opens Text & select in Reader) appears as a strip above the box—not pasted inside. Paste a screenshot with Ctrl+V, add a question, Enter to send.",
    snippetSelectInArticle: "Select text in the article… (Esc to cancel)",
    snippetOpenTextSelect: "Snippet from article (open Text & select)",
    snippetFromArticle: "Snippet from article",
    snippetTitleReader: "Opens Text & select so you can drag-select text from the article",
    snippetTitleDefault: "Arm snippet mode, then select text in the article",
    composerPlaceholder:
      "Add your question… (snippet strip above; Ctrl+V — paste screenshot)",
    composerFooter: "Enter — send · Shift+Enter — new line · Ctrl+V — paste screenshot into the box",
    snippetAttachedBanner: "Copied text from article",
    snippetRemoveAria: "Remove copied text",
    defaultAskAboutSnippet: "Please help me with the copied text from the article.",
    userMessageSnippetOnly: "Copied text from article",
    snippetArticleHeader: "— From article —",
    snippetPasteHeader: "— From pasted screenshot —",
    snippetPasteInner:
      "[Pasted image — add your question or describe what to focus on.]",
    chatUsedLibrary: "Used library",
    chatNoResponse: "No response.",
    chatCouldNotReach: "Could not reach the assistant. Is UStud running and Ollama available?",
  },
  fa: {
    dir: "rtl",
    checkingLibrary: "در حال بررسی کتابخانهٔ آفلاین…",
    noZimTitleHasFiles: "پروندهٔ ZIM ویکی‌پدیای کامل مناسب نیست",
    noZimTitleEmpty: "ویکی‌پدیای آفلاین (ZIM) پیدا نشد",
    noZimBodyHasFiles:
      "UStud فقط بسته‌های کامل ویکی‌پدیا را بارگذاری می‌کند (نام پرونده مانند wikipedia_*_all_*). ویکی‌پدیا ساده و ویکی‌واژه نادیده گرفته می‌شوند. در صورت نیاز USTUD_ZIM_PATH را تنظیم کنید.",
    noZimBodyEmpty: "یک پروندهٔ .zim کامل ویکی‌پدیا از کیویکس دانلود کنید.",
    folderLabel: "پوشه:",
    downloadLink: "download.kiwix.org → wikipedia",
    wikipedia: "ویکی‌پدیا",
    offline: "آفلاین",
    preview: "پیش‌نمایش",
    previewModeTitle: "حالت پیش‌نمایش",
    previewModeBodyBefore: "نصب کنید",
    previewModeBodyAfter: "یا USTUD_KIWIX_SERVE_URL را تنظیم کنید.",
    kiwixHint:
      "برای دستیار از «متن و انتخاب» در وسط استفاده کنید. زبانهٔ خواننده از حالت روشن/تاریک سیستم پیروی می‌کند.",
    searchPlaceholder: "جستجوی عنوان‌ها…",
    go: "برو",
    searchFailed: "جستجو ناموفق بود.",
    readerNewTab: "خواننده در زبانهٔ جدید",
    wikipediaOrg: "wikipedia.org",
    back: "عقب",
    forward: "جلو",
    readerTab: "خواننده",
    textSelectTab: "متن و انتخاب",
    loading: "در حال بارگذاری…",
    retry: "دوباره",
    iframeKiwixTitle: "ویکی‌پدیا کیویکس",
    ccFooter:
      "در صورت کاربرد، CC BY-SA. ویکی‌پدیا® علامت بنیاد ویکimedia است.",
    resizeSplitter: "کشیدن برای تغییر عرض دستیار",
    resizeHandle: "تغییر اندازهٔ پنل",
    readingAssistant: "دستیار مطالعه",
    chatEmptyHint:
      "گزینش از مقاله (در خواننده «متن و انتخاب» را باز می‌کند) به‌صورت نوار بالای جعبه می‌آید، داخل جعبه چسبانده نمی‌شود. تصویر با Ctrl+V، سوال، سپس Enter.",
    snippetSelectInArticle: "متن را در مقاله انتخاب کنید… (Esc لغو)",
    snippetOpenTextSelect: "گزینش از مقاله (باز کردن متن و انتخاب)",
    snippetFromArticle: "گزینش از مقاله",
    snippetTitleReader: "«متن و انتخاب» را باز می‌کند تا بتوانید متن را بکشید و انتخاب کنید",
    snippetTitleDefault: "حالت گزینش را روشن کنید، سپس متن را در مقاله انتخاب کنید",
    composerPlaceholder:
      "سوال خود را بنویسید… (نوار گزینش بالا؛ Ctrl+V — تصویر)",
    composerFooter:
      "Enter — ارسال · Shift+Enter — خط تازه · Ctrl+V — چسباندن تصویر",
    snippetAttachedBanner: "متن کپی‌شده از مقاله",
    snippetRemoveAria: "حذف متن پیوست‌شده",
    defaultAskAboutSnippet: "لطفاً دربارهٔ این متن کپی‌شده از مقاله کمکم کنید.",
    userMessageSnippetOnly: "متن کپی‌شده از مقاله",
    snippetArticleHeader: "— از مقاله —",
    snippetPasteHeader: "— از تصویر چسبانده‌شده —",
    snippetPasteInner:
      "[تصویر چسبانده‌شده — سوال خود را اضافه کنید یا بگویید روی چه چیزی تمرکز شود.]",
    chatUsedLibrary: "از کتابخانه استفاده شد",
    chatNoResponse: "پاسخی نیست.",
    chatCouldNotReach:
      "به دستیار وصل نشد. آیا UStud روشن است و Ollama در دسترس است؟",
  },
  ps: {
    dir: "rtl",
    checkingLibrary: "د آفلاین کتابتون څارنه کیږي…",
    noZimTitleHasFiles: "د بشپړ Wikipedia ZIM فایل نشته",
    noZimTitleEmpty: "آفلاین Wikipedia (ZIM) ونه موندل شو",
    noZimBodyHasFiles:
      "UStud یوازې بشپړ Wikipedia بستې پورته کوي (د فایل نوم لکه wikipedia_*_all_*). ساده انګلیسي او Wiktionary فایلونه نادیده کیږي. اړتیا وي USTUD_ZIM_PATH وټاکئ.",
    noZimBodyEmpty: "د Kiwix څخه بشپړ Wikipedia .zim فایل ډاونلوډ کړئ.",
    folderLabel: "پوښۍ:",
    downloadLink: "download.kiwix.org → wikipedia",
    wikipedia: "ویکیپیډیا",
    offline: "آفلاین",
    preview: "مخکتنه",
    previewModeTitle: "د مخکتنې حالت",
    previewModeBodyBefore: "نصب کړئ",
    previewModeBodyAfter: "یا USTUD_KIWIX_SERVE_URL وټاکئ.",
    kiwixHint:
      "د مرستیال لپاره په منځ کې «متن او ټاکل» وکاروئ. د لوستونکي ټاب د سیسټم روښانه/تیاره حالت تعقیبوي.",
    searchPlaceholder: "د سرلیکونو لټون…",
    go: "لاړشه",
    searchFailed: "لټون پاتې شو.",
    readerNewTab: "لوستونکی په نوي ټاب کې",
    wikipediaOrg: "wikipedia.org",
    back: "شاته",
    forward: "مخکې",
    readerTab: "لوستونکی",
    textSelectTab: "متن او ټاکل",
    loading: "پورته کیږي…",
    retry: "بیا هڅه",
    iframeKiwixTitle: "Kiwix Wikipedia",
    ccFooter: "په اړتیا CC BY-SA. Wikipedia® د Wikimedia Foundation نښه ده.",
    resizeSplitter: "د مرستیال پراخوالی بدلولو لپاره کش کړئ",
    resizeHandle: "پینل resize",
    readingAssistant: "د لوستلو مرستیال",
    chatEmptyHint:
      "د مقالې ټوټه (په لوستونکي کې متن او ټاکل پرانیزي) د بکس پورته په پټه کې ښکاري، دننه نه ګوري. انځور Ctrl+V، پوښتنه، بیا Enter.",
    snippetSelectInArticle: "په مقاله کې متن وټاکئ… (Esc لغوه کول)",
    snippetOpenTextSelect: "د مقالې ټوټه (متن او ټاکل پرانیزي)",
    snippetFromArticle: "د مقالې څخه ټوټه",
    snippetTitleReader: "متن او ټاکل پرانیزي چې تاسو د مقالې متن وټاکئ",
    snippetTitleDefault: "د ټاکلو حالت پرانیزئ، بیا په مقاله کې متن وټاکئ",
    composerPlaceholder:
      "پوښتنه ولیکئ… (پورته ټوټه؛ Ctrl+V — انځور)",
    composerFooter:
      "Enter — لیږل · Shift+Enter — نوي کرښه · Ctrl+V — انځور ولګوئ",
    snippetAttachedBanner: "د مقالې څخه کاپي شوی متن",
    snippetRemoveAria: "کاپي شوی متن لرې کړئ",
    defaultAskAboutSnippet: "مهرباني وکړئ د دې مقالې کاپي شوي متن سره مرسته وکړئ.",
    userMessageSnippetOnly: "د مقالې څخه کاپي شوی متن",
    snippetArticleHeader: "— له مقالې —",
    snippetPasteHeader: "— له چاپ شوی انځور څخه —",
    snippetPasteInner:
      "[چاپ شوی انځور — خپله پوښتنه ولیکئ یا ووایاست چې پام څه ته وي.]",
    chatUsedLibrary: "کتابتون وکارول شو",
    chatNoResponse: "ځواب نشته.",
    chatCouldNotReach:
      "مرستیال ته ونه رسیدو. آیا UStud چلیږي او Ollama شته؟",
  },
};
