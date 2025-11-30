document.addEventListener('DOMContentLoaded', () => {
    if(window.currentUser) {
        document.getElementById('header-user-name').innerText = window.currentUser.name;
        document.getElementById('stat-child-name').innerText = window.currentUser.childName;
        document.getElementById('stat-section').innerText = window.currentUser.childSection;
        loadStats();
    }
});

async function loadStats() {
    const db = window.db;
    try {
        // Count subjects by finding classSessions for the child's section
        const snap = await db.collection('classSessions')
            .where('section', '==', window.currentUser.childSection)
            .get();
            
        document.getElementById('stat-subjects').innerText = snap.size;
    } catch (e) {
        console.error(e);
    }
}