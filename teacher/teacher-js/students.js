document.addEventListener('DOMContentLoaded', () => {
    if(window.currentUser) {
        document.getElementById('header-user-name').innerText = window.currentUser.name;
        loadStudents();
    }
});

function showModal() { document.getElementById('add-student-modal').style.display = 'block'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

async function loadStudents() {
    const tbody = document.getElementById('student-body');
    try {
        const snap = await window.db.collection('users')
            .where('role', '==', 'student')
            .where('adviserId', '==', window.currentUser.uid)
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
                    <td><span class="badge-success">${s.status || 'Active'}</span></td>
                </tr>
            `;
        });
    } catch(e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="4" style="color:red">Error loading data.</td></tr>';
    }
}

async function addStudent() {
    try {
        await window.db.collection('users').add({
            lrn: document.getElementById('new-lrn').value,
            firstName: document.getElementById('new-fname').value,
            lastName: document.getElementById('new-lname').value,
            gradeLevel: document.getElementById('new-grade').value,
            section: document.getElementById('new-section').value,
            role: 'student',
            adviserId: window.currentUser.uid,
            status: 'Active',
            createdAt: new Date()
        });
        alert("Student Added Successfully!");
        closeModal('add-student-modal');
        document.getElementById('add-student-form').reset();
        loadStudents();
    } catch(e) {
        alert("Error: " + e.message);
    }
}