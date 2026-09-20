// Setup hamburger menu with FULL-SCREEN scrollable dropdown
document.querySelectorAll(".menu-wrapper").forEach((menu) => {
  const toggle = menu.querySelector(".js-menu-toggle");
  const dropdown = menu.querySelector(".js-menu-dropdown");

  if (!toggle || !dropdown) return;

  // Enable scrolling with 100% viewport height
  dropdown.style.overflowY = 'auto';
  dropdown.style.maxHeight = '100vh'; // 100% of screen height

  // Keep your toggle logic
  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("show");
  });
});

// Update on window resize
window.addEventListener('resize', () => {
  document.querySelectorAll(".js-menu-dropdown").forEach((dropdown) => {
    dropdown.style.maxHeight = '100vh';
  });
});

document.addEventListener("click", () => {
  document.querySelectorAll(".js-menu-dropdown").forEach((dropdown) => {
    dropdown.classList.remove("show");

  });

});


