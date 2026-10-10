document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.theme-toggle');

  // Sync emoji with the theme active at page load (e.g. dark restored from localStorage)
  toggle.textContent = document.documentElement.classList.contains('dark-theme') ? '☀️' : '🌙';

  toggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark-theme');
    const isDark = document.documentElement.classList.contains('dark-theme');
    const currentTheme = isDark ? 'dark' : 'light';
    localStorage.setItem('theme', currentTheme);
    toggle.textContent = isDark ? '☀️' : '🌙';
  });
});
