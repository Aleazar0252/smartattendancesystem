/**
 * attendance.js
 * Teacher Attendance: 
 * Saves individual documents per student in 'attendance' collection.
 */

let currentSection = "";
let currentSubject = "";
let currentClassId = ""; // Firestore Doc ID of the Class Session
let currentTeacherId = ""; // To store teacherId
let loadedStudents = []; // Stores merged data (Student Info + Attendance Status)

document.addEventListener('DOMContentLoaded', () => {
    if (window.sessionManager && window.sessionManager.isLoggedIn()) {
        const user = window.sessionManager.getSession();
        document.getElementById('header-user-name').innerText = user.name;
        
        // Store Teacher ID for the record
        currentTeacherId = user.uid || user.id; 

        // 1. Load Classes
        loadTeacherClasses(user.name);
        
        // 2. Set Date to Today
        document.getElementById('attendance-date').valueAsDate = new Date();
    }
});

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
            // Use Doc ID as key to ensure we capture the specific class ID
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
            const card = document.createElement('div');
            card.className = 'class-card';
            card.onclick = () => openAttendanceSheet(c);
            
            card.innerHTML = `
                <div class="card-header-strip"></div>
                <div class="card-body">
                    <div class="card-subject">${c.subject}</div>
                    <div class="card-section">${c.section}</div>
                    <div class="card-footer" style="background:transparent; padding:0; border:none;">
                        <span style="font-size:0.85rem;"><i class="fas fa-clock"></i> ${c.days || 'Daily'}</span>
                    </div>
                </div>
                <div class="card-footer">
                    <span>Take Attendance</span>
                    <i class="fas fa-chevron-right"></i>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (e) {
        console.error(e);
    }
}

// --- 2. OPEN SHEET & PREPARE ---
function openAttendanceSheet(classData) {
    currentSection = classData.section;
    currentSubject = classData.subject;
    currentClassId = classData.docId; // Vital for fetching enrolled students

    document.getElementById('att-subject').innerText = currentSubject;
    document.getElementById('att-section').innerText = currentSection;

    document.getElementById('view-classes-grid').style.display = 'none';
    document.getElementById('view-attendance-sheet').style.display = 'block';

    loadAttendanceForDate();
}

function backToGrid() {
    document.getElementById('view-classes-grid').style.display = 'grid';
    document.getElementById('view-attendance-sheet').style.display = 'none';
}

// --- 3. LOAD DATA (MERGE ENROLLED STUDENTS + EXISTING ATTENDANCE) ---
async function loadAttendanceForDate() {
    const dateStr = document.getElementById('attendance-date').value;
    const tbody = document.getElementById('attendance-table-body');
    tbody.innerHTML = '<tr><td colspan="3" class="loading-cell">Loading records...</td></tr>';

    try {
        // STEP A: Fetch Enrolled Students from classSessions
        const classDoc = await window.db.collection('classSessions').doc(currentClassId).get();
        if (!classDoc.exists) {
            tbody.innerHTML = '<tr><td colspan="3">Class data not found.</td></tr>';
            return;
        }
        
        const enrolledUserIds = classDoc.data().classStudents || [];
        if (enrolledUserIds.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No students enrolled in this class.</td></tr>';
            return;
        }

        // STEP B: Fetch Student Details (Name, etc.)
        const studentPromises = enrolledUserIds.map(uid => 
            window.db.collection('users').where('userId', '==', uid).get()
        );
        const studentSnaps = await Promise.all(studentPromises);
        
        let studentsBase = [];
        studentSnaps.forEach(snap => {
            if(!snap.empty) {
                const s = snap.docs[0].data();
                studentsBase.push({
                    studentId: s.userId || s.studentId, // The Custom ID
                    firstName: s.firstName,
                    lastName: s.lastName,
                    fullName: `${s.lastName}, ${s.firstName}`,
                    status: 'Present', // Default status
                    remarks: ''
                });
            }
        });

        // STEP C: Check for Existing Attendance in 'attendance' collection
        // Query: section + subject + attendanceTime
        const attSnap = await window.db.collection('attendance')
            .where('section', '==', currentSection)
            .where('subject', '==', currentSubject)
            .where('attendanceTime', '==', dateStr)
            .get();

        // Create a map of existing attendance for quick lookup
        const attMap = {};
        attSnap.forEach(doc => {
            const data = doc.data();
            attMap[data.studentId] = data; // Key by studentId
        });

        // STEP D: Merge Data
        loadedStudents = studentsBase.map(s => {
            if (attMap[s.studentId]) {
                // If record exists, use that status
                return { 
                    ...s, 
                    status: attMap[s.studentId].status,
                    remarks: attMap[s.studentId].remarks || '' // If you add remarks field later
                };
            }
            return s; // Otherwise return default (Present)
        });

        // Sort by Name
        loadedStudents.sort((a,b) => a.lastName.localeCompare(b.lastName));
        renderTable(loadedStudents);

    } catch (e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="3" style="color:red">Error: ${e.message}</td></tr>`;
    }
}

