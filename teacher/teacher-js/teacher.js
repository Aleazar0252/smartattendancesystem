document.addEventListener('DOMContentLoaded', () => {
    if(window.currentUser) {
        document.getElementById('header-user-name').innerText = window.currentUser.name;
        loadStats();
    }
});

async function loadStats() {
    const db = window.db;
    try {
        // 1. Get Classes
        const classSnap = await db.collection('classSessions')
            .where('teacher', '==', window.currentUser.name)
            .get();
        document.getElementById('stat-classes').innerText = classSnap.size;

        // 2. Get Students
        const studentSnap = await db.collection('users')
            .where('role', '==', 'student')
            .where('adviserId', '==', window.currentUser.uid)
            .get();
        document.getElementById('stat-students').innerText = studentSnap.size;

    } catch (e) {
        console.error("Dashboard Error:", e);
    }
}