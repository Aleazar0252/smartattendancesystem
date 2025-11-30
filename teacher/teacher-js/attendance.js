/**
 * attendance.js
 * Manages class selection and student list display
 */

let myClasses = [];

document.addEventListener('DOMContentLoaded', () => {
    if(window.currentUser) {
        document.getElementById('header-user-name').innerText = window.currentUser.name;
        loadClassDropdown();
    }
});

// 1. Load Classes into Dropdown
async function loadClassDropdown() {
    const select = document.getElementById('class-select');
    const db = window.db;

    try {
        // Fetch classes assigned to this teacher
        const snap = await db.collection('classSessions')
            .where('teacher', '==', window.currentUser.name)
            .get();

        select.innerHTML = '<option value="">-- Select a Class --</option>';
        myClasses = [];

        if (snap.empty) {
            select.innerHTML = '<option value="">No classes assigned</option>';
            return;
        }

        snap.forEach(doc => {
            const data = doc.data();
            myClasses.push(data);
            const option = document.createElement('option');
            // Use Section as the value to filter students later
            option.value = data.section; 
            option.text = `${data.subject} - ${data.section} (${data.days})`;
            select.appendChild(option);
        });

    } catch (e) {
        console.error("Error loading classes:", e);
        select.innerHTML = '<option>Error loading data</option>';
    }
}

// 2. Load Students when Class is Selected
async function loadClassList() {
    const section = document.getElementById('class-select').value;
    const tbody = document.getElementById('attendance-body');
    const db = window.db;

    if (!section) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Please select a class above.</td></tr>';
        return;
    }

    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading students...</td></tr>';

    try {
        // Fetch students belonging to the selected section
        const snap = await db.collection('users')
            .where('role', '==', 'student')
            .where('section', '==', section)
            .get();

        tbody.innerHTML = '';

        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No students found in this section.</td></tr>';
            return;
        }

        snap.forEach(doc => {
            const s = doc.data();
            tbody.innerHTML += `
                <tr>
                    <td><strong>${s.lastName}, ${s.firstName}</strong></td>
                    <td><span class="badge-success" style="background:#d4edda; color:#155724;">Present</span></td>
                    <td>-</td>
                    <td>
                        <button class="btn btn-primary" style="padding:5px 10px; font-size:0.8rem;" onclick="alert('Marked Absent: ${s.firstName}')">
                            Mark Absent
                        </button>
                    </td>
                </tr>
            `;
        });

    } catch (e) {
        console.error("Error loading students:", e);
        tbody.innerHTML = '<tr><td colspan="4" style="color:red; text-align:center;">Error loading student list.</td></tr>';
    }
}