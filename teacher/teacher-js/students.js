// teacher-js/students.js

let currentUserUid = null; // Store the Teacher's ID

document.addEventListener('DOMContentLoaded', () => {
    initializePage();
});

async function initializePage() {
    // 1. Check Login
    if (!window.sessionManager || !sessionManager.isLoggedIn()) {
        window.location.href = '../login.html';
        return;
    }

    // 2. Get Teacher Info
    const session = sessionManager.getSession();
    currentUserUid = session.uid; // <--- IMPORTANT: We need this ID to link students
    
    // Update Header
    document.getElementById('teacher-name').textContent = `${session.firstName} ${session.lastName}`;
    document.getElementById('header-avatar').textContent = session.firstName.charAt(0);

    // 3. Load ONLY My Students
    await loadMyStudents();

    // 4. Hide Loader
    const preloader = document.getElementById('preloader');
    if(preloader) preloader.style.display = 'none';
}

// --- LOAD STUDENTS (FILTERED) ---
async function loadMyStudents() {
    const tbody = document.getElementById('students-table-body');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Loading your students...</td></tr>';

    try {
        console.log("Fetching students for Adviser ID:", currentUserUid);

        // QUERY: Get users who are 'students' AND belong to 'me'
        const snapshot = await db.collection('users')
            .where('role', '==', 'student')
            .where('adviserId', '==', currentUserUid) // <--- THE FILTER
            .get();
        
        if (snapshot.empty) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center; padding:30px;">
                        <div style="color:#888; margin-bottom:10px;"><i class="fas fa-user-graduate" style="font-size:2rem;"></i></div>
                        <p>No students found in your list.</p>
                        <button class="btn-primary" onclick="openAddModal()" style="margin:auto; font-size:0.8rem;">
                            Add Your First Student
                        </button>
                    </td>
                </tr>`;
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const s = doc.data();
            html += `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div class="avatar-sm">${s.firstName.charAt(0)}</div>
                            <div style="display:flex; flex-direction:column;">
                                <span style="font-weight:600; font-size:0.95rem;">${s.lastName}, ${s.firstName}</span>
                            </div>
                        </div>
                    </td>
                    <td>${s.email}</td>
                    <td style="font-family:monospace; color:#666;">${s.password || '••••••'}</td>
                    <td><span class="status-badge">Enrolled</span></td>
                    <td>
                        <button class="btn-icon" onclick="deleteStudent('${doc.id}')" title="Remove from class">
                            <i class="fas fa-trash" style="color:#dc3545;"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;

    } catch (error) {
        console.error("Error:", error);
        // Handle "Missing Index" error gracefully
        if (error.message.includes("index")) {
            alert("System Alert: A new database index is required for filtering. Please check the console (F12) and click the link provided by Firebase.");
        }
        tbody.innerHTML = '<tr><td colspan="5" style="color:red; text-align:center">Error loading data. Check console.</td></tr>';
    }
}

// --- ADD STUDENT (LINKED TO TEACHER) ---
document.getElementById('addStudentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get values
    const firstName = document.getElementById('new-firstname').value.trim();
    const lastName = document.getElementById('new-lastname').value.trim();
    const email = document.getElementById('new-email').value.trim();
    const password = document.getElementById('new-password').value.trim();

    if(!currentUserUid) {
        alert("Session Error: Cannot identify teacher. Please relogin.");
        return;
    }

    // Submit Button Loading State
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = "Saving...";
    btn.disabled = true;

    try {
        // SAVE TO FIRESTORE
        // We add 'adviserId' so we know who this student belongs to.
        await db.collection('users').add({
            firstName: firstName,
            lastName: lastName,
            email: email,
            password: password,
            role: 'student',       // Role is student
            adviserId: currentUserUid, // <--- LINKS TO THIS TEACHER
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert(`✅ Success! ${firstName} has been added to your list.`);
        closeAddModal();
        document.getElementById('addStudentForm').reset();
        
        // Refresh the table
        loadMyStudents();

    } catch (error) {
        console.error("Add Error:", error);
        alert("Error adding student: " + error.message);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
});

// --- MODAL UTILITIES ---
window.openAddModal = function() {
    document.getElementById('addStudentModal').style.display = 'block';
}

window.closeAddModal = function() {
    document.getElementById('addStudentModal').style.display = 'none';
}

window.deleteStudent = async function(docId) {
    if(confirm("Are you sure you want to remove this student from your class?")) {
        try {
            await db.collection('users').doc(docId).delete();
            loadMyStudents(); // Refresh
        } catch(e) {
            alert("Error: " + e.message);
        }
    }
}

// Search Filter
window.filterStudents = function() {
    const q = document.getElementById('student-search').value.toLowerCase();
    const rows = document.querySelectorAll('#students-table-body tr');
    rows.forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(q) ? '' : 'none';
    });
}