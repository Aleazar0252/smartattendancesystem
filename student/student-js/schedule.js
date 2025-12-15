/**
 * schedule.js (Student) - SMART FETCH VERSION
 * Logic:
 * 1. Checks if 'userId' (e.g. 202500006) is in the session.
 * 2. If NOT, it fetches the user profile using the Document ID to find it.
 * 3. Uses that ID to find classes in 'classStudents'.
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
        
        // Start the loading process
        initScheduleLoad(user, sectionStr);
    } else {
        window.location.href = '../index.html';
    }
});

async function initScheduleLoad(user, sectionStr) {
    const tbody = document.getElementById('schedule-list-body');
    tbody.innerHTML = '<tr><td colspan="4" class="loading-cell">Verifying student identity...</td></tr>';

    try {
        // STEP 1: GET THE CORRECT STUDENT ID (e.g., "202500006")
        let studentCustomId = user.userId || user.studentId || user.lrn;
        const firestoreDocId = user.uid || user.id || user.userId; // The long random string

        // If the session didn't save the custom ID, let's fetch it now
        if (!studentCustomId || studentCustomId.length > 20) {
            // (Length check > 20 assumes it might be accidentally using the Doc ID)
            console.log("⚠️ Custom ID missing in session. Fetching from database...");
            
            const userDoc = await window.db.collection('users').doc(firestoreDocId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                // Grab the field named 'userId' from the document
                studentCustomId = userData.userId || userData.lrn;
                console.log("✅ Found Student ID from DB:", studentCustomId);
            }
        } else {
            console.log("✅ Using Session Student ID:", studentCustomId);
        }

        // STEP 2: LOAD SCHEDULE USING THAT ID
        await loadStudentSchedule(studentCustomId, user, sectionStr);

    } catch (e) {
        console.error("Identity Error:", e);
        tbody.innerHTML = `<tr><td colspan="4" style="color:red; text-align:center;">Error verifying identity: ${e.message}</td></tr>`;
    }
}

async function loadStudentSchedule(studentCustomId, user, sectionStr) {
    const tbody = document.getElementById('schedule-list-body');
    tbody.innerHTML = '<tr><td colspan="4" class="loading-cell">Searching for your classes...</td></tr>';

    try {
        const queries = [];

        // --- QUERY A: DIRECT ENROLLMENT (Priority) ---
        // Checks if 'classStudents' array contains "202500006"
        if (studentCustomId) {
            queries.push(
                window.db.collection('classSessions')
                    .where('classStudents', 'array-contains', studentCustomId)
                    .get()
            );
        }

        // --- QUERY B: SECTION BASED (Fallback) ---
        // Checks if class is assigned to "Grade 10 - Ruby"
        if (user.gradeLevel && user.section) {
            const userSection = `${user.gradeLevel} - ${user.section}`;
            
            queries.push(
                window.db.collection('classSessions').where('section', '==', userSection).get()
            );

            if (sectionStr && sectionStr !== userSection) {
                 queries.push(
                    window.db.collection('classSessions').where('section', '==', sectionStr).get()
                );
            }
        }

        // --- EXECUTE & MERGE ---
        const snapshots = await Promise.all(queries);
        const scheduleMap = new Map();

        snapshots.forEach(snap => {
            snap.forEach(doc => {
                // Prevent duplicates
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
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#666;">No classes found.</td></tr>';
            return;
        }

        const schedules = Array.from(scheduleMap.values());
        
        // Sort by Time
        schedules.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

        tbody.innerHTML = '';
        schedules.forEach(s => {
            const teacherDisplay = s.teacherName || s.teacher || 'TBA';
            const row = `
                <tr>
                    <td><strong>${s.subject}</strong></td>
                    <td>${teacherDisplay}</td>
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