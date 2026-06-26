// Seipsum Analytics v5.6

(function () {

  console.log("Seipsum Analytics v5.6 booted");

// =========================
// SESSION ID
// =========================

const sessionId =
  localStorage.getItem("seipsum_sid") ||
  crypto.randomUUID();

localStorage.setItem("seipsum_sid", sessionId);

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

logEvent("page_view");

// =========================
// STATE
// =========================

let maxScroll = 0;
let activeTime = 0;

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
  
  function getExperienceCluster(page, lang) {
  const p = normalizePage(page);
  const l = normalizeLanguage(lang);

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

const payload = {
  version: "v5.6",
  event_id: crypto.randomUUID(),
  type,

  page_raw: window.location.pathname,
  page: normalizePage(window.location.pathname),
  canonical_page: normalizePage(window.location.pathname),

  // 1. WEBSITE LANGUAGE (source: URL / routing logic)
  page_language,

  // 2. BROWSER LANGUAGE (secondary signal)
  browser_language,

  // 3. EXPERIENCE CLUSTER (derived business logic)
  experience_cluster: getExperienceCluster(page_language),

  timestamp: Date.now(),
  session_id: sessionId,

  referrer: (() => {
    try {
      if (!document.referrer) return "/";
      return normalizePage(new URL(document.referrer).pathname);
    } catch {
      return "/";
    }
  })(),

  user_agent: navigator.userAgent,

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
}).catch(() => {});

} catch (error) {
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

      logEvent("external_click", {
        url: link.href
      });

    } else {

      logEvent("click", {
        target: target.tagName
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

  if (
    selection.length > 0 &&
    selection !== lastSelection
  ) {

    lastSelection = selection;

    logEvent("text_select", {
      length: selection.length
    });

  }

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
    max_scroll: maxScroll
  });

});

})();
