/**
 * dashboard.js
 * Teacher Dashboard Logic with Charts
 * FIX: Counts actual students belonging to the teacher's sections
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
        loadAttendanceCharts(user);
    } else {
        window.location.href = '../index.html';
    }
});

async function loadDashboardStats(user) {
    const db = window.db;
    try {
        // --- 1. GET TEACHER'S SECTIONS ---
        // We need to know which sections this teacher handles first
        const [snap1, snap2] = await Promise.all([
            db.collection('classSessions').where('teacherName', '==', user.name).get(),
            db.collection('classSessions').where('teacher', '==', user.name).get()
        ]);

        const uniqueSections = new Set();
        const uniqueClasses = new Set(); // For the "My Classes" count

        const processDoc = (doc) => {
            const data = doc.data();
            uniqueClasses.add(doc.id); // Count schedule entries
            if(data.section) uniqueSections.add(data.section); // Store "Grade 7 - Rizal"
        };

        snap1.forEach(processDoc);
        snap2.forEach(processDoc);

        // Update "My Classes" Count
        document.getElementById('dash-class-count').innerText = uniqueClasses.size;

        // --- 2. COUNT STUDENTS IN THOSE SECTIONS ---
        if (uniqueSections.size === 0) {
            document.getElementById('dash-student-count').innerText = "0";
        } else {
            const sectionsArray = Array.from(uniqueSections);
            
            // We fetch students for each section the teacher handles
            // We use Promise.all to run these queries in parallel for speed
            const studentQueries = sectionsArray.map(sectionName => 
                db.collection('users')
                    .where('role', '==', 'student')
                    .where('section', '==', sectionName)
                    .get()
            );

            const studentSnaps = await Promise.all(studentQueries);
            
            let totalStudents = 0;
            studentSnaps.forEach(snap => {
                totalStudents += snap.size;
            });

            document.getElementById('dash-student-count').innerText = totalStudents;
        }

        // --- 3. NEXT CLASS STATUS ---
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
        const snapshot = await db.collection('attendance_records')
            .where('teacherName', '==', user.name)
            .get();

        let totalPresent = 0;
        let totalLate = 0;
        let totalAbsent = 0;

        let labels = [];
        let dataPresent = [];
        let dataAbsent = [];

        let records = [];
        snapshot.forEach(doc => records.push(doc.data()));
        
        records.sort((a, b) => new Date(a.date) - new Date(b.date));

        records.forEach(rec => {
            let p = 0, l = 0, a = 0;
            
            if(rec.students && Array.isArray(rec.students)) {
                rec.students.forEach(s => {
                    if(s.status === 'Present') p++;
                    else if(s.status === 'Late') l++;
                    else if(s.status === 'Absent') a++;
                });
            }

            totalPresent += p;
            totalLate += l;
            totalAbsent += a;

            const shortDate = new Date(rec.date).toLocaleDateString('en-US', {month:'short', day:'numeric'});
            labels.push(`${rec.section} (${shortDate})`);
            dataPresent.push(p + l);
            dataAbsent.push(a);
        });

        if (labels.length > 5) {
            labels = labels.slice(-5);
            dataPresent = dataPresent.slice(-5);
            dataAbsent = dataAbsent.slice(-5);
        }

        const ctxPie = document.getElementById('attendancePieChart').getContext('2d');
        
        if (totalPresent + totalLate + totalAbsent === 0) {
            totalPresent = 1; 
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
                plugins: { legend: { position: 'bottom' } }
            }
        });

        const ctxBar = document.getElementById('attendanceBarChart').getContext('2d');
        new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Present/Late', data: dataPresent, backgroundColor: '#28a745', borderRadius: 4 },
                    { label: 'Absent', data: dataAbsent, backgroundColor: '#dc3545', borderRadius: 4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { ticks: { font: { size: 10 } } } },
                plugins: { legend: { position: 'bottom' } }
            }
        });

    } catch (e) {
        console.error("Chart Error:", e);
    }
}