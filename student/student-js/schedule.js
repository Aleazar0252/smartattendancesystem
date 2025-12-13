/**
 * schedule.js (Student) - FIXED
 * Logic: Finds classes where 'classStudents' contains this user's Document ID.
 * Aligns with the Teacher Portal's new saving method.
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

        // --- QUERY 1: DIRECT ENROLLMENT (The New Standard) ---
        // The Teacher Portal now saves the Student's Document ID into the 'classStudents' array.
        // We must check if that array contains OUR Document ID.
        
        const myDocId = user.userId || user.uid || user.id;

        if (myDocId) {
            queries.push(
                window.db.collection('classSessions')
                    .where('classStudents', 'array-contains', myDocId)
                    .get()
            );
        } else {
            console.warn("No valid Document ID found in session for enrollment check.");
        }

        // --- QUERY 2: SECTION BASED (Legacy/Fallback) ---
        // If a teacher assigned a class to the whole "Grade 10 - Ruby" section
        // without adding students individually, this catches it.
        if (user.gradeLevel && user.section) {
            // Reconstruct the section string just to be safe (e.g., "Grade 10 - Ruby")
            // Ensure this format matches what is saved in 'classSessions' field 'section'
            const userSection = `${user.gradeLevel} - ${user.section}`;
            
            // Also check the raw section string passed in
            if (sectionStr && sectionStr !== userSection) {
                 queries.push(
                    window.db.collection('classSessions').where('section', '==', sectionStr).get()
                );
            }
            
            queries.push(
                window.db.collection('classSessions').where('section', '==', userSection).get()
            );
        }

        // --- EXECUTE & MERGE ---
        const snapshots = await Promise.all(queries);

        // Use a Map to prevent duplicates (if matched by both ID and Section)
        const scheduleMap = new Map();

        snapshots.forEach(snap => {
            snap.forEach(doc => {
                if (!scheduleMap.has(doc.id)) {
                    scheduleMap.set(doc.id, {
                        id: doc.id, 
                        ...doc.data()
                    });
                }
            });
        });

        // --- RENDER ---
        if (scheduleMap.size === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#666;">No classes found in your schedule.</td></tr>';
            return;
        }

        const schedules = Array.from(scheduleMap.values());
        
        // Sort by Time (Earliest first)
        schedules.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

        tbody.innerHTML = '';
        schedules.forEach(s => {
            const row = `
                <tr>
                    <td><strong>${s.subject}</strong></td>
                    <td>${s.teacherName || s.teacher || 'TBA'}</td>
                    <td><span style="background:#e3f2fd; color:#0d47a1; padding:4px 8px; border-radius:4px; font-size:0.85rem;">${s.days || 'Daily'}</span></td>
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