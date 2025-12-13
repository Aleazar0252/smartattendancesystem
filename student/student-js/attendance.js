/**
 * attendance.js (Student) - FIXED
 * Logic: Fetches attendance records where 'userId' matches the student's Document ID.
 * Aligns with the Teacher Portal's new saving method.
 */

let allAttendanceRecords = [];

document.addEventListener('DOMContentLoaded', () => {
    if (window.sessionManager && window.sessionManager.isLoggedIn()) {
        const user = window.sessionManager.getSession();
        document.getElementById('header-user-name').innerText = user.name || "Student";
        
        // CRITICAL: We use the unique Firestore Document ID (usually stored as 'uid' or 'id' or 'userId' in session)
        // The Teacher Portal saves this specific ID into the 'userId' field of the attendance record.
        const targetUserId = user.userId || user.uid || user.id;

        if (!targetUserId) {
            console.error("No valid User ID found in session.");
            document.getElementById('attendance-list-body').innerHTML = 
                '<tr><td colspan="4" style="color:red; text-align:center;">Error: User Identity missing.</td></tr>';
            return;
        }

        console.log(`Fetching attendance for User ID: ${targetUserId}`);
        loadStudentAttendance(targetUserId);
    } else {
        window.location.href = '../index.html';
    }
});

async function loadStudentAttendance(userId) {
    const tbody = document.getElementById('attendance-list-body');
    tbody.innerHTML = '<tr><td colspan="4" class="loading-cell">Loading your records...</td></tr>';
    
    try {
        // Query: Find all attendance docs where userId matches this student
        const snap = await window.db.collection('attendance')
            .where('userId', '==', userId)
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
            allAttendanceRecords.push({
                docId: doc.id,
                ...d,
                // Ensure we have a valid date string for sorting
                date: d.attendanceTime || '1970-01-01' 
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
        // Even if table is empty, we update stats (to show 0)
        if(data === allAttendanceRecords) updateStats(data);
        return;
    }

    data.forEach(r => {
        // Styling based on status
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

        // Format Date
        const dateObj = new Date(r.date);
        const dateDisplay = isNaN(dateObj.getTime()) ? r.date : dateObj.toLocaleDateString('en-US', {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
        });

        const row = `
            <tr>
                <td>${dateDisplay}</td>
                <td><strong>${r.subject}</strong></td>
                <td><span style="${badgeStyle} padding: 5px 10px; border-radius: 15px; font-size: 0.8rem; font-weight:600;">${statusText}</span></td>
                <td style="color:#666; font-size:0.9rem;">${r.remarks || '-'}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });

    // Only update stats if we are showing ALL records (not just a filtered view)
    // Or you can choose to update stats based on the current view. 
    // Usually dashboard stats show "Total", so we pass the full list if available.
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

    // Update HTML elements (Matching IDs from your attendance.html)
    document.getElementById('stat-present').innerText = p;
    document.getElementById('stat-late').innerText = l;
    document.getElementById('stat-absent').innerText = a;

    // Calculate Rate: (Present + Late) / Total
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
        const thisMonth = now.getMonth(); // 0-11
        const thisYear = now.getFullYear();

        const filtered = allAttendanceRecords.filter(r => {
            const d = new Date(r.date);
            // Check if date is valid and matches month/year
            return !isNaN(d.getTime()) && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        });
        renderAttendanceTable(filtered);
    }
};