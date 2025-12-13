/**
 * schedule.js (Student) - FINAL SYNC WITH TEACHER PORTAL
 * Logic:
 * The Teacher Portal saves specific ID strings into the 'classStudents' array.
 * We must check if that array contains OUR 'studentId' OR OUR 'userId'.
 */

document.addEventListener('DOMContentLoaded', () => {
    if (window.sessionManager && window.sessionManager.isLoggedIn()) {
        const user = window.sessionManager.getSession();
        document.getElementById('header-user-name').innerText = user.name || "Student";
        
        // Display section if available
        const sectionStr = (user.gradeLevel && user.section) 
            ? `${user.gradeLevel} - ${user.section}` 
            : "Enrolled Classes";
            
        document.getElementById('schedule-section-display').innerText = sectionStr;
        
        loadStudentSchedule(user, sectionStr);
    } else {
        window.location.href = '../index.html';
    }
});

async function loadStudentSchedule(user, sectionStr) {
    const tbody = document.getElementById('schedule-list-body');
    tbody.innerHTML = '<tr><td colspan="4" class="loading-cell">Searching for your classes...</td></tr>';

    try {
        const queries = [];

        // 1. Standard Search: By Section
        // (For classes added by section, not individual enrollment)
        if (user.gradeLevel && user.section) {
            queries.push(
                window.db.collection('classSessions')
                    .where('section', '==', sectionStr)
                    .get()
            );
        }

        // 2. Enrollment Search: Check 'studentId'
        // Checks if the teacher added you using your "Student ID" (e.g. 2024-001)
        if (user.studentId) {
            queries.push(
                window.db.collection('classSessions')
                    .where('classStudents', 'array-contains', user.studentId)
                    .get()
            );
        }

        // 3. Enrollment Search: Check 'userId'
        // Checks if the teacher added you using your "User ID" (e.g. S-2024-001)
        if (user.userId && user.userId !== user.studentId) {
            queries.push(
                window.db.collection('classSessions')
                    .where('classStudents', 'array-contains', user.userId)
                    .get()
            );
        }

        // --- EXECUTE ---
        const snapshots = await Promise.all(queries);

        // --- MERGE RESULTS ---
        // We use a Map to automatically remove duplicates if a class is found twice
        const scheduleMap = new Map();

        snapshots.forEach(snap => {
            snap.forEach(doc => {
                if (!scheduleMap.has(doc.id)) {
                    scheduleMap.set(doc.id, doc.data());
                }
            });
        });

        // --- RENDER ---
        if (scheduleMap.size === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">No classes found.</td></tr>';
            return;
        }

        const schedules = Array.from(scheduleMap.values());
        
        // Sort by Time
        schedules.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

        tbody.innerHTML = '';
        schedules.forEach(s => {
            const row = `
                <tr>
                    <td><strong>${s.subject}</strong></td>
                    <td>${s.teacherName || s.teacher || 'TBA'}</td>
                    <td><span class="badge-success" style="background:#e3f2fd; color:#0d47a1;">${s.days || 'Daily'}</span></td>
                    <td>${formatTime(s.startTime)} - ${formatTime(s.endTime)}</td>
                </tr>
            `;
            tbody.innerHTML += row;
        });

    } catch (e) {
        console.error("Schedule Load Error:", e);
        tbody.innerHTML = `<tr><td colspan="4" style="color:red; text-align:center;">Error: ${e.message}</td></tr>`;
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