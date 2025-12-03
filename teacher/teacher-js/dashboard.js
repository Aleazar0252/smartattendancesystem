/**
 * dashboard.js
 * Teacher Dashboard Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // Check Session
    if (window.sessionManager && window.sessionManager.isLoggedIn()) {
        const user = window.sessionManager.getSession();
        
        // Update Header
        document.getElementById('header-user-name').innerText = user.name;
        
        // Load Stats
        loadDashboardStats(user);
    } else {
        window.location.href = '../index.html';
    }
});

async function loadDashboardStats(user) {
    const db = window.db;
    try {
        // 1. Count My Classes
        const classSnap = await db.collection('classSessions')
            .where('teacherId', '==', user.uid)
            .get();
        document.getElementById('dash-class-count').innerText = classSnap.size;

        // 2. Count Total Students (General count for now)
        const studentSnap = await db.collection('users')
            .where('role', '==', 'student')
            .get();
        document.getElementById('dash-student-count').innerText = studentSnap.size;

        // 3. Next Class (Mock Logic or Real Time check)
        // For now, we'll just check if there are classes today
        if(!classSnap.empty) {
            document.getElementById('dash-next-class').innerText = "Active";
            document.getElementById('dash-next-class').style.color = "#28a745";
        } else {
            document.getElementById('dash-next-class').innerText = "No Classes";
        }

    } catch (e) {
        console.error("Dashboard Error:", e);
    }
}