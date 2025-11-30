document.addEventListener('DOMContentLoaded', () => {
    if(window.currentUser) {
        document.getElementById('header-user-name').innerText = window.currentUser.name;
        loadStats();
    }
});

async function loadStats() {
    const db = window.db;
    try {
        // 1. Count Total Students
        const studentSnap = await db.collection('users')
            .where('role', '==', 'student')
            .get();
        document.getElementById('stat-students').innerText = studentSnap.size;

        // 2. Mock Active Cases (Since 'reports' collection doesn't exist yet)
        document.getElementById('stat-cases').innerText = "3"; // Placeholder

        // 3. Mock Appointments
        document.getElementById('stat-appts').innerText = "2"; // Placeholder
    } catch (e) {
        console.error("Dashboard Load Error:", e);
    }
}