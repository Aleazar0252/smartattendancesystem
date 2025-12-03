document.addEventListener('DOMContentLoaded', () => {
    if (window.sessionManager && window.sessionManager.isLoggedIn()) {
        const user = window.sessionManager.getSession();
        document.getElementById('header-user-name').innerText = user.name;
        document.getElementById('schedule-section-display').innerText = `${user.gradeLevel} - ${user.section}`;
        loadSchedule(user);
    }
});

async function loadSchedule(user) {
    const tbody = document.getElementById('schedule-list-body');
    try {
        const snapshot = await window.db.collection('classSessions')
            .where('section', '==', `${user.gradeLevel} - ${user.section}`)
            .get();

        tbody.innerHTML = '';
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No schedules found for your section.</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const s = doc.data();
            const row = `<tr><td><strong>${s.subject}</strong></td><td>${s.teacherName || 'TBA'}</td><td><span class="badge-success" style="background:#e3f2fd; color:#0d47a1;">${s.days}</span></td><td>${formatTime(s.startTime)} - ${formatTime(s.endTime)}</td></tr>`;
            tbody.innerHTML += row;
        });
    } catch (e) { console.error(e); }
}

function formatTime(timeStr) {
    if (!timeStr) return "";
    const [hour, minute] = timeStr.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minute} ${ampm}`;
}