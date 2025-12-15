/**
 * dashboard.js (Student) - COMPLETE
 * Logic:
 * 1. Fetches Schedule (Dual Query) -> Updates 'Enrolled Subjects' & Table
 * 2. Fetches Attendance -> Updates 'Present Days' & 'Absences'
 */

document.addEventListener('DOMContentLoaded', () => {
    if (window.sessionManager && window.sessionManager.isLoggedIn()) {
        const user = window.sessionManager.getSession();
        
        // Basic Security Redirect
        if(user.role !== 'student') { window.location.href = '../index.html'; return; }

        // Update UI Text
        document.getElementById('header-user-name').innerText = user.name || "Student";
        document.getElementById('welcome-name').innerText = user.firstName || user.name || "Student";
        
        // Load Data
        loadDashboardData(user);
    } else {
        window.location.href = '../index.html';
    }
});

async function loadDashboardData(user) {
    const userId = user.userId || user.uid || user.id;

    if (!userId) {
        console.error("User ID missing.");
        return;
    }

    // --- 1. LOAD SCHEDULE & SUBJECTS ---
    try {
        const queries = [];
        
        // A. Direct Enrollment (New Standard)
        queries.push(
            window.db.collection('classSessions')
                .where('classStudents', 'array-contains', userId)
                .get()
        );

        // B. Section Based (Legacy Support)
        if (user.gradeLevel && user.section) {
            const userSection = `${user.gradeLevel} - ${user.section}`;
            queries.push(
                window.db.collection('classSessions')
                    .where('section', '==', userSection)
                    .get()
            );
        }

        const snapshots = await Promise.all(queries);
        
        // Merge results to avoid duplicates
        const classMap = new Map();
        snapshots.forEach(snap => {
            snap.forEach(doc => {
                if (!classMap.has(doc.id)) {
                    classMap.set(doc.id, doc.data());
                }
            });
        });

        const classes = Array.from(classMap.values());
        
        // UPDATE STAT: Enrolled Subjects
        document.getElementById('stat-subjects').innerText = classes.length;

        // UPDATE TABLE: Today's Classes
        renderTodayClasses(classes);

    } catch (e) {
        console.error("Error loading schedule:", e);
    }

    // --- 2. LOAD ATTENDANCE STATS ---
    try {
        const attendSnap = await window.db.collection('attendance')
            .where('userId', '==', userId)
            .get();

        let presentCount = 0;
        let absentCount = 0;

        attendSnap.forEach(doc => {
            const status = (doc.data().status || '').toUpperCase();
            
            // Count Present (P) and Late (L) as "Present Days"
            if (status === 'PRESENT' || status === 'P' || status === 'LATE' || status === 'L') {
                presentCount++;
            }
            // Count Absent (A)
            else if (status === 'ABSENT' || status === 'A') {
                absentCount++;
            }
        });

        // UPDATE STATS
        document.getElementById('stat-present').innerText = presentCount;
        document.getElementById('stat-absent').innerText = absentCount;

    } catch (e) {
        console.error("Error loading attendance stats:", e);
    }
}

function renderTodayClasses(classes) {
    const tableBody = document.getElementById('today-classes-body');
    tableBody.innerHTML = '';
    
    if (classes.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No classes enrolled yet.</td></tr>';
        return;
    }

    // Sort by Start Time
    classes.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    classes.forEach(s => {
        // Teacher Name Logic (matches your other files)
        const teacherName = s.teacherName || s.teacher || 'TBA';
        
        const row = `
            <tr>
                <td>${formatTime(s.startTime)}</td>
                <td><strong>${s.subject}</strong></td>
                <td>${teacherName}</td>
                <td><span class="badge-success" style="background:#e3f2fd; color:#0d47a1;">Scheduled</span></td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

function formatTime(timeStr) {
    if (!timeStr) return "";
    const [hour, minute] = timeStr.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minute} ${ampm}`;
}