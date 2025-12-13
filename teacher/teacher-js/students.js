/**
 * students.js (Teacher) - FIXED VERSION
 * Logic: References students by their Firestore Document ID.
 * 1. 'cacheAllStudents' saves doc.id as the userId.
 * 2. 'loadStudentsInClass' fetches details using .doc(id).get().
 */

let currentActiveSection = null; 
let currentClassId = null;       
let allDbStudents = [];          
let batchList = [];              

document.addEventListener('DOMContentLoaded', () => {
    if (window.sessionManager && window.sessionManager.isLoggedIn()) {
        const user = window.sessionManager.getSession();
        document.getElementById('header-user-name').innerText = user.name;
        loadTeacherClasses(user.name);
    }
    
    // Close modal when clicking outside
    window.onclick = function(event) {
        const modal = document.getElementById('add-student-modal');
        if (event.target === modal) modal.style.display = "none";
    }
});

// ==========================================
// 1. LOAD CLASS CARDS
// ==========================================
async function loadTeacherClasses(teacherName) {
    const container = document.getElementById('classes-container');
    
    try {
        // Support both "teacherName" and "teacher" fields for compatibility
        const [snap1, snap2] = await Promise.all([
            window.db.collection('classSessions').where('teacherName', '==', teacherName).get(),
            window.db.collection('classSessions').where('teacher', '==', teacherName).get()
        ]);

        const classMap = new Map();

        const process = (doc) => {
            const d = doc.data();
            if(!classMap.has(doc.id)) {
                classMap.set(doc.id, {
                    docId: doc.id, 
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
            const count = c.classStudents ? c.classStudents.length : 0;

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
                    <div class="card-meta" style="font-size: 0.8rem; color: #888; margin-top:5px;">
                        <i class="fas fa-users"></i> ${count} Students
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
    currentActiveSection = classData.section; 
    currentClassId = classData.docId; 

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
    
    // Refresh to update student counts
    const user = window.sessionManager.getSession();
    loadTeacherClasses(user.name);
}

// ==========================================
// 3. LOAD STUDENTS (DIRECT REFERENCE FETCH)
// ==========================================
async function loadStudentsInClass() {
    const tbody = document.getElementById('class-students-body');
    tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">Loading students...</td></tr>';

    if (!currentClassId) return;

    try {
        // 1. Get the Class Document to find the list of IDs
        const classDoc = await window.db.collection('classSessions').doc(currentClassId).get();
        if (!classDoc.exists) return;

        const data = classDoc.data();
        const storedUserIds = data.classStudents || []; 

        if (!storedUserIds || storedUserIds.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No students added to this class yet.</td></tr>';
            return;
        }

        console.log(`Fetching details for ${storedUserIds.length} students...`);

        // 2. Fetch all student documents directly using their Document ID
        const studentPromises = storedUserIds.map(id => 
            window.db.collection('users').doc(id).get()
        );

        const studentDocs = await Promise.all(studentPromises);
        
        let enrolledStudents = [];

        studentDocs.forEach((doc, index) => {
            if (doc.exists) {
                const sData = doc.data();
                enrolledStudents.push({
                    userId: doc.id, // The actual Document ID
                    lrn: sData.lrn || 'N/A',
                    fullName: `${sData.firstName} ${sData.lastName}`,
                    gender: sData.gender || 'N/A',
                    email: sData.email || 'N/A',
                    phone: sData.phone || 'N/A',
                    parentContact: sData.parentContact || 'N/A',
                    lastName: sData.lastName || ''
                });
            } else {
                console.warn(`Student ID stored in class but missing in Users DB: ${storedUserIds[index]}`);
            }
        });

        // 3. Render Table
        tbody.innerHTML = '';
        
        if (enrolledStudents.length === 0) {
             tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">
                Students are enrolled, but their user profiles were not found in the database.
             </td></tr>`;
             return;
        }
        
        // Sort alphabetically by last name
        enrolledStudents.sort((a,b) => a.lastName.localeCompare(b.lastName));

        enrolledStudents.forEach(s => {
            tbody.innerHTML += `
                <tr>
                    <td>${s.lrn}</td>
                    <td><strong>${s.fullName}</strong></td>
                    <td>${s.gender}</td>
                    <td>${s.email}</td>
                    <td>${s.phone}</td>
                    <td>${s.parentContact}</td>
                    <td style="text-align:center;">
                        <button class="btn-icon" style="color:#dc3545" title="Remove" 
                            onclick="removeStudent('${s.userId}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

    } catch(e) {
        console.error("Error loading students:", e);
        tbody.innerHTML = `<tr><td colspan="7" style="color:red">Error: ${e.message}</td></tr>`;
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
// 4. BATCH ADD MODAL (Use Doc ID)
// ==========================================
async function showAddStudentModal() {
    document.getElementById('modal-section-name').innerText = currentActiveSection;
    batchList = [];
    document.getElementById('search-db-input').value = "";
    renderBatchList();
    await cacheAllStudents();
    document.getElementById('add-student-modal').style.display = 'block';
}

async function cacheAllStudents() {
    const datalist = document.getElementById('db-students-list');
    
    // Only fetch if empty to save reads
    if(allDbStudents.length > 0) return; 

    datalist.innerHTML = '';
    const snap = await window.db.collection('users').where('role', '==', 'student').get();
    
    snap.forEach(doc => {
        const d = doc.data();
        allDbStudents.push({
            // CRITICAL: Save the Document ID as the userId
            userId: doc.id, 
            fullName: `${d.firstName} ${d.lastName}`,
            lrn: d.lrn || 'N/A'
        });
    });

    allDbStudents.forEach(s => {
        const opt = document.createElement('option');
        // The value contains the name + ID so we can look it up later
        opt.value = `${s.fullName} (${s.userId})`;
        datalist.appendChild(opt);
    });
}

function addToBatch() {
    const val = document.getElementById('search-db-input').value;
    const student = allDbStudents.find(s => `${s.fullName} (${s.userId})` === val);

    if(!student) { alert("Please select a valid student from the list."); return; }
    if(batchList.find(b => b.userId === student.userId)) { alert("Already in list."); return; }

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
                <span>${s.fullName} (${s.userId})</span>
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
// 5. SAVE BATCH
// ==========================================
async function saveBatchStudents() {
    const btn = document.getElementById('btn-save-batch');
    btn.innerText = "Enrolling...";
    btn.disabled = true;

    try {
        if (!currentClassId) throw new Error("No Class Session ID found.");

        const classRef = window.db.collection('classSessions').doc(currentClassId);
        
        // Extract just the IDs to save to the array
        const userIdsToAdd = batchList.map(s => s.userId);

        await classRef.update({
            classStudents: firebase.firestore.FieldValue.arrayUnion(...userIdsToAdd)
        });
        
        alert("Students successfully enrolled!");
        closeModal('add-student-modal');
        loadStudentsInClass(); // Reload table

    } catch(e) {
        console.error(e);
        alert("Error: " + e.message);
    } finally {
        btn.innerText = "Confirm & Enroll";
        btn.disabled = false;
    }
}

// ==========================================
// 6. REMOVE STUDENT
// ==========================================
function removeStudent(targetUserId) {
    if(confirm(`Remove this student from the class?`)) {
        if (!currentClassId) return;

        const classRef = window.db.collection('classSessions').doc(currentClassId);

        classRef.update({
            classStudents: firebase.firestore.FieldValue.arrayRemove(targetUserId)
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