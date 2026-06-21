// Seipsum Analytics v2

(function () {

  // =========================
  // SESSION ID
  // =========================

  const sessionId =
    localStorage.getItem("seipsum_sid") ||
    crypto.randomUUID();

  localStorage.setItem("seipsum_sid", sessionId);

  // =========================
  // STATE
  // =========================

  let maxScroll = 0;
  let activeTime = 0;

  // =========================
  // EVENT LOGGER
  // =========================

 function logEvent(type, data = {}) {

 const payload = {
  version: "v4",
  type,
  page: window.location.pathname,
  timestamp: Date.now(),
  session_id: sessionId,
  referrer: document.referrer,
  user_agent: navigator.userAgent,
  language: navigator.language,
  viewport: {
    width: window.innerWidth,
    height: window.innerHeight
  },
  ...data
};

  console.log("Seipsum Analytics:", payload);

  // BACKEND CLOUDFLARE WORKER

  fetch("https://seipsum-analytics.silvernpaper.workers.dev/", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload),
  keepalive: true
})
.catch(error => {
  console.error("Analytics Error:", error);
});

} // <- ASTA ESTE ÎNCHIDEREA CORECTĂ
  

  // =========================
  // PAGE VIEW
  // =========================

  logEvent("page_view");
  

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
      scrollPercent % 25 === 0
    ) {

      maxScroll = scrollPercent;

      logEvent("scroll_depth", {
        depth: scrollPercent
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
  // PAGE EXIT
  // =========================

  window.addEventListener("beforeunload", () => {

    logEvent("page_exit", {
      active_time_seconds: activeTime,
      max_scroll: maxScroll
    });

  });

})();
