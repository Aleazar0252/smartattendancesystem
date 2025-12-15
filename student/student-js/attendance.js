/**
 * attendance.js (Student) - FINAL SYNCED VERSION
 * Logic:
 * 1. Verifies the Custom Student ID (e.g., 202500006) exactly like schedule.js.
 * 2. Uses that ID to find enrolled classes (to get Teacher Names).
 * 3. Uses that ID to find Attendance Records.
 */

let allAttendanceRecords = [];
let subjectTeacherMap = {}; // Maps "Math" -> "Mr. Smith"

document.addEventListener('DOMContentLoaded', () => {
    if (window.sessionManager && window.sessionManager.isLoggedIn()) {
        const user = window.sessionManager.getSession();
        document.getElementById('header-user-name').innerText = user.name || "Student";
        
        // Start the loading process with Identity Verification
        initAttendanceLoad(user);
    } else {
        window.location.href = '../index.html';
    }
});

/**
 * STEP 0: VERIFY IDENTITY (Matches schedule.js logic)
 * Ensures we have the correct "2025..." ID before doing anything.
 */
async function initAttendanceLoad(user) {
    const tbody = document.getElementById('attendance-list-body');
    tbody.innerHTML = '<tr><td colspan="4" class="loading-cell">Verifying student identity...</td></tr>';

    try {
        let studentCustomId = user.userId || user.studentId || user.lrn;
        const firestoreDocId = user.uid || user.id || user.userId;

        // If session doesn't have the custom ID, fetch it from DB
        if (!studentCustomId || studentCustomId.length > 20) {
            console.log("⚠️ Custom ID missing in session. Fetching from database...");
            const userDoc = await window.db.collection('users').doc(firestoreDocId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                studentCustomId = userData.userId || userData.lrn;
            }
        }

        if (!studentCustomId) {
            tbody.innerHTML = '<tr><td colspan="4" style="color:red; text-align:center;">Error: Could not determine Student ID.</td></tr>';
            return;
        }

        console.log("✅ Using Verified Student ID:", studentCustomId);

        // Now load data using the correct ID
        await loadSubjectMap(studentCustomId, user);
        await loadStudentAttendance(studentCustomId);

    } catch (e) {
        console.error("Identity Error:", e);
        tbody.innerHTML = `<tr><td colspan="4" style="color:red; text-align:center;">Error: ${e.message}</td></tr>`;
    }
}

/**
 * STEP 1: LOAD SUBJECT MAP (To find Teachers)
 * Queries 'classSessions' using the verified Custom ID.
 */
async function loadSubjectMap(studentCustomId, user) {
    try {
        const queries = [];

        // A. Direct Enrollment (Check 'classStudents' for Custom ID)
        if (studentCustomId) {
            queries.push(
                window.db.collection('classSessions')
                    .where('classStudents', 'array-contains', studentCustomId)
                    .get()
            );
        }

        // B. Section Based (Legacy Support)
        if (user.gradeLevel && user.section) {
            const userSection = `${user.gradeLevel} - ${user.section}`;
            queries.push(
                window.db.collection('classSessions').where('section', '==', userSection).get()
            );
        }

        const snapshots = await Promise.all(queries);

        // Build the Map
        snapshots.forEach(snap => {
            snap.forEach(doc => {
                const data = doc.data();
                const subject = data.subject;
                const teacher = data.teacherName || data.teacher || "Unknown";
                
                if (subject) {
                    subjectTeacherMap[subject] = teacher;
                }
            });
        });
        
        console.log("Subject-Teacher Map built:", subjectTeacherMap);

    } catch (e) {
        console.error("Error building subject map:", e);
    }
}

/**
 * STEP 2: LOAD ATTENDANCE RECORDS
 * Queries 'attendance' collection using the verified Custom ID.
 */
