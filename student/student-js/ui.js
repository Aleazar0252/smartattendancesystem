/**
 * ui.js
 * Sidebar & Logout Logic
 */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Sidebar Toggle
    const toggle = document.getElementById("menu-toggle-btn");
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("mobile-overlay");

    if(toggle && sidebar) {
        toggle.addEventListener("click", () => {
            sidebar.classList.toggle("active");
            if(overlay) overlay.classList.toggle("active");
        });
    }
    if(overlay) {
        overlay.addEventListener("click", () => {
            sidebar.classList.remove("active");
            overlay.classList.remove("active");
        });
    }

    // 2. Hide Loader
    const loader = document.getElementById("preloader");
    if(loader) {
        setTimeout(() => {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        }, 800);
    }
});

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