/**
 * attendance.js
 * Teacher Attendance Management
 */

document.addEventListener('DOMContentLoaded', () => {
    if (window.sessionManager && window.sessionManager.isLoggedIn()) {
        const user = window.sessionManager.getSession();
        document.getElementById('header-user-name').innerText = user.name;
        loadClassDropdown(user.uid);
    }
});

async function loadClassDropdown(teacherId) {
    const select = document.getElementById('class-select');
    
    try {
        const snap = await window.db.collection('classSessions')
            .where('teacherId', '==', teacherId)
            .get();

        select.innerHTML = '<option value="">-- Select Class --</option>';
        
        if (snap.empty) {
            select.innerHTML = '<option>No classes assigned</option>';
            return;
        }

        let addedSections = [];
        
        snap.forEach(doc => {
            const data = doc.data();
            // Avoid duplicates in dropdown
            if (!addedSections.includes(data.section)) {
                addedSections.push(data.section);
                const option = document.createElement('option');
                option.value = data.section; // e.g. "Grade 7 - Rizal"
                option.text = `${data.section} (${data.subject})`;
                select.appendChild(option);
            }
        });

    } catch (e) {
        console.error(e);
    }
}

// Called when dropdown changes
window.loadClassList = async function() {
    const section = document.getElementById('class-select').value;
    const tbody = document.getElementById('attendance-body');
    
    if (!section) return;

    // Parse "Grade 7 - Rizal" to get section name if needed, 
    // but usually we store the full string "Grade 7 - Rizal" in user.section
    // Assuming user.section matches classSessions.section exactly:

    try {
        // Query Students in this section
        // Note: Make sure your User data 'section' field matches the dropdown value format
        // Ideally: section="Rizal", gradeLevel="Grade 7"
        
        // This query might need adjustment depending on exact data format
        // Here we try searching by the full string first
        let snap = await window.db.collection('users')
            .where('role', '==', 'student')
            .where('section', '==', section.split(' - ')[1].trim()) // Try to get just "Rizal"
            .get();

        tbody.innerHTML = '';
        if(snap.empty) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No students found in this section.</td></tr>';
            return;
        }

        snap.forEach(doc => {
            const s = doc.data();
            const row = `
                <tr>
                    <td><strong>${s.lastName}, ${s.firstName}</strong></td>
                    <td><span class="badge-success" style="background:#d4edda; color:#155724;">Present</span></td>
                    <td>
                        <button class="btn btn-primary" style="padding:5px 10px; font-size:0.8rem; background:#dc3545;" onclick="markAbsent('${doc.id}')">
                            Mark Absent
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });

    } catch (e) {
        console.error("Attendance Load Error:", e);
    }
};

window.markAbsent = function(studentId) {
    alert("Marked absent (Demo logic)");
};