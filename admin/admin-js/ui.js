/**
 * ui.js
 * Handles Smooth Transitions, Loading Screen, and Sidebar
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. MOBILE SIDEBAR TOGGLE
  const menuToggle = document.getElementById("menu-toggle-btn");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("mobile-overlay");

  if (menuToggle && sidebar && overlay) {
    menuToggle.addEventListener("click", () => {
      sidebar.classList.toggle("active");
      overlay.classList.toggle("active");
    });

    overlay.addEventListener("click", () => {
      sidebar.classList.remove("active");
      overlay.classList.remove("active");
    });
  }

  // 2. AUTO-ACTIVE SIDEBAR LINKS
  const currentPage = window.location.pathname.split("/").pop();
  const navLinks = document.querySelectorAll(".nav-sub-item, .nav-item");

  navLinks.forEach((link) => {
    if (
      link.getAttribute("onclick") &&
      link.getAttribute("onclick").includes(currentPage)
    ) {
      link.classList.add("active");
    }
    if (link.getAttribute("href") === currentPage) {
      link.classList.add("active");
      const parentDropdown = link.closest(".nav-dropdown");
      if (parentDropdown) {
        parentDropdown.classList.add("show");
        const trigger = parentDropdown.previousElementSibling;
        if (trigger) trigger.classList.add("dropdown-open");
      }
    }
  });
});

// 3. REMOVE LOADER WHEN PAGE IS FULLY LOADED
window.addEventListener("load", () => {
  const loader = document.getElementById("preloader");
  if (loader) {
    loader.classList.add("loader-hidden");
    // Remove from DOM after transition to free up memory
    loader.addEventListener("transitionend", () => {
      if (loader.parentNode) {
        loader.parentNode.removeChild(loader);
      }
    });
  }
});

// Global Sidebar Dropdown
window.toggleDropdown = function (id, el) {
  document.getElementById(id).classList.toggle("show");
  el.classList.toggle("dropdown-open");
};

function logout() {
    if(confirm("Are you sure you want to log out?")) {
        // Clear session if needed
        window.location.href = "../index.html";
    }
}