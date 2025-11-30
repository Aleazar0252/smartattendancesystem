document.addEventListener('DOMContentLoaded', () => {
    if(window.currentUser) {
        document.getElementById('header-user-name').innerText = window.currentUser.name;
        loadSchedules();
    }
});

async function loadSchedules() {
    const tbody = document.getElementById('schedule-body');
    try {
        const snap = await window.db.collection('classSessions')
            .where('teacher', '==', window.currentUser.name)
            .get();

        tbody.innerHTML = '';
        if(snap.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No schedules found.</td></tr>';
            return;
        }

        snap.forEach(doc => {
            const s = doc.data();
            tbody.innerHTML += `
                <tr>
                    <td><strong>${s.subject}</strong></td>
                    <td>${s.section}</td>
                    <td><span style="color:#28a745">${s.days}</span></td>
                    <td>${s.startTime} - ${s.endTime}</td>
                    <td>${s.room || 'TBA'}</td>
                </tr>
            `;
        });
    } catch(e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="5" style="color:red">Error loading data.</td></tr>';
    }
}