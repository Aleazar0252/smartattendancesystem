/**
 * dashboard.js
 * Teacher Dashboard Logic with Charts
 */

document.addEventListener('DOMContentLoaded', () => {
    if (window.sessionManager && window.sessionManager.isLoggedIn()) {
        const user = window.sessionManager.getSession();
        
        if (user.role !== 'teacher') {
            window.location.href = '../index.html'; 
            return;
        }

        document.getElementById('header-user-name').innerText = user.name;
        
        loadDashboardStats(user);
        loadAttendanceCharts(user); // Load Charts
    } else {
        window.location.href = '../index.html';
    }
});

async function loadDashboardStats(user) {
    const db = window.db;
    try {
        // 1. COUNT CLASSES
        const [snap1, snap2] = await Promise.all([
            db.collection('classSessions').where('teacherName', '==', user.name).get(),
            db.collection('classSessions').where('teacher', '==', user.name).get()
        ]);

        const uniqueClasses = new Set();
        snap1.forEach(doc => uniqueClasses.add(doc.id));
        snap2.forEach(doc => uniqueClasses.add(doc.id));

        document.getElementById('dash-class-count').innerText = uniqueClasses.size;

        // 2. COUNT STUDENTS
        const studentSnap = await db.collection('users').where('role', '==', 'student').get();
        document.getElementById('dash-student-count').innerText = studentSnap.size;

        // 3. NEXT CLASS STATUS
        if(uniqueClasses.size > 0) {
            document.getElementById('dash-next-class').innerText = "Active";
            document.getElementById('dash-next-class').style.color = "#28a745";
        } else {
            document.getElementById('dash-next-class').innerText = "No Classes";
            document.getElementById('dash-next-class').style.color = "#666";
        }

    } catch (e) {
        console.error("Dashboard Error:", e);
    }
}

// --- CHART LOADING LOGIC ---
async function loadAttendanceCharts(user) {
    const db = window.db;
    
    try {
        // Fetch Attendance Records for this Teacher
        // Note: Assuming 'attendance_records' has 'teacherName' field
        const snapshot = await db.collection('attendance_records')
            .where('teacherName', '==', user.name)
            .get();

        let totalPresent = 0;
        let totalLate = 0;
        let totalAbsent = 0;

        // Arrays for Bar Chart
        let labels = [];
        let dataPresent = [];
        let dataAbsent = [];

        // Process Data
        // We only take the last 5 records for the Bar Chart to keep it clean
        let records = [];
        snapshot.forEach(doc => records.push(doc.data()));
        
        // Sort by Date (assuming 'date' field is YYYY-MM-DD string or Timestamp)
        records.sort((a, b) => new Date(a.date) - new Date(b.date));

        records.forEach(rec => {
            // Count totals for this specific record
            let p = 0, l = 0, a = 0;
            
            if(rec.students && Array.isArray(rec.students)) {
                rec.students.forEach(s => {
                    if(s.status === 'Present') p++;
                    else if(s.status === 'Late') l++;
                    else if(s.status === 'Absent') a++;
                });
            }

            // Add to Global Totals (Pie Chart)
            totalPresent += p;
            totalLate += l;
            totalAbsent += a;

            // Add to Bar Chart Data (only keep last 5)
            // Label format: "Section (Date)"
            const shortDate = new Date(rec.date).toLocaleDateString('en-US', {month:'short', day:'numeric'});
            labels.push(`${rec.section} (${shortDate})`);
            dataPresent.push(p + l); // Group Late with Present for simplicity in Bar
            dataAbsent.push(a);
        });

        // Limit Bar Chart to last 5 entries
        if (labels.length > 5) {
            labels = labels.slice(-5);
            dataPresent = dataPresent.slice(-5);
            dataAbsent = dataAbsent.slice(-5);
        }

        // --- RENDER PIE CHART ---
        const ctxPie = document.getElementById('attendancePieChart').getContext('2d');
        
        if (totalPresent + totalLate + totalAbsent === 0) {
            // Show placeholder if no data
            totalPresent = 1; // Just to show a gray circle
        }

        new Chart(ctxPie, {
            type: 'doughnut',
            data: {
                labels: ['Present', 'Late', 'Absent'],
                datasets: [{
                    data: [totalPresent, totalLate, totalAbsent],
                    backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });

        // --- RENDER BAR CHART ---
        const ctxBar = document.getElementById('attendanceBarChart').getContext('2d');
        new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Present/Late',
                        data: dataPresent,
                        backgroundColor: '#28a745',
                        borderRadius: 4
                    },
                    {
                        label: 'Absent',
                        data: dataAbsent,
                        backgroundColor: '#dc3545',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } },
                    x: { ticks: { font: { size: 10 } } }
                },
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });

    } catch (e) {
        console.error("Chart Error:", e);
    }
}