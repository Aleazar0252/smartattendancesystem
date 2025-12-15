/**
 * dashboard.js (Teacher) - UPDATED
 * Features:
 * 1. Counts students from both 'classStudents' (New) and 'Sections' (Old).
 * 2. Calculates the actual "Next Class" based on Day/Time.
 * 3. Generates charts from individual 'attendance' docs (same source as Students).
 */

document.addEventListener('DOMContentLoaded', () => {
    if (window.sessionManager && window.sessionManager.isLoggedIn()) {
        const user = window.sessionManager.getSession();
        
        if (user.role !== 'teacher') {
            window.location.href = '../index.html'; 
            return;
        }

        // Display Name
        document.getElementById('header-user-name').innerText = user.name || user.firstName || "Teacher";
        
        // Load Data
        loadDashboardStats(user);
        loadAttendanceCharts(user);
    } else {
        window.location.href = '../index.html';
    }
});

async function loadDashboardStats(user) {
    const db = window.db;
    try {
        // --- 1. GET ALL TEACHER'S CLASSES ---
        // Fetch sessions where this user is the teacher
        const [snap1, snap2] = await Promise.all([
            db.collection('classSessions').where('teacherName', '==', user.name).get(),
            db.collection('classSessions').where('teacher', '==', user.name).get()
        ]);

        const classesMap = new Map(); // Use Map to avoid duplicates
        const uniqueSections = new Set();
        const studentIds = new Set(); // To count unique students

        const processClass = (doc) => {
            if (classesMap.has(doc.id)) return;
            const data = doc.data();
            classesMap.set(doc.id, { id: doc.id, ...data });

            // A. Count Direct Enrollments (New Way)
            if (data.classStudents && Array.isArray(data.classStudents)) {
                data.classStudents.forEach(uid => studentIds.add(uid));
            }

            // B. Collect Section Names (Old Way)
            if (data.section) {
                uniqueSections.add(data.section);
            }
        };

        snap1.forEach(processClass);
        snap2.forEach(processClass);

        const allSessions = Array.from(classesMap.values());

        // Update "My Classes" Count
        document.getElementById('dash-class-count').innerText = allSessions.length;

        // --- 2. CALCULATE "NEXT CLASS" ---
        updateNextClassDisplay(allSessions);

        // --- 3. COMPLETE STUDENT COUNT (Legacy Support) ---
        // We already have IDs from Direct Enrollment. 
        // Now fetch IDs from the Sections we collected (if any).
        if (uniqueSections.size > 0) {
            const sectionsArray = Array.from(uniqueSections);
            // Fetch students belonging to these sections
            const studentQueries = sectionsArray.map(sec => 
                db.collection('users')
                    .where('role', '==', 'student')
                    .where('section', '==', sec)
                    .get()
            );

            const sectionSnaps = await Promise.all(studentQueries);
            sectionSnaps.forEach(snap => {
                snap.forEach(doc => studentIds.add(doc.id));
            });
        }

        // Update "Total Students" Count
        document.getElementById('dash-student-count').innerText = studentIds.size;

    } catch (e) {
        console.error("Dashboard Stats Error:", e);
    }
}

function updateNextClassDisplay(sessions) {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[now.getDay()];
    
    // Convert current time to minutes for comparison (e.g., 10:30 AM = 630 mins)
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Filter classes happening TODAY
    const todaysClasses = sessions.filter(s => {
        if (!s.days) return false;
        // Check if day matches (e.g., "Monday" or "M,W,F")
        return s.days.includes(currentDay) || s.days.includes('Daily');
    });

    // Sort by Start Time
    todaysClasses.sort((a, b) => {
        return getMinutes(a.startTime) - getMinutes(b.startTime);
    });

    // Find the first class that hasn't ended yet
    const nextClass = todaysClasses.find(s => {
        const endMinutes = getMinutes(s.endTime);
        return endMinutes > currentMinutes; 
    });

    const el = document.getElementById('dash-next-class');
    if (nextClass) {
        const startMinutes = getMinutes(nextClass.startTime);
        const diff = startMinutes - currentMinutes;
        
        if (diff <= 0) {
            // Class is currently ongoing
            el.innerHTML = `<span style="color:#28a745">Now: ${nextClass.subject}</span>`;
        } else {
            // Class is upcoming
            el.innerHTML = `<span>${formatTime(nextClass.startTime)}: ${nextClass.subject}</span>`;
            el.style.color = "#007bff";
        }
    } else {
        el.innerText = "Done for today";
        el.style.color = "#666";
    }
}

// Helper: "13:30" -> 810 minutes
function getMinutes(timeStr) {
    if(!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

// Helper: "13:00" -> "1:00 PM"
function formatTime(timeStr) {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
}

// --- CHART LOADING LOGIC (Using Individual Docs) ---
async function loadAttendanceCharts(user) {
    const db = window.db;
    
    try {
        // Query the 'attendance' collection (Individual records)
        // This matches what the students see.
        const snapshot = await db.collection('attendance')
            .where('teacherName', '==', user.name)
            .get();

        let totalPresent = 0;
        let totalLate = 0;
        let totalAbsent = 0;

        // Grouping for Bar Chart: { "Math (Oct 10)": {P: 5, A: 2}, ... }
        const timelineData = {}; 

        snapshot.forEach(doc => {
            const data = doc.data();
            const status = (data.status || 'P').toUpperCase();
            
            // 1. Global Totals
            if (['P', 'PRESENT'].includes(status)) totalPresent++;
            else if (['L', 'LATE'].includes(status)) totalLate++;
            else if (['A', 'ABSENT'].includes(status)) totalAbsent++;

            // 2. Timeline Grouping
            // We group by "Subject + Date" to show bars for specific class sessions
            const dateStr = data.attendanceTime ? new Date(data.attendanceTime).toLocaleDateString('en-US', {month:'short', day:'numeric'}) : 'N/A';
            const key = `${data.subject} (${dateStr})`;

            if (!timelineData[key]) {
                timelineData[key] = { P: 0, A: 0 };
            }

            if (['P', 'PRESENT', 'L', 'LATE'].includes(status)) {
                timelineData[key].P++;
            } else {
                timelineData[key].A++;
            }
        });

        // --- RENDER PIE CHART ---
        const ctxPie = document.getElementById('attendancePieChart').getContext('2d');
        
        // Prevent empty chart glitch
        if (totalPresent + totalLate + totalAbsent === 0) totalPresent = 1; 

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

        // --- RENDER BAR CHART ---
        // Get last 5 sessions (Keys)
        const labels = Object.keys(timelineData).slice(-5); 
        const dataPresent = labels.map(k => timelineData[k].P);
        const dataAbsent = labels.map(k => timelineData[k].A);

        const ctxBar = document.getElementById('attendanceBarChart').getContext('2d');
        new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Present', data: dataPresent, backgroundColor: '#28a745', borderRadius: 4 },
                    { label: 'Absent', data: dataAbsent, backgroundColor: '#dc3545', borderRadius: 4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { 
                    y: { beginAtZero: true, ticks: { precision: 0 } }, 
                    x: { ticks: { font: { size: 10 } } } 
                },
                plugins: { legend: { position: 'bottom' } }
            }
        });

    } catch (e) {
        console.error("Chart Error:", e);
    }
}