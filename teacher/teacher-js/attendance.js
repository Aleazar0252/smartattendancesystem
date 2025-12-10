/**
 * attendance.js (Student) - ROBUST DUAL-QUERY FIX
 * Fix: Queries for attendance records using BOTH 'studentId' and 'userId' 
 * from the session to ensure all records are found.
 */

let allAttendanceRecords = [];

document.addEventListener('DOMContentLoaded', () => {
    if (window.sessionManager && window.sessionManager.isLoggedIn()) {
        const user = window.sessionManager.getSession();
        document.getElementById('header-user-name').innerText = user.name;
        
        // Retrieve both possible IDs from the session
        const id1 = user.studentId;
        const id2 = user.userId;
        
        if (!id1 && !id2) {
            alert("Error: Could not find your Student ID in the session. Please logout and login again.");
            return;
        }

        console.log(`Searching attendance for IDs: ${id1} / ${id2}`);
        loadStudentAttendance(id1, id2);
    } else {
        window.location.href = '../index.html';
    }
});

async function loadStudentAttendance(id1, id2) {
    const tbody = document.getElementById('attendance-list-body');
    tbody.innerHTML = '<tr><td colspan="4" class="loading-cell">Checking records...</td></tr>';
    
    try {
        const promises = [];

        // Query 1: Check for matches against id1 (e.g., studentId)
        if (id1) {
            promises.push(
                window.db.collection('attendance')
                    .where('studentId', '==', id1)
                    .orderBy('attendanceTime', 'desc')
                    .get()
            );
        }

        // Query 2: Check for matches against id2 (e.g., userId), only if it's different
        if (id2 && id2 !== id1) {
            promises.push(
                window.db.collection('attendance')
                    .where('studentId', '==', id2)
                    .orderBy('attendanceTime', 'desc')
                    .get()
            );
        }

        // Run queries in parallel
        const snapshots = await Promise.all(promises);

        // Merge results using a Map to prevent duplicates (by doc ID)
        const recordsMap = new Map();

        snapshots.forEach(snap => {
            snap.forEach(doc => {
                if (!recordsMap.has(doc.id)) {
                    recordsMap.set(doc.id, {
                        docId: doc.id,
                        ...doc.data(),
                        // Normalize date for sorting
                        date: doc.data().attendanceTime 
                    });
                }
            });
        });

        // Convert back to array
        allAttendanceRecords = Array.from(recordsMap.values());

        // Sort by date (descending)
        allAttendanceRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (allAttendanceRecords.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">
                No attendance records found for ID(s): ${id1 || ''} ${id2 && id2 !== id1 ? '/ ' + id2 : ''}
            </td></tr>`;
            updateStats([]);
            return;
        }

        renderAttendanceTable(allAttendanceRecords);

    } catch (e) {
        console.error("Error loading attendance:", e);
        // Sometimes indexes are required for orderBy. If so, try without sorting in query.
        if (e.message.includes("index")) {
            console.warn("Index missing. Retrying without initial sort...");
            loadStudentAttendanceFallback(id1, id2);
        } else {
            tbody.innerHTML = `<tr><td colspan="4" style="color:red; text-align:center;">Error: ${e.message}</td></tr>`;
        }
    }
}

// Fallback if composite index is missing (client-side sort)
async function loadStudentAttendanceFallback(id1, id2) {
    const tbody = document.getElementById('attendance-list-body');
    try {
        const promises = [];
        if (id1) promises.push(window.db.collection('attendance').where('studentId', '==', id1).get());
        if (id2 && id2 !== id1) promises.push(window.db.collection('attendance').where('studentId', '==', id2).get());

        const snapshots = await Promise.all(promises);
        const recordsMap = new Map();

        snapshots.forEach(snap => {
            snap.forEach(doc => {
                if (!recordsMap.has(doc.id)) {
                    recordsMap.set(doc.id, { docId: doc.id, ...doc.data(), date: doc.data().attendanceTime });
                }
            });
        });

        allAttendanceRecords = Array.from(recordsMap.values());
        allAttendanceRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

        renderAttendanceTable(allAttendanceRecords);

    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="4" style="color:red; text-align:center;">Error: ${e.message}</td></tr>`;
    }
}

function renderAttendanceTable(data) {
    const tbody = document.getElementById('attendance-list-body');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No records for this period.</td></tr>';
        return;
    }

    data.forEach(r => {
        let badgeStyle = '';
        // Normalize status checking
        const status = r.status ? r.status.toUpperCase() : 'P';
        let statusText = 'Present';

        if (status === 'L' || status === 'LATE') {
            badgeStyle = 'background:#fff3cd; color:#856404;'; 
            statusText = 'Late';
        } else if (status === 'A' || status === 'ABSENT') {
            badgeStyle = 'background:#f8d7da; color:#721c24;'; 
            statusText = 'Absent';
        } else {
            badgeStyle = 'background:#d4edda; color:#155724;'; 
            statusText = 'Present';
        }

        const dateObj = new Date(r.date);
        const dateDisplay = isNaN(dateObj) ? r.date : dateObj.toLocaleDateString('en-US', {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
        });

        const row = `
            <tr>
                <td>${dateDisplay}</td>
                <td><strong>${r.subject}</strong></td>
                <td><span class="badge-success" style="${badgeStyle} border:none; padding: 5px 10px; border-radius: 15px; font-size: 0.85rem;">${statusText}</span></td>
                <td style="color:#666; font-size:0.9rem;">${r.remarks || '-'}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });

    updateStats(data);
}

function updateStats(data) {
    let p = 0, l = 0, a = 0;
    data.forEach(r => {
        const s = r.status ? r.status.toUpperCase() : 'P';
        if (s === 'P' || s === 'PRESENT') p++;
        else if (s === 'L' || s === 'LATE') l++;
        else if (s === 'A' || s === 'ABSENT') a++;
    });

    document.getElementById('total-present').innerText = p;
    document.getElementById('total-late').innerText = l;
    document.getElementById('total-absent').innerText = a;
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
            return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        });
        renderAttendanceTable(filtered);
    }
};