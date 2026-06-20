// analytics.js

(function () {

  const sessionId =
    localStorage.getItem("seipsum_sid") ||
    crypto.randomUUID();

  localStorage.setItem("seipsum_sid", sessionId);

  function logEvent(type, data = {}) {

    const payload = {
      type,
      page: window.location.pathname,
      timestamp: Date.now(),
      session_id: sessionId,
      ...data
    };

    console.log("Seipsum Analytics:", payload);

    // AICI va veni backend-ul mai târziu
  }

  // PAGE VIEW
  logEvent("page_view");

  // SCROLL DEPTH
  let maxScroll = 0;

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

})();
