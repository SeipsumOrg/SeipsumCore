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
      type,
      page: window.location.pathname,
      timestamp: Date.now(),
      session_id: sessionId,
      ...data
    };

    console.log("Seipsum Analytics:", payload);

    // BACKEND COMES LATER

  }

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
