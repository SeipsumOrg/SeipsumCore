// Seipsum Analytics v8

(function () {
  
const ANALYTICS_VERSION = "v8";

console.log(
    "Seipsum Analytics",
    ANALYTICS_VERSION,
    "booted"
);

// =========================
// BOT / AI AGENT DETECTION
// =========================

function detectBot() {
  const ua = navigator.userAgent || "";
  const uaLower = ua.toLowerCase();

  // Known AI crawlers (some do render JS)
  const aiBots = [
    "gptbot", "chatgpt-user", "oai-searchbot",
    "claudebot", "claude-web", "anthropic-ai",
    "perplexitybot", "perplexity-user",
    "google-extended", "googleother",
    "ccbot",          // Common Crawl
    "bytespider",     // ByteDance / TikTok AI
    "amazonbot",
    "applebot-extended",
    "meta-externalagent", "facebookexternalhit",
    "omgilibot", "omgili",
    "diffbot", "youbot", "pinterestbot",
    "semrushbot", "ahrefsbot", "mj12bot", "dotbot" // SEO crawlers
  ];

  for (const bot of aiBots) {
    if (uaLower.includes(bot)) {
      return { is_bot: true, bot_name: bot, bot_category: "ai_crawler" };
    }
  }

  // Generic search engine bots
  const searchBots = [
    "googlebot", "bingbot", "yandexbot",
    "duckduckbot", "slurp", "baiduspider", "sogou"
  ];
  for (const bot of searchBots) {
    if (uaLower.includes(bot)) {
      return { is_bot: true, bot_name: bot, bot_category: "search_crawler" };
    }
  }

  // Headless browser hints (JS-executing scrapers pretending to be human)
  const headlessHints = [
    "headlesschrome", "phantomjs", "electron",
    "puppeteer", "playwright", "selenium"
  ];
  for (const hint of headlessHints) {
    if (uaLower.includes(hint)) {
      return { is_bot: true, bot_name: hint, bot_category: "headless_scraper" };
    }
  }

  // WebDriver flag (Selenium/Puppeteer)
  if (navigator.webdriver === true) {
    return { is_bot: true, bot_name: "webdriver", bot_category: "headless_scraper" };
  }

  return { is_bot: false, bot_name: null, bot_category: null };
}

const botInfo = detectBot();
  

// =========================
// SESSION ID
// =========================

const existingSession =
  localStorage.getItem("seipsum_sid");

const isNewSession = !existingSession;

const sessionId =
  existingSession ||
  crypto.randomUUID();

localStorage.setItem("seipsum_sid", sessionId);


// =========================
// VISITOR TYPE
// =========================

const firstVisit =
  localStorage.getItem("seipsum_first_visit");

const visitorType =
  firstVisit
    ? "returning_visitor"
    : "new_visitor";

if (!firstVisit) {

  localStorage.setItem(
    "seipsum_first_visit",
    Date.now()
  );

}

// =========================
// DEV MODE 
// =========================

const isDev =
  localStorage.getItem("seipsum_dev") === "true";

if (isDev) {
  console.log("Seipsum Analytics: DEV MODE (tracking disabled)");
  return;
}

// =========================
// PAGE VIEW
// =========================

if (isNewSession) {
  logEvent("session_start");
}

logEvent("page_view");

// =========================
// STATE
// =========================
  
// Put near the top (state section)
let hasMouseMoved = false;
window.addEventListener("mousemove", () => { hasMouseMoved = true; }, { once: true });
  
let maxScroll = 0;
let activeTime = 0;

const pageEnterTime = Date.now();  
let lastFocusedSection = null;
let lastSelection = "";

// cache sections once
const sections = document.querySelectorAll("section");
  

   function normalizePage(page) {
  if (!page) return "/";

  page = page.split("?")[0];

  if (page === "/" || page === "/index.html" || page === "/index-en.html") {
    return "/";
  }

  if (page.endsWith("-en.html")) {
    return page.replace("-en.html", "") + "_en";
  }

  if (page.endsWith(".html")) {
    return page.replace(".html", "");
  }

  return page;
}

 function normalizeLanguage(lang) {
  if (!lang) return "unknown";

  const base = lang.split('-')[0].toLowerCase();

  // explicit language mapping layer
  switch (base) {
    case "ro":
      return "ro";
    case "en":
      return "en";
    default:
      return base;
  }
}

function getPageLanguage(pathname) {

  if (!pathname) return "ro";

  if (
    pathname.includes("-en") ||
    pathname.includes("_en") ||
    pathname.startsWith("/en")
  ) {
    return "en";
  }

  return "ro";
}

  function getBrowserLanguage() {

  return (
    navigator.language ||
    "unknown"
  ).toLowerCase();
}
  
  function getExperienceCluster(language) {

  const l = normalizeLanguage(language);

  if (l === "ro") return "RO_EXPERIENCE";

  if (l === "en") return "EN_EXPERIENCE";

  return "UNKNOWN_EXPERIENCE";
}


// =========================
// EVENT LOGGER
// =========================

function logEvent(type, data = {}) {

  try {

    const page_language = getPageLanguage(window.location.pathname);
    const browser_language = getBrowserLanguage();

    // Extract the 'ref' parameter from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const url_ref = urlParams.get('ref') || null; // <-- Add this line

  const payload = {
  version: ANALYTICS_VERSION,
  event_id: crypto.randomUUID(),
  type,

  page_raw: window.location.pathname,
  page: normalizePage(window.location.pathname),
  canonical_page: normalizePage(window.location.pathname),

  page_title: document.title,

  // 1. WEBSITE LANGUAGE (source: URL / routing logic)
  page_language,

  // 2. BROWSER LANGUAGE (secondary signal)
  browser_language,

  experience_cluster:
  getExperienceCluster(page_language),

  timestamp: Date.now(),
  session_id: sessionId,

  visitor_type: visitorType,

  first_visit_timestamp:
  firstVisit,

  referrer: (() => {
    try {
      if (!document.referrer) return "/";
      return normalizePage(new URL(document.referrer).pathname);
    } catch {
      return "/";
    }
  })(),
  url_ref: url_ref, // <-- Add this line to include the ref in the payload
  
  is_bot: botInfo.is_bot,
  bot_name: botInfo.bot_name,
  bot_category: botInfo.bot_category,
  is_likely_human: botInfo.is_bot ? false : hasMouseMoved,
  
  user_agent: navigator.userAgent,

   environment:

   isDev
   ? "development"
   : "production",
  
  viewport: {
    width: window.innerWidth,
    height: window.innerHeight
  },

  ...data
};

   console.log("Seipsum Analytics:", payload);

fetch("https://seipsum-analytics.silvernpaper.workers.dev/", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload),
  keepalive: true
}).catch(error => {

  console.error(
    "Analytics POST failed",
    error
  );

});

} 
  catch (error) {
  console.error("Analytics logEvent error:", error);
}
  
}

