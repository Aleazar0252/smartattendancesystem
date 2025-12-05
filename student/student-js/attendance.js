/**
 * attendance.js (Student)
 * Features: View Attendance History, Calculate Stats
 */

let allAttendanceRecords = [];

document.addEventListener('DOMContentLoaded', () => {
    if (window.sessionManager && window.sessionManager.isLoggedIn()) {
        const user = window.sessionManager.getSession();
        document.getElementById('header-user-name').innerText = user.name;
        
        loadStudentAttendance(user);
    } else {
        window.location.href = '../index.html';
    }
});

async function loadStudentAttendance(user) {
    const tbody = document.getElementById('attendance-list-body');
    
    // Construct Section String to match Teacher's save format: "Grade X - SectionName"
    // Assuming user has user.gradeLevel and user.section
    const sectionString = `${user.gradeLevel} - ${user.section}`;

    console.log("Fetching attendance for section:", sectionString);

    try {
        // 1. Get all attendance sheets for this section
        const snapshot = await window.db.collection('attendance_records')
            .where('section', '==', sectionString)
            .get();

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No attendance records found for your section.</td></tr>';
            return;
        }

        let myRecords = [];
        let stats = { present: 0, late: 0, absent: 0, total: 0 };

        snapshot.forEach(doc => {
            const data = doc.data();
            
            // 2. Find MY record inside the 'students' array
            if (data.students && Array.isArray(data.students)) {
                // We match by ID (preferred) or Name
                const myRecord = data.students.find(s => s.id === user.uid || s.id === user.docId);
                
                if (myRecord) {
                    // Save for display
                    myRecords.push({
                        date: data.date,
                        subject: data.subject,
                        status: myRecord.status,
                        remarks: myRecord.remarks || '-'
                    });

                    // Update Stats
                    stats.total++;
                    if(myRecord.status === 'Present') stats.present++;
                    else if(myRecord.status === 'Late') stats.late++;
                    else if(myRecord.status === 'Absent') stats.absent++;
                }
            }
        });

        // 3. Update Stats UI
        document.getElementById('stat-present').innerText = stats.present;
        document.getElementById('stat-late').innerText = stats.late;
        document.getElementById('stat-absent').innerText = stats.absent;
        
        // Calculate Rate: (Present + Late) / Total
        let rate = 0;
        if(stats.total > 0) {
            rate = ((stats.present + stats.late) / stats.total) * 100;
        }
        document.getElementById('stat-rate').innerText = Math.round(rate) + "%";

        // 4. Render Table
        renderAttendanceTable(myRecords);
        
        // Store for filtering later
        allAttendanceRecords = myRecords;

    } catch (e) {
        console.error("Error loading attendance:", e);
        tbody.innerHTML = '<tr><td colspan="4" style="color:red; text-align:center;">Error loading data.</td></tr>';
    }
}

function renderAttendanceTable(records) {
    const tbody = document.getElementById('attendance-list-body');
    tbody.innerHTML = '';

    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No records found for you.</td></tr>';
        return;
    }

    // Sort by Date (Newest First)
    records.sort((a, b) => new Date(b.date) - new Date(a.date));

    records.forEach(r => {
        let badgeClass = 'badge-success';
        let bgStyle = '';
        
        if (r.status === 'Late') {
            bgStyle = 'background:#fff3cd; color:#856404;'; // Yellow
        } else if (r.status === 'Absent') {
            bgStyle = 'background:#f8d7da; color:#721c24;'; // Red
        } else {
            bgStyle = 'background:#d4edda; color:#155724;'; // Green
        }

        const dateDisplay = new Date(r.date).toLocaleDateString('en-US', {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
        });

        const row = `
            <tr>
                <td>${dateDisplay}</td>
                <td><strong>${r.subject}</strong></td>
                <td><span class="badge-success" style="${bgStyle} border:none;">${r.status}</span></td>
                <td style="color:#666; font-size:0.9rem;">${r.remarks}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// Simple Filter (Optional)
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