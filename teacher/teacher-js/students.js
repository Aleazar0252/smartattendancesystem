/**
 * students.js (Teacher)
 * Features: Class Cards, Drill-down View, Batch Add Existing Students
 */

let currentActiveSection = null; // Stores currently opened section (e.g., "Grade 7 - Rizal")
let currentActiveGrade = null;   // Stores grade level
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
        // Dual Query
        const [snap1, snap2] = await Promise.all([
            window.db.collection('classSessions').where('teacherName', '==', teacherName).get(),
            window.db.collection('classSessions').where('teacher', '==', teacherName).get()
        ]);

        const classMap = new Map();

        const process = (doc) => {
            const d = doc.data();
            // Key: Section + Subject (to make unique cards)
            const key = `${d.section}-${d.subject}`; 
            if(!classMap.has(key)) {
                classMap.set(key, d);
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
            card.onclick = () => openClassDetail(c);
            
            card.innerHTML = `
                <div class="card-header-strip"></div>
                <div class="card-body">
                    <div class="card-subject">${c.subject}</div>
                    <div class="card-section">${c.section}</div>
                    <div class="card-meta"><i class="fas fa-clock"></i> ${formatTime(c.startTime)} - ${formatTime(c.endTime)}</div>
                    <div class="card-meta"><i class="fas fa-calendar-alt"></i> ${c.days || 'Daily'}</div>
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
    currentActiveSection = classData.section; // e.g. "Grade 7 - Rizal" or "Rizal"
    
    // Parse Grade if possible (assuming format "Grade 7 - Rizal")
    if(currentActiveSection.includes(' - ')) {
        currentActiveGrade = currentActiveSection.split(' - ')[0].trim();
    } else {
        currentActiveGrade = ""; // Will update without changing grade if unknown
    }

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
}

// ==========================================
// 3. LOAD STUDENTS IN ACTIVE CLASS
// ==========================================
async function loadStudentsInClass() {
    const tbody = document.getElementById('class-students-body');
    tbody.innerHTML = '<tr><td colspan="4" class="loading-cell">Loading students...</td></tr>';

    try {
        // Parse section name for query (if DB stores "Rizal" but display is "Grade 7 - Rizal")
        let searchSec = currentActiveSection;
        if(currentActiveSection.includes(' - ')) {
            searchSec = currentActiveSection.split(' - ')[1].trim();
        }

        // Query
        const snapshot = await window.db.collection('users')
            .where('role', '==', 'student')
            .where('section', '==', searchSec)
            .get();

        tbody.innerHTML = '';
        if(snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No students in this class yet.</td></tr>';
            return;
        }

        let students = [];
        snapshot.forEach(doc => students.push({ id: doc.id, ...doc.data() }));
        
        // Sort Alphabetical
        students.sort((a,b) => a.lastName.localeCompare(b.lastName));

        students.forEach(s => {
            tbody.innerHTML += `
                <tr>
                    <td>${s.lrn || 'N/A'}</td>
                    <td><strong>${s.lastName}, ${s.firstName}</strong></td>
                    <td>${s.gender || '-'}</td>
                    <td>
                        <button class="btn-icon" style="color:#dc3545" title="Remove" onclick="removeStudent('${s.id}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

    } catch(e) {
        console.error(e);
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

    if(!student) { alert("Please select a valid student."); return; }
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

async function saveBatchStudents() {
    const btn = document.getElementById('btn-save-batch');
    btn.innerText = "Saving...";
    btn.disabled = true;

    try {
        // Prepare Data (Only Update Section and Grade)
        // Note: This moves the student to this class. If you want them in multiple classes, 
        // you need a separate 'enrollments' collection instead of updating the 'users' doc.
        // Assuming 1 Section per Student logic based on previous chats:
        
        const updates = batchList.map(s => {
            // Only update grade if we know it, otherwise keep existing
            let updateData = { section: currentActiveSection };
            if(currentActiveGrade) updateData.gradeLevel = currentActiveGrade;
            
            // Handle split string "Grade 7 - Rizal" -> "Rizal"
            if(currentActiveSection.includes(' - ')) {
                updateData.section = currentActiveSection.split(' - ')[1].trim();
            }

            return window.db.collection('users').doc(s.id).update(updateData);
        });

        await Promise.all(updates);
        
        alert("Students Added!");
        closeModal('add-student-modal');
        loadStudentsInClass();

    } catch(e) {
        alert("Error: " + e.message);
    } finally {
        btn.innerText = "Confirm & Enroll";
        btn.disabled = false;
    }
}

function removeStudent(id) {
    if(confirm("Remove student from this class?")) {
        window.db.collection('users').doc(id).update({
            section: "Unassigned",
            gradeLevel: "Unassigned"
        }).then(() => loadStudentsInClass());
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