async function loadStudentAttendance(studentCustomId) {
    const tbody = document.getElementById('attendance-list-body');
    tbody.innerHTML = '<tr><td colspan="4" class="loading-cell">Loading your records...</td></tr>';
    
    try {
        // Use the Custom ID here because Teacher Portal saves it as 'userId'
        const snap = await window.db.collection('attendance')
            .where('userId', '==', studentCustomId)
            .get();

        if (snap.empty) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px; color: #666;">
                No attendance records found.
            </td></tr>`;
            updateStats([]);
            return;
        }

        allAttendanceRecords = [];
        
        snap.forEach(doc => {
            const d = doc.data();
            
            // Match Teacher using the Subject Map
            let finalTeacher = "Faculty";
            if (subjectTeacherMap[d.subject]) {
                finalTeacher = subjectTeacherMap[d.subject];
            } else if (d.teacherName) {
                finalTeacher = d.teacherName;
            }

            allAttendanceRecords.push({
                docId: doc.id,
                ...d,
                date: d.attendanceTime || '1970-01-01',
                displayTeacher: finalTeacher
            });
        });

        // Sort by Date (Newest first)
        allAttendanceRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

        renderAttendanceTable(allAttendanceRecords);

    } catch (e) {
        console.error("Error loading attendance:", e);
        tbody.innerHTML = `<tr><td colspan="4" style="color:red; text-align:center;">Error: ${e.message}</td></tr>`;
    }
}

function renderAttendanceTable(data) {
    const tbody = document.getElementById('attendance-list-body');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#999;">No records for this period.</td></tr>';
        if(data === allAttendanceRecords) updateStats(data);
        return;
    }

    data.forEach(r => {
        let badgeStyle = '';
        let statusText = 'Present';
        const status = r.status ? r.status.toUpperCase() : 'P';

        if (['L', 'LATE'].includes(status)) {
            badgeStyle = 'background:#fff3cd; color:#856404;'; 
            statusText = 'Late';
        } else if (['A', 'ABSENT'].includes(status)) {
            badgeStyle = 'background:#f8d7da; color:#721c24;'; 
            statusText = 'Absent';
        } else {
            badgeStyle = 'background:#d4edda; color:#155724;'; 
            statusText = 'Present';
        }

        // Date Format
        const dateObj = new Date(r.date);
        const dateDisplay = isNaN(dateObj.getTime()) ? r.date : dateObj.toLocaleDateString('en-US', {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
        });

        const row = `
            <tr>
                <td>${dateDisplay}</td>
                <td><strong>${r.subject}</strong></td>
                <td>${r.displayTeacher}</td> 
                <td><span style="${badgeStyle} padding: 5px 10px; border-radius: 15px; font-size: 0.8rem; font-weight:600;">${statusText}</span></td>
            </tr>
        `;
        tbody.innerHTML += row;
    });

    if(data.length === allAttendanceRecords.length) {
        updateStats(data);
    }
}

function updateStats(data) {
    let p = 0, l = 0, a = 0;
    
    data.forEach(r => {
        const s = r.status ? r.status.toUpperCase() : 'P';
        if (['P', 'PRESENT'].includes(s)) p++;
        else if (['L', 'LATE'].includes(s)) l++;
        else if (['A', 'ABSENT'].includes(s)) a++;
    });

    document.getElementById('stat-present').innerText = p;
    document.getElementById('stat-late').innerText = l;
    document.getElementById('stat-absent').innerText = a;

    const total = p + l + a;
    let rate = 0;
    if (total > 0) {
        rate = ((p + l) / total) * 100;
    }
    document.getElementById('stat-rate').innerText = Math.round(rate) + '%';
}

window.filterAttendance = function() {
    const filter = document.getElementById('month-filter').value;
    
    if (filter === 'all') {
        renderAttendanceTable(allAttendanceRecords);
    } else if (filter === 'this_month') {
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();

        const filtered = allAttendanceRecords.filter(r => {
            const d = new Date(r.date);
            return !isNaN(d.getTime()) && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        });
        renderAttendanceTable(filtered);
    }
};