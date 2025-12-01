/**
 * ui.js
 * Handles Smooth Transitions, Loading Screen, Sidebar, AND Logout
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
    // Check 'onclick' redirects
    if (
      link.getAttribute("onclick") &&
      link.getAttribute("onclick").includes(currentPage)
    ) {
      link.classList.add("active");
    }
    // Check standard hrefs
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

// --- 4. GLOBAL LOGOUT FUNCTION (FIXED) ---
window.logout = function () {
  if (confirm("Are you sure you want to log out??")) {
    
    // 1. Sign out from Firebase Auth
    if (firebase.auth()) {
        firebase.auth().signOut().then(() => {
            console.log("Firebase Signed Out");
        }).catch((error) => {
            console.error("Sign Out Error", error);
        });
    }

    // 2. Clear Local Storage (Session Data)
    // This clears any saved user details so login.js doesn't auto-redirect
    localStorage.clear();
    sessionStorage.clear();

    // 3. Redirect to Login Page (Root Folder)
    // Using ../index.html to go up one level from admin/ folder
    window.location.href = "../index.html";
  }
};