// =========================
// SCROLL DEPTH
// =========================

window.addEventListener("scroll", () => {

  const scrollPercent = Math.round(
    ((window.scrollY + window.innerHeight) /
      document.body.scrollHeight) * 100
  );

  if (
    scrollPercent > maxScroll &&
    scrollPercent - maxScroll >= 10
  ) {

    maxScroll = scrollPercent;

    logEvent("scroll_depth", {
      scroll_percent: scrollPercent
    });

  }

});

// =========================
// ATTENTION TRACKING
// =========================

setInterval(() => {

  if (!document.hidden) {

    activeTime += 15;

    logEvent("attention_ping", {
      active_time_seconds: activeTime
    });

  }

}, 15000);

// =========================
// CLICK + EXTERNAL LINK TRACKING
// =========================

document.addEventListener("click", (e) => {

  try {

    const target =
      e.target instanceof Element ? e.target : null;

    if (!target) return;

    const link = target.closest("a");

    if (link && link.href) {

      const url = new URL(link.href);

      if (url.origin === window.location.origin) {

      logEvent("internal_click", {

         url: normalizePage(new URL(link.href).pathname),

         text: link.innerText.trim(),

         id: link.id || null,

         class: link.className || null

        });

      } else {

        logEvent("external_click", {
          url: link.href
        });

      }

    } else {

      logEvent("click",{

        tag: target.tagName,

        text:
        target.innerText?.trim().substring(0,100),

        id:
        target.id || null,

        class:
        target.className || null

       });

    }

  } catch (error) {
    console.error("Click tracking error:", error);
  }

});

// =========================
// TEXT SELECTION TRACKING
// =========================

document.addEventListener("mouseup", () => {

  const selectedText = window.getSelection();

  if (!selectedText) return;

  const selection = selectedText.toString().trim();

  const cleanedSelection = selection
  .replace(/\s+/g, " ")
  .trim();

  if (
    selection.length > 0 &&
    selection !== lastSelection
  ) {

    lastSelection = selection;

    logEvent("text_select", {

      section:
      lastFocusedSection,

      length: cleanedSelection.length,

      text: cleanedSelection.substring(0, 300)

    });

  }

});


// =========================
// COPY TRACKING
// =========================

document.addEventListener("copy", () => {

  const selection =
    window.getSelection().toString().trim();

  if (!selection) return;


  logEvent("copy", {

    section:
    lastFocusedSection,

    length: selection.length,

    text: selection.substring(0,300)

  });

});
  

// =========================
// SECTION FOCUS TRACKING
// =========================

window.addEventListener("scroll", () => {

  sections.forEach(sec => {

    const rect = sec.getBoundingClientRect();

    const inView =
      rect.top < window.innerHeight * 0.4 &&
      rect.bottom > window.innerHeight * 0.2;

    if (
      inView &&
      sec.id !== lastFocusedSection
    ) {

      lastFocusedSection = sec.id;

      logEvent("section_focus", {
        section: sec.id || "unknown"
      });

    }

  });

});

// =========================
// PAGE EXIT
// =========================

window.addEventListener("beforeunload", () => {

  logEvent("page_exit", {
    active_time_seconds: activeTime,
   
    max_scroll: maxScroll,

    duration_ms:
    Date.now() - pageEnterTime,

    page_height:
    document.documentElement.scrollHeight,

    viewport_height:
    window.innerHeight,
    });

});

})();
