// Apply theme IMMEDIATELY (before page renders)
(function() {
  const savedTheme = localStorage.getItem('theme') ||
                    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  function applyTheme() {
    if (document.body) {
      if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
      }
    } else {
      // Retry if body doesn't exist yet
      setTimeout(applyTheme, 10);
    }
  }

  applyTheme();
})();

// Set up click handler after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('.theme-toggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    localStorage.setItem('theme', currentTheme);
  });
});
