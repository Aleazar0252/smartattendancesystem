/**
 * schedules.js
 * Loads class schedules for the logged-in Teacher
 * FIX: Searches BOTH 'teacher' and 'teacherName' fields to find all records.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Check Auth
    if (window.sessionManager && window.sessionManager.isLoggedIn()) {
        const user = window.sessionManager.getSession();
        
        if (user.role !== 'teacher') {
            window.location.href = '../index.html';
            return;
        }

        document.getElementById('header-user-name').innerText = user.name;
        
        // 2. Load Data
        loadMySchedules(user.name);
    } else {
        window.location.href = '../index.html';
    }
});

async function loadMySchedules(teacherName) {
    const tbody = document.getElementById('my-schedules-body');
    
    try {
        console.log("Searching schedules for:", teacherName);

        // --- DUAL QUERY STRATEGY ---
        // We run two queries in parallel to catch inconsistent field names
        const [snapshot1, snapshot2] = await Promise.all([
            window.db.collection('classSessions').where('teacherName', '==', teacherName).get(),
            window.db.collection('classSessions').where('teacher', '==', teacherName).get()
        ]);

        // Use a Map to combine results and prevent duplicates (by Doc ID)
        const schedulesMap = new Map();

        snapshot1.forEach(doc => schedulesMap.set(doc.id, doc.data()));
        snapshot2.forEach(doc => schedulesMap.set(doc.id, doc.data()));

        console.log("Total unique schedules found:", schedulesMap.size);

        // Render Empty State
        if (schedulesMap.size === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">No schedules assigned to <strong>' + teacherName + '</strong>.</td></tr>';
            return;
        }

        // Convert Map to Array
        let schedules = Array.from(schedulesMap.values());

        // SORT: By Start Time
        schedules.sort((a, b) => {
            const timeA = a.startTime || "00:00";
            const timeB = b.startTime || "00:00";
            return timeA.localeCompare(timeB);
        });

        // BUILD HTML (Accumulator method)
        let htmlContent = ''; 
        
        schedules.forEach(s => {
            const timeDisplay = `${formatTime(s.startTime)} - ${formatTime(s.endTime)}`;
            
            htmlContent += `
                <tr>
                    <td><strong>${s.subject}</strong></td>
                    <td>${s.section}</td>
                    <td><span class="badge-success" style="background:#e3f2fd; color:#0d47a1; border:none;">${s.days || 'Daily'}</span></td>
                    <td style="font-weight:500; color:#555;">${timeDisplay}</td>
                </tr>
            `;
        });

        tbody.innerHTML = htmlContent;

    } catch (e) {
        console.error("Error loading schedules:", e);
        tbody.innerHTML = '<tr><td colspan="4" style="color:red; text-align:center;">Error loading data.</td></tr>';
    }
}

// --- HELPER: Convert 24h to 12h ---
function formatTime(timeStr) {
    if (!timeStr) return "";
    const [hour, minute] = timeStr.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minute} ${ampm}`;
}