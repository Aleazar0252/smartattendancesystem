document.addEventListener('DOMContentLoaded', () => {
    if(window.currentUser) {
        document.getElementById('header-user-name').innerText = window.currentUser.name;
        loadStudents();
    }
});

async function loadStudents() {
    const tbody = document.getElementById('students-body');
    try {
        const snap = await window.db.collection('users')
            .where('role', '==', 'student')
            .get();

        tbody.innerHTML = '';
        if(snap.empty) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No students found.</td></tr>';
            return;
        }

        snap.forEach(doc => {
            const s = doc.data();
            tbody.innerHTML += `
                <tr>
                    <td>${s.lrn || 'N/A'}</td>
                    <td><strong>${s.lastName}, ${s.firstName}</strong></td>
                    <td>${s.gradeLevel} - ${s.section}</td>
                    <td>
                        <button class="btn-icon" title="View Profile"><i class="fas fa-eye"></i></button>
                        <button class="btn-icon" style="color:#d9534f" title="Report Incident"><i class="fas fa-exclamation-triangle"></i></button>
                    </td>
                </tr>
            `;
        });
    } catch(e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="4" style="color:red">Error loading data.</td></tr>';
    }
}

function searchTable() {
    const input = document.getElementById('search-student').value.toLowerCase();
    const rows = document.querySelectorAll('#students-body tr');
    rows.forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(input) ? '' : 'none';
    });
}