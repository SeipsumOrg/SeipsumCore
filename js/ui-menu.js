document.querySelectorAll(".menu-wrapper").forEach((menu) => {
  const toggle = menu.querySelector(".js-menu-toggle");
  const dropdown = menu.querySelector(".js-menu-dropdown");

  if (!toggle || !dropdown) return;

  // Enable scrolling
  dropdown.style.overflowY = 'auto';

  // Calculate available space and position dropdown
  const updateDropdown = () => {
    const buttonRect = toggle.getBoundingClientRect();
    const spaceBelow = window.innerHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;

    // Open downward if more space below, else upward
    if (spaceBelow > spaceAbove) {
      dropdown.style.top = '100%';
      dropdown.style.bottom = 'auto';
      dropdown.style.maxHeight = `${spaceBelow}px`;
    } else {
      dropdown.style.top = 'auto';
      dropdown.style.bottom = '100%';
      dropdown.style.maxHeight = `${spaceAbove}px`;
    }
  };

  // Toggle dropdown and update position
  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("show");
    if (dropdown.classList.contains("show")) updateDropdown();
  });

  // Update on resize/scroll
  window.addEventListener('resize', updateDropdown);
  window.addEventListener('scroll', updateDropdown);
});

// Close dropdowns when clicking outside
document.addEventListener("click", () => {
  document.querySelectorAll(".js-menu-dropdown").forEach((dropdown) => {
    dropdown.classList.remove("show");
  });
});


