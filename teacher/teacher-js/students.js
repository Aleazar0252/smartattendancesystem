/**
 * students.js (Teacher)
 * Features: Class Cards, Drill-down View, Batch Add Existing Students to Class Session
 */

let currentActiveSection = null; // Display name for UI
let currentClassId = null;       // CRITICAL: The specific Firestore Doc ID of the Class Session
let allDbStudents = [];          // Cache for search
let batchList = [];              // Temp list for modal

document.addEventListener('DOMContentLoaded', () => {
    if (window.sessionManager && window.sessionManager.isLoggedIn()) {
        const user = window.sessionManager.getSession();
        document.getElementById('header-user-name').innerText = user.name;
        loadTeacherClasses(user.name);
    }
    
    window.onclick = function(event) {
        const modal = document.getElementById('add-student-modal');
        if (event.target === modal) modal.style.display = "none";
    }
});

// ==========================================
// 1. LOAD CLASS CARDS (GRID VIEW)
// ==========================================
async function loadTeacherClasses(teacherName) {
    const container = document.getElementById('classes-container');
    
    try {
        // Dual Query to catch 'teacherName' or 'teacher' field
        const [snap1, snap2] = await Promise.all([
            window.db.collection('classSessions').where('teacherName', '==', teacherName).get(),
            window.db.collection('classSessions').where('teacher', '==', teacherName).get()
        ]);

        const classMap = new Map();

        const process = (doc) => {
            const d = doc.data();
            // Use Doc ID as key to ensure uniqueness
            if(!classMap.has(doc.id)) {
                classMap.set(doc.id, {
                    docId: doc.id, // Store the Firestore ID
                    ...d
                });
            }
        };

        snap1.forEach(process);
        snap2.forEach(process);

        if (classMap.size === 0) {
            container.innerHTML = '<p>No classes assigned.</p>';
            return;
        }

        container.innerHTML = '';
        classMap.forEach(c => {
            // Card HTML
            const card = document.createElement('div');
            card.className = 'class-card';
            // Pass the entire object including docId
            card.onclick = () => openClassDetail(c);
            
            card.innerHTML = `
                <div class="card-header-strip"></div>
                <div class="card-body">
                    <div class="card-subject">${c.subject}</div>
                    <div class="card-section">${c.section}</div>
                    <div class="card-meta"><i class="fas fa-clock"></i> ${formatTime(c.startTime)} - ${formatTime(c.endTime)}</div>
                    <div class="card-meta"><i class="fas fa-calendar-alt"></i> ${c.days || 'Daily'}</div>
                    <div class="card-meta" style="font-size: 0.8rem; color: #888; margin-top:5px;">
                        <i class="fas fa-users"></i> ${c.students ? c.students.length : 0} Students
                    </div>
                </div>
                <div class="card-footer">
                    <span>Manage Students</span>
                    <i class="fas fa-arrow-right"></i>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (e) {
        console.error("Error loading classes", e);
        container.innerHTML = '<p style="color:red">Error loading data</p>';
    }
}

// ==========================================
// 2. CLASS DETAIL VIEW
// ==========================================
function openClassDetail(classData) {
    // Store Context
    currentActiveSection = classData.section; 
    currentClassId = classData.docId; // Store the specific document ID

    // UI Updates
    document.getElementById('view-classes-grid').style.display = 'none';
    document.getElementById('view-class-detail').style.display = 'block';
    
    document.getElementById('detail-subject').innerText = classData.subject;
    document.getElementById('detail-section').innerText = classData.section;
    document.getElementById('page-title').innerText = "Manage Class";

    loadStudentsInClass();
}

function backToGrid() {
    document.getElementById('view-classes-grid').style.display = 'block';
    document.getElementById('view-class-detail').style.display = 'none';
    document.getElementById('page-title').innerText = "My Classes";
    currentActiveSection = null;
    currentClassId = null;
    
    // Reload grid to update student counts
    const user = window.sessionManager.getSession();
    loadTeacherClasses(user.name);
}

// ==========================================
// 3. LOAD STUDENTS IN ACTIVE CLASS (UPDATED)
// ==========================================
async function loadStudentsInClass() {
    const tbody = document.getElementById('class-students-body');
    tbody.innerHTML = '<tr><td colspan="4" class="loading-cell">Loading students...</td></tr>';

    if (!currentClassId) {
        tbody.innerHTML = '<tr><td colspan="4" style="color:red">Error: No Class ID selected.</td></tr>';
        return;
    }

    try {
        // Fetch the specific Class Session Document
        const doc = await window.db.collection('classSessions').doc(currentClassId).get();
        
        if (!doc.exists) {
            tbody.innerHTML = '<tr><td colspan="4">Class session not found.</td></tr>';
            return;
        }

        const data = doc.data();
        const enrolledStudents = data.students || []; // Get the array of students

        tbody.innerHTML = '';
        if (enrolledStudents.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No students added to this class yet.</td></tr>';
            return;
        }

        // Sort Alphabetical
        enrolledStudents.sort((a,b) => a.fullName.localeCompare(b.fullName));

        // Render from the array stored in classSessions
        enrolledStudents.forEach(s => {
            // Note: s contains { uid, fullName, lrn }
            tbody.innerHTML += `
                <tr>
                    <td>${s.lrn || 'N/A'}</td>
                    <td><strong>${s.fullName}</strong></td>
                    <td><span style="color:#666; font-size:0.85rem">Enrolled</span></td>
                    <td>
                        <button class="btn-icon" style="color:#dc3545" title="Remove" 
                            onclick="removeStudent('${s.uid}', '${s.fullName.replace(/'/g, "\\'")}', '${s.lrn}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

    } catch(e) {
        console.error("Error loading students:", e);
        tbody.innerHTML = `<tr><td colspan="4" style="color:red">Error: ${e.message}</td></tr>`;
    }
}

function filterStudentTable() {
    const input = document.getElementById('search-student-table').value.toLowerCase();
    const rows = document.querySelectorAll('#class-students-body tr');
    rows.forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(input) ? '' : 'none';
    });
}

