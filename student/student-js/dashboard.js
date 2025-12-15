/**
 * attendance.js (Teacher) - FINAL VERSION
 * Features:
 * 1. Verifies Teacher Identity (Fetches Custom ID if missing).
 * 2. Saves attendance with the correct Teacher Custom ID.
 * 3. Checks for existing records using Date String (YYYY-MM-DD).
 */

let currentSection = "";
let currentSubject = "";
let currentClassId = ""; // Firestore Doc ID of the Class Session
let currentTeacherId = ""; // Custom ID (e.g., 2023-001)
let loadedStudents = []; 

document.addEventListener('DOMContentLoaded', () => {
    if (window.sessionManager && window.sessionManager.isLoggedIn()) {
        const user = window.sessionManager.getSession();
        document.getElementById('header-user-name').innerText = user.name;
        
        // Initialize with Identity Verification
        initTeacherAttendance(user);
        
        // Set Date to Today
        document.getElementById('attendance-date').valueAsDate = new Date();
    }
});

// --- 0. IDENTITY VERIFICATION ---
async function initTeacherAttendance(user) {
    try {
        // Priority: Custom ID -> LRN -> Doc ID
        let teacherCustomId = user.userId || user.studentId || user.lrn;
        const firestoreDocId = user.uid || user.id || user.userId;

        // If session missing custom ID, fetch from DB
        if (!teacherCustomId || teacherCustomId.length > 20) {
            console.log("⚠️ Teacher Custom ID missing in session. Fetching from database...");
            const userDoc = await window.db.collection('users').doc(firestoreDocId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                teacherCustomId = userData.userId || userData.lrn;
            }
        }

        currentTeacherId = teacherCustomId || firestoreDocId;
        console.log("✅ Using Teacher ID:", currentTeacherId);

        // Load Classes using Name (as class sessions usually store Teacher Name)
        loadTeacherClasses(user.name);

    } catch (e) {
        console.error("Identity Error:", e);
    }
}

