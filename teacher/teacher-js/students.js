/**
 * students.js
 * Student Management for Teachers
 * Includes: List View & Add Student Modal with Searchable Section
 */

document.addEventListener('DOMContentLoaded', () => {
    if (window.sessionManager && window.sessionManager.isLoggedIn()) {
        const user = window.sessionManager.getSession();
        document.getElementById('header-user-name').innerText = user.name;
        loadStudents();
    }
    
    // Close Modal on Click Outside
    window.onclick = function(event) {
        const modal = document.getElementById('add-student-modal');
        if (event.target === modal) {
            modal.style.display = "none";
        }
    }
});

// --- 1. LOAD STUDENTS ---
async function loadStudents() {
    const tbody = document.getElementById('my-students-body');
    try {
        // Teachers see ALL students (or filter by advisory if you prefer)
        const snapshot = await window.db.collection('users')
            .where('role', '==', 'student')
            .get();

        tbody.innerHTML = '';
        if(snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No students found.</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const s = doc.data();
            const row = `
                <tr>
                    <td>${s.lrn || 'N/A'}</td>
                    <td><strong>${s.lastName}, ${s.firstName}</strong></td>
                    <td>${s.gradeLevel} - ${s.section}</td>
                    <td>
                        <button class="btn-icon"><i class="fas fa-eye"></i></button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });

    } catch (e) {
        console.error(e);
    }
}

// --- 2. LOAD SECTIONS FOR DROPDOWN (DATALIST) ---
async function loadAvailableSections() {
    const dataList = document.getElementById('sections-list');
    const input = document.getElementById('new-section-input'); // Ensure you added this ID in HTML
    
    // Create datalist if not in HTML yet, or ensure HTML has <datalist id="sections-list">
    if(!dataList) return; 

    dataList.innerHTML = '';
    
    try {
        const snap = await window.db.collection('sections').orderBy('gradeLevel').get();
        snap.forEach(doc => {
            const s = doc.data();
            const option = document.createElement('option');
            option.value = `${s.gradeLevel} - ${s.sectionName}`;
            dataList.appendChild(option);
        });
    } catch(e) {
        console.error("Error loading sections", e);
    }
}

// --- 3. ADD STUDENT LOGIC ---
async function submitNewStudent() {
    const lrn = document.getElementById('new-lrn').value;
    const fname = document.getElementById('new-fname').value;
    const lname = document.getElementById('new-lname').value;
    
    // Parse Grade/Section from Input
    const sectionInput = document.getElementById('new-section-input').value; // Needs to match HTML ID
    
    if(!lrn || !fname || !lname || !sectionInput) {
        alert("Please fill in all fields.");
        return;
    }

    if (!sectionInput.includes(' - ')) {
        alert("Please select a valid section from the list.");
        return;
    }

    const [grade, sectionName] = sectionInput.split(' - ');

    try {
        await window.db.collection('users').add({
            lrn,
            firstName: fname,
            lastName: lname,
            gradeLevel: grade.trim(),
            section: sectionName.trim(),
            role: 'student',
            password: generatePassword(),
            createdAt: new Date()
        });
        
        alert("Student Added Successfully!");
        closeModal('add-student-modal');
        loadStudents();
    } catch(e) {
        alert("Error: " + e.message);
    }
}

function generatePassword() {
    return Math.random().toString(36).slice(-8);
}

// --- UI HELPERS ---
window.showAddStudentModal = function() {
    document.getElementById('add-student-form').reset();
    document.getElementById('add-student-modal').style.display = 'block';
    
    // We assume the HTML has the new <input list="sections-list"> structure
    // If not, you need to update teacher/students.html to match the Admin one
    loadAvailableSections(); 
};

window.closeModal = function(id) {
    document.getElementById(id).style.display = 'none';
};