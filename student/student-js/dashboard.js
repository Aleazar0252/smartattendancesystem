document.addEventListener('DOMContentLoaded', () => {
    if (window.sessionManager && window.sessionManager.isLoggedIn()) {
        const user = window.sessionManager.getSession();
        if(user.role !== 'student') { window.location.href = '../index.html'; return; }

        document.getElementById('header-user-name').innerText = user.name;
        document.getElementById('welcome-name').innerText = user.name;
        
        loadDashboardData(user);
    } else {
        window.location.href = '../index.html';
    }
});

async function loadDashboardData(user) {
    if (!user.section) return;
    try {
        const snapshot = await window.db.collection('classSessions')
            .where('section', '==', `${user.gradeLevel} - ${user.section}`)
            .get();

        const tableBody = document.getElementById('today-classes-body');
        const statSubjects = document.getElementById('stat-subjects');
        
        let count = 0;
        tableBody.innerHTML = '';
        
        snapshot.forEach(doc => {
            count++;
            const s = doc.data();
            const row = `<tr><td>${formatTime(s.startTime)}</td><td><strong>${s.subject}</strong></td><td>${s.teacherName || 'TBA'}</td><td><span class="badge-success">Scheduled</span></td></tr>`;
            tableBody.innerHTML += row;
        });

        statSubjects.innerText = count;
        if(count === 0) tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No classes scheduled today.</td></tr>';

    } catch (e) {
        console.error(e);
    }
}

function formatTime(timeStr) {
    if (!timeStr) return "";
    const [hour, minute] = timeStr.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minute} ${ampm}`;
}