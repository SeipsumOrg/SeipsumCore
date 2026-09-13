document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('.theme-toggle').addEventListener('click', () => {
    document.documentElement.classList.toggle('dark-theme');
    const currentTheme = document.documentElement.classList.contains('dark-theme') ? 'dark' : 'light';
    localStorage.setItem('theme', currentTheme);
  });
});
