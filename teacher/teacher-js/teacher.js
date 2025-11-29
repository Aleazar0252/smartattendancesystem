// teacher-js/teacher.js

document.addEventListener('DOMContentLoaded', () => {
    initializeTeacherApp();
    highlightSidebar();
});

// --- 1. HIGHLIGHT SIDEBAR ---
function highlightSidebar() {
    // Get current filename (e.g., "students.html")
    const currentPage = window.location.pathname.split("/").pop();
    
    const navLinks = document.querySelectorAll('.nav-item');
    navLinks.forEach(link => {
        // Remove active class from all
        link.classList.remove('active');
        
        // Add active class if href matches current page
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
}

// --- 2. INITIALIZATION ---
async function initializeTeacherApp() {
    try {
        if (!window.db || !window.sessionManager) {
            setTimeout(initializeTeacherApp, 300);
            return;
        }

        if (!sessionManager.isLoggedIn()) {
            window.location.href = '../login.html';
            return;
        }

        const user = sessionManager.getSession();
        updateHeaderUI(user);

        // Only load data relevant to the dashboard overview
        // (You can create separate JS files for students.html if needed)
        await loadDashboardStats();

        const preloader = document.getElementById('preloader');
        if (preloader) {
            preloader.style.opacity = '0';
            setTimeout(() => preloader.style.display = 'none', 500);
        }

    } catch (error) {
        console.error("Init Error:", error);
    }
}

function updateHeaderUI(user) {
    const nameEl = document.getElementById('teacher-name');
    if(nameEl) nameEl.textContent = `${user.firstName} ${user.lastName}`;
    
    const avatarEl = document.getElementById('header-avatar');
    if(avatarEl) avatarEl.textContent = user.firstName.charAt(0).toUpperCase();

    const dateEl = document.getElementById('current-date');
    if(dateEl) {
        dateEl.textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }
}

async function loadDashboardStats() {
    // Only run this if we are on the dashboard page
    const statEl = document.getElementById('stat-students-count');
    if (!statEl) return; 

    try {
        const snapshot = await db.collection('users').where('role', '==', 'student').get();
        statEl.textContent = snapshot.size;
        
        const advEl = document.getElementById('stat-advisory');
        if(advEl) advEl.textContent = "Grade 10 - Rizal";
    } catch (error) {
        console.error("Error loading stats:", error);
    }
}