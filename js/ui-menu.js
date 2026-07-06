document.querySelectorAll(".menu-wrapper").forEach((menu) => {

  const toggle = menu.querySelector(".js-menu-toggle");
  const dropdown = menu.querySelector(".js-menu-dropdown");

  if (!toggle || !dropdown) return;

  toggle.addEventListener("click", (e) => {

    e.stopPropagation();

    dropdown.classList.toggle("show");

  });

});


document.addEventListener("click", () => {

  document.querySelectorAll(".js-menu-dropdown").forEach((dropdown) => {

    dropdown.classList.remove("show");

  });

});