// --- 1. LOAD CLASS CARDS ---
async function loadTeacherClasses(teacherName) {
    const container = document.getElementById('classes-container');
    
    try {
        const [snap1, snap2] = await Promise.all([
            window.db.collection('classSessions').where('teacherName', '==', teacherName).get(),
            window.db.collection('classSessions').where('teacher', '==', teacherName).get()
        ]);

        const classMap = new Map();
        const process = (doc) => {
            const d = doc.data();
            if(!classMap.has(doc.id)) {
                classMap.set(doc.id, { docId: doc.id, ...d });
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
            card.onclick = () => openClassAttendance(c);
            
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
            `;
            container.appendChild(card);
        });

    } catch (e) {
        console.error(e);
        container.innerHTML = '<p style="color:red">Error loading classes</p>';
    }
}

// --- 2. OPEN ATTENDANCE SHEET ---
function openClassAttendance(c) {
    currentClassId = c.docId;
    currentSubject = c.subject;
    currentSection = c.section;

    document.getElementById('view-classes-grid').style.display = 'none';
    document.getElementById('view-attendance-sheet').style.display = 'block';
    
    document.getElementById('sheet-subject').innerText = c.subject;
    document.getElementById('sheet-section').innerText = c.section;
    document.getElementById('page-title').innerText = "Take Attendance";

    loadStudentsForAttendance();
}

function backToGrid() {
    document.getElementById('view-classes-grid').style.display = 'block';
    document.getElementById('view-attendance-sheet').style.display = 'none';
    document.getElementById('page-title').innerText = "Attendance";
    currentClassId = null;
    loadedStudents = [];
}

// --- 3. LOAD STUDENTS ---
async function loadStudentsForAttendance() {
    const tbody = document.getElementById('attendance-table-body');
    tbody.innerHTML = '<tr><td colspan="3" class="loading-cell">Loading student list...</td></tr>';
    
    if (!currentClassId) return;

    try {
        // A. Get Class List (IDs)
        const classDoc = await window.db.collection('classSessions').doc(currentClassId).get();
        if (!classDoc.exists) return;
        
        const storedUserIds = classDoc.data().classStudents || [];
        
        if (storedUserIds.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No students enrolled in this class.</td></tr>';
            updateCounts();
            return;
        }

        console.log(`Fetching ${storedUserIds.length} students...`);

        // B. Fetch Student Details (Query by Custom ID)
        const studentPromises = storedUserIds.map(customId => 
            window.db.collection('users').where('userId', '==', customId).get()
        );

        const snapshots = await Promise.all(studentPromises);
        
        // C. Build Student List
        loadedStudents = [];
        snapshots.forEach((snap, index) => {
            if (!snap.empty) {
                const doc = snap.docs[0];
                const d = doc.data();
                loadedStudents.push({
                    userId: d.userId, // The Student's Custom ID
                    docId: doc.id,    
                    studentIdDisplay: d.lrn || 'N/A', 
                    firstName: d.firstName,
                    lastName: d.lastName,
                    fullName: `${d.firstName} ${d.lastName}`,
                    status: 'P', // Default
                    remarks: ''
                });
            }
        });

        // Sort alphabetically
        loadedStudents.sort((a,b) => a.lastName.localeCompare(b.lastName));

        // D. Check for Existing Attendance Record
        await checkExistingAttendance();

        // E. Render Table
        renderAttendanceTable();

    } catch(e) {
        console.error("Error loading students:", e);
        tbody.innerHTML = `<tr><td colspan="3" style="color:red">Error: ${e.message}</td></tr>`;
    }
}

// --- 4. CHECK EXISTING & MERGE ---
async function checkExistingAttendance() {
    const dateVal = document.getElementById('attendance-date').value;
    if (!dateVal || loadedStudents.length === 0) return;

    try {
        // We use dateVal (String YYYY-MM-DD) here.
        // If we used a timestamp, we couldn't easily find "Today's" record.
        const snap = await window.db.collection('attendance')
            .where('subject', '==', currentSubject)
            .where('section', '==', currentSection)
            .where('attendanceTime', '==', dateVal)
            .get();

        if (!snap.empty) {
            const existingRecords = {};
            snap.forEach(doc => {
                const d = doc.data();
                // Match using the Student's Custom ID
                if(d.userId) existingRecords[d.userId] = d;
            });

            loadedStudents.forEach(s => {
                if (existingRecords[s.userId]) {
                    s.status = existingRecords[s.userId].status;
                    s.remarks = existingRecords[s.userId].remarks || "";
                }
            });
        } 
    } catch (e) {
        console.error("Error checking existing records", e);
    }
}

// --- 5. RENDER TABLE ---
function renderAttendanceTable() {
    const tbody = document.getElementById('attendance-table-body');
    tbody.innerHTML = '';

    if (loadedStudents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No student profiles found.</td></tr>';
        return;
    }

    loadedStudents.forEach((s, index) => {
        const row = document.createElement('tr');
        
        let statusClass = '';
        if(s.status === 'P') statusClass = 'present';
        else if(s.status === 'L') statusClass = 'late';
        else if(s.status === 'A') statusClass = 'absent';

        row.innerHTML = `
            <td>
                <strong>${s.lastName}, ${s.firstName}</strong><br>
                <small style="color:#888">${s.studentIdDisplay}</small>
            </td>
            <td>
                <select class="status-select ${statusClass}" onchange="updateStatus(${index}, this)">
                    <option value="P" ${s.status === 'P' ? 'selected' : ''}>Present</option>
                    <option value="L" ${s.status === 'L' ? 'selected' : ''}>Late</option>
                    <option value="A" ${s.status === 'A' ? 'selected' : ''}>Absent</option>
                </select>
            </td>
            <td>
                <input type="text" class="form-control" placeholder="Optional..." 
                    value="${s.remarks}" oninput="updateRemarks(${index}, this.value)">
            </td>
        `;
        tbody.appendChild(row);
    });

    updateCounts();
}

function updateStatus(index, selectEl) {
    const val = selectEl.value;
    loadedStudents[index].status = val;
    selectEl.className = 'status-select ' + 
        (val === 'P' ? 'present' : val === 'L' ? 'late' : 'absent');
    updateCounts();
}

function updateRemarks(index, val) {
    loadedStudents[index].remarks = val;
}

function updateCounts() {
    const p = loadedStudents.filter(s => s.status === 'P').length;
    const l = loadedStudents.filter(s => s.status === 'L').length;
    const a = loadedStudents.filter(s => s.status === 'A').length;

    document.getElementById('count-p').innerText = p;
    document.getElementById('count-l').innerText = l;
    document.getElementById('count-a').innerText = a;
}

function markAllPresent() {
    loadedStudents.forEach(s => s.status = 'P');
    renderAttendanceTable();
}

// --- 6. SAVE ATTENDANCE ---
async function saveAttendance() {
    const dateStr = document.getElementById('attendance-date').value;
    if (!dateStr) { alert("Please select a date."); return; }

    const btn = document.getElementById('btn-save-attendance');
    if(loadedStudents.length === 0) return;

    btn.innerText = "Saving...";
    btn.disabled = true;

    try {
        const batch = window.db.batch();
        
        loadedStudents.forEach(s => {
            // Create a unique ID for this record
            // We use the Student's Custom ID + Subject + Date
            const docId = `${s.userId}_${currentSubject}_${dateStr}`.replace(/[\s\/]/g, '_');
            const docRef = window.db.collection('attendance').doc(docId);

            const record = {
                attendanceTime: dateStr, // Kept as String for easy querying
                timestamp: firebase.firestore.FieldValue.serverTimestamp(), // Exact creation time
                
                // Student Details
                firstName: s.firstName,
                lastName: s.lastName,
                userId: s.userId, // Student Custom ID
                studentId: s.studentIdDisplay,
                
                // Class Details
                subject: currentSubject,
                section: currentSection,
                sessionId: currentClassId,
                
                // Teacher Details (UPDATED)
                teacherId: currentTeacherId, // Teacher Custom ID (Verified)
                teacherName: document.getElementById('header-user-name').innerText,
                
                // Status
                status: s.status,
                remarks: s.remarks || ""
            };

            batch.set(docRef, record, { merge: true });
        });

        await batch.commit();
        alert("Attendance Saved Successfully!");

    } catch (e) {
        console.error(e);
        alert("Error saving: " + e.message);
    } finally {
        btn.innerHTML = '<i class="fas fa-save"></i> Save Attendance';
        btn.disabled = false;
    }
}

function formatTime(timeStr) {
    if (!timeStr) return "";
    const [hour, minute] = timeStr.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minute} ${ampm}`;
}