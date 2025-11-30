document.addEventListener('DOMContentLoaded', () => {
    if(window.currentUser) {
        document.getElementById('header-user-name').innerText = window.currentUser.name;
        document.getElementById('disp-grade').innerText = window.currentUser.gradeLevel;
        document.getElementById('disp-section').innerText = window.currentUser.section;
        loadSchedule();
    }
});

async function loadSchedule() {
    const tbody = document.getElementById('schedule-body');
    try {
        // Fetch classes that match the student's SECTION
        const snap = await window.db.collection('classSessions')
            .where('section', '==', window.currentUser.section)
            .get();

        tbody.innerHTML = '';
        if(snap.empty) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No schedules found for your section.</td></tr>';
            return;
        }

        snap.forEach(doc => {
            const s = doc.data();
            tbody.innerHTML += `
                <tr>
                    <td><strong>${s.subject}</strong></td>
                    <td>${s.teacher}</td>
                    <td><span style="color:#28a745">${s.days}</span></td>
                    <td>${s.startTime} - ${s.endTime}</td>
                </tr>
            `;
        });
    } catch(e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="4" style="color:red">Error loading schedule.</td></tr>';
    }
}