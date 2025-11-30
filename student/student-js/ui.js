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

// Logout
window.logout = function() {
    if(confirm("Log out of Student Portal?")) {
        window.location.href = "../index.html"; 
    }
};