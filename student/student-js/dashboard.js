document.addEventListener('DOMContentLoaded', () => {
    if(window.currentUser) {
        document.getElementById('header-user-name').innerText = window.currentUser.name;
        document.getElementById('stat-section').innerText = window.currentUser.section;
        loadStats();
    }
});

async function loadStats() {
    const db = window.db;
    try {
        // Count subjects by finding classSessions for this student's section
        const snap = await db.collection('classSessions')
            .where('section', '==', window.currentUser.section)
            .get();
            
        document.getElementById('stat-subjects').innerText = snap.size;
    } catch (e) {
        console.error(e);
    }
}