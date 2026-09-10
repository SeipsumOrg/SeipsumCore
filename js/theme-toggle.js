/ Check for saved user preference or use preferred color scheme
const savedTheme = localStorage.getItem('theme') ||
                  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

// Apply the saved theme
if (savedTheme === 'dark') {
  document.body.classList.add('dark-theme');
}

// Toggle theme on button click
document.querySelector('.theme-toggle').addEventListener('click', () => {
  document.body.classList.toggle('dark-theme');
  const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
  localStorage.setItem('theme', currentTheme);
});