// ==========================================
// 4. BATCH ADD STUDENT MODAL
// ==========================================
async function showAddStudentModal() {
    document.getElementById('modal-section-name').innerText = currentActiveSection;
    batchList = [];
    document.getElementById('search-db-input').value = "";
    renderBatchList();
    
    // Load Datalist cache
    await cacheAllStudents();
    
    document.getElementById('add-student-modal').style.display = 'block';
}

async function cacheAllStudents() {
    const datalist = document.getElementById('db-students-list');
    if(allDbStudents.length > 0) return; // Already loaded

    datalist.innerHTML = '';
    const snap = await window.db.collection('users').where('role', '==', 'student').get();
    
    snap.forEach(doc => {
        const d = doc.data();
        allDbStudents.push({
            id: doc.id,
            fullName: `${d.firstName} ${d.lastName}`,
            lrn: d.lrn || 'N/A'
        });
    });

    allDbStudents.forEach(s => {
        const opt = document.createElement('option');
        opt.value = `${s.fullName} (${s.lrn})`;
        datalist.appendChild(opt);
    });
}

function addToBatch() {
    const val = document.getElementById('search-db-input').value;
    const student = allDbStudents.find(s => `${s.fullName} (${s.lrn})` === val);

    if(!student) { alert("Please select a valid student from the list."); return; }
    
    // Check if already in batch list
    if(batchList.find(b => b.id === student.id)) { alert("Already in list."); return; }

    batchList.push(student);
    document.getElementById('search-db-input').value = "";
    renderBatchList();
}

function renderBatchList() {
    const container = document.getElementById('batch-list-body');
    const btn = document.getElementById('btn-save-batch');
    
    document.getElementById('batch-count').innerText = batchList.length;
    btn.disabled = batchList.length === 0;

    if(batchList.length === 0) {
        container.innerHTML = '<div style="padding:15px; text-align:center; color:#999;">No students selected.</div>';
        return;
    }

    let html = '';
    batchList.forEach((s, idx) => {
        html += `
            <div class="batch-item">
                <span>${s.fullName}</span>
                <button class="remove-batch-btn" onclick="removeFromBatch(${idx})"><i class="fas fa-times"></i></button>
            </div>
        `;
    });
    container.innerHTML = html;
}

function removeFromBatch(idx) {
    batchList.splice(idx, 1);
    renderBatchList();
}

// ==========================================
// 5. SAVE STUDENTS TO classSessions (UPDATED)
// ==========================================
async function saveBatchStudents() {
    const btn = document.getElementById('btn-save-batch');
    btn.innerText = "Enrolling...";
    btn.disabled = true;

    try {
        if (!currentClassId) throw new Error("No Class Session ID found.");

        const classRef = window.db.collection('classSessions').doc(currentClassId);

        // Prepare simple objects to save inside the array
        const studentsToAdd = batchList.map(s => ({
            uid: s.id,
            fullName: s.fullName,
            lrn: s.lrn
        }));

        // Use arrayUnion to add students to the 'students' array field in classSessions
        await classRef.update({
            students: firebase.firestore.FieldValue.arrayUnion(...studentsToAdd)
        });
        
        alert("Students successfully enrolled!");
        closeModal('add-student-modal');
        loadStudentsInClass();

    } catch(e) {
        console.error(e);
        alert("Error: " + e.message);
    } finally {
        btn.innerText = "Confirm & Enroll";
        btn.disabled = false;
    }
}

// ==========================================
// 6. REMOVE STUDENT FROM CLASS (UPDATED)
// ==========================================
function removeStudent(uid, fullName, lrn) {
    if(confirm(`Remove ${fullName} from this class?`)) {
        if (!currentClassId) return;

        const classRef = window.db.collection('classSessions').doc(currentClassId);

        // Construct the EXACT object to remove (Firestore needs exact match for arrayRemove)
        const studentToRemove = {
            uid: uid,
            fullName: fullName,
            lrn: lrn
        };

        classRef.update({
            students: firebase.firestore.FieldValue.arrayRemove(studentToRemove)
        })
        .then(() => {
            loadStudentsInClass();
        })
        .catch(err => {
            alert("Error removing student: " + err.message);
        });
    }
}

// Helpers
function formatTime(timeStr) {
    if (!timeStr) return "";
    const [hour, minute] = timeStr.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minute} ${ampm}`;
}

window.closeModal = function(id) {
    document.getElementById(id).style.display = 'none';
};