function renderTable(studentList) {
    const tbody = document.getElementById('attendance-table-body');
    tbody.innerHTML = '';

    studentList.forEach((s, index) => {
        const row = document.createElement('tr');
        const uniqueId = `s_${index}`; // For radio grouping
        
        row.innerHTML = `
            <td>
                <div style="font-weight:600;">${s.lastName}, ${s.firstName}</div>
                <div style="font-size:0.8rem; color:#666;">ID: ${s.studentId}</div>
            </td>
            <td>
                <div class="att-options">
                    <input type="radio" name="${uniqueId}" id="${uniqueId}_p" class="att-radio" value="Present" ${s.status==='Present'?'checked':''} onchange="updateStatus(${index}, 'Present')">
                    <label for="${uniqueId}_p" class="att-label present" title="Present">P</label>

                    <input type="radio" name="${uniqueId}" id="${uniqueId}_l" class="att-radio" value="Late" ${s.status==='Late'?'checked':''} onchange="updateStatus(${index}, 'Late')">
                    <label for="${uniqueId}_l" class="att-label late" title="Late">L</label>

                    <input type="radio" name="${uniqueId}" id="${uniqueId}_a" class="att-radio" value="Absent" ${s.status==='Absent'?'checked':''} onchange="updateStatus(${index}, 'Absent')">
                    <label for="${uniqueId}_a" class="att-label absent" title="Absent">A</label>
                </div>
            </td>
            <td>
                <span style="font-size:0.8rem; color:#888;">${s.status}</span>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    calculateSummary();
}

// --- 4. STATE MANAGEMENT ---
window.updateStatus = function(index, status) {
    loadedStudents[index].status = status;
    // Re-render just the summary or small UI update if needed, 
    // but here we just recalc totals
    calculateSummary();
};

window.markAllPresent = function() {
    loadedStudents.forEach((s, i) => {
        s.status = 'Present';
        const radio = document.getElementById(`s_${i}_p`);
        if(radio) radio.checked = true;
    });
    calculateSummary();
};

function calculateSummary() {
    let p = 0, l = 0, a = 0;
    loadedStudents.forEach(s => {
        if(s.status === 'Present') p++;
        else if(s.status === 'Late') l++;
        else if(s.status === 'Absent') a++;
    });
    
    document.getElementById('count-p').innerText = p;
    document.getElementById('count-l').innerText = l;
    document.getElementById('count-a').innerText = a;
}

// --- 5. SAVE TO FIREBASE (BATCH WRITE) ---
window.saveAttendance = async function() {
    const dateStr = document.getElementById('attendance-date').value;
    const btn = document.querySelector('.btn-primary');
    
    if(loadedStudents.length === 0) return;

    btn.innerText = "Saving...";
    btn.disabled = true;

    try {
        const batch = window.db.batch();
        
        // Loop through all students and prepare a document for each
        loadedStudents.forEach(s => {
            // Create a unique ID for the document: StudentID_Subject_Date
            // This ensures we update the existing record if it exists, rather than creating duplicates
            const docId = `${s.studentId}_${currentSubject}_${dateStr}`.replace(/ /g, '_');
            const docRef = window.db.collection('attendance').doc(docId);

            // The Fields you requested
            const record = {
                attendanceTime: dateStr, // Using the date string selected
                firstName: s.firstName,
                lastName: s.lastName,
                section: currentSection,
                status: s.status,
                subject: currentSubject,
                teacherId: currentTeacherId,
                studentId: s.studentId
            };

            batch.set(docRef, record);
        });

        // Commit all writes at once
        await batch.commit();

        alert("Attendance Saved Successfully!");

    } catch (e) {
        console.error(e);
        alert("Error saving: " + e.message);
    } finally {
        btn.innerHTML = '<i class="fas fa-save"></i> Save Record';
        btn.disabled = false;
    }
};