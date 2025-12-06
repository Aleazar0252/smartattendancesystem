/**
 * attendance.js (Student) - DEBUG VERSION
 * Shows specific error messages to help debugging.
 */

let allAttendanceRecords = [];

document.addEventListener('DOMContentLoaded', () => {
    if (window.sessionManager && window.sessionManager.isLoggedIn()) {
        const user = window.sessionManager.getSession();
        document.getElementById('header-user-name').innerText = user.name;
        
        // Try all possible ID fields
        const searchId = user.userId || user.studentId || user.id || user.uid;
        
        if (!searchId) {
            alert("Error: Could not find your Student ID in the session. Please logout and login again.");
            return;
        }

        console.log("Searching attendance for ID:", searchId);
        loadStudentAttendance(searchId);
    } else {
        window.location.href = '../index.html';
    }
});

async function loadStudentAttendance(studentId) {
    const tbody = document.getElementById('attendance-list-body');
    tbody.innerHTML = '<tr><td colspan="4" class="loading-cell">Checking records...</td></tr>';
    
    try {
        // 1. Query the 'attendance' collection
        const snapshot = await window.db.collection('attendance')
            .where('studentId', '==', studentId)
            .get();

        if (snapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No records found for ID: <strong>${studentId}</strong></td></tr>`;
            updateStats({ present: 0, late: 0, absent: 0, total: 0 });
            return;
        }

        let myRecords = [];
        let stats = { present: 0, late: 0, absent: 0, total: 0 };

        snapshot.forEach(doc => {
            const data = doc.data();
            
            myRecords.push({
                date: data.attendanceTime, 
                subject: data.subject,
                status: data.status,
                remarks: data.remarks || '-' 
            });

            stats.total++;
            if (data.status === 'Present') stats.present++;
            else if (data.status === 'Late') stats.late++;
            else if (data.status === 'Absent') stats.absent++;
        });

        updateStats(stats);
        allAttendanceRecords = myRecords;
        renderAttendanceTable(myRecords);

    } catch (e) {
        console.error("Attendance Load Error:", e);
        // CRITICAL: This will show the ACTUAL error on your screen
        tbody.innerHTML = `<tr><td colspan="4" style="color:red; text-align:center;"><strong>Error:</strong> ${e.message}</td></tr>`;
    }
}

function updateStats(stats) {
    document.getElementById('stat-present').innerText = stats.present;
    document.getElementById('stat-late').innerText = stats.late;
    document.getElementById('stat-absent').innerText = stats.absent;
    
    let rate = 0;
    if(stats.total > 0) {
        rate = ((stats.present + stats.late) / stats.total) * 100;
    }
    document.getElementById('stat-rate').innerText = Math.round(rate) + "%";
}

function renderAttendanceTable(records) {
    const tbody = document.getElementById('attendance-list-body');
    tbody.innerHTML = '';

    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No records found.</td></tr>';
        return;
    }

    records.sort((a, b) => new Date(b.date) - new Date(a.date));

    records.forEach(r => {
        let badgeStyle = '';
        if (r.status === 'Late') badgeStyle = 'background:#fff3cd; color:#856404;'; 
        else if (r.status === 'Absent') badgeStyle = 'background:#f8d7da; color:#721c24;'; 
        else badgeStyle = 'background:#d4edda; color:#155724;'; 

        const dateObj = new Date(r.date);
        const dateDisplay = isNaN(dateObj) ? r.date : dateObj.toLocaleDateString('en-US', {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
        });

        const row = `
            <tr>
                <td>${dateDisplay}</td>
                <td><strong>${r.subject}</strong></td>
                <td><span class="badge-success" style="${badgeStyle} border:none; padding: 5px 10px; border-radius: 15px; font-size: 0.85rem;">${r.status}</span></td>
                <td style="color:#666; font-size:0.9rem;">${r.remarks}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

window.filterAttendance = function() {
    const filter = document.getElementById('month-filter').value;
    if (filter === 'all') {
        renderAttendanceTable(allAttendanceRecords);
    } else if (filter === 'this_month') {
        const now = new Date();
        const filtered = allAttendanceRecords.filter(r => {
            const rDate = new Date(r.date);
            return rDate.getMonth() === now.getMonth() && rDate.getFullYear() === now.getFullYear();
        });
        renderAttendanceTable(filtered);
    }
};