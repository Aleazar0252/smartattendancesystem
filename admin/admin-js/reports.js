/**
 * reports.js
 * Aggregates data from Firestore and renders Charts
 */

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.db) {
            console.log("Database connected. Generating reports...");
            generateReports();
        } else {
            console.error("Firebase DB not initialized.");
        }
    }, 500);
});

async function generateReports() {
    try {
        const db = window.db;

        // 1. FETCH ALL COLLECTIONS
        const usersSnap = await db.collection('users').get();
        const sectionsSnap = await db.collection('sections').get();
        const subjectsSnap = await db.collection('subjects').get();

        // 2. PROCESS COUNTS
        let teacherCount = 0;
        let guidanceCount = 0;
        let adminCount = 0; // If you have admins saved

        usersSnap.forEach(doc => {
            const data = doc.data();
            if (data.role === 'teacher') teacherCount++;
            else if (data.role === 'guidance') guidanceCount++;
            else if (data.role === 'admin') adminCount++;
        });

        const sectionsCount = sectionsSnap.size;
        const subjectsCount = subjectsSnap.size;

        // 3. UPDATE DOM COUNTERS
        animateValue("count-teachers", 0, teacherCount, 1000);
        animateValue("count-guidance", 0, guidanceCount, 1000);
        animateValue("count-sections", 0, sectionsCount, 1000);
        animateValue("count-subjects", 0, subjectsCount, 1000);

        // 4. PROCESS SECTION DATA FOR BAR CHART
        const gradeCounts = {
            "Grade 7": 0, "Grade 8": 0, "Grade 9": 0, 
            "Grade 10": 0, "Grade 11": 0, "Grade 12": 0
        };
        
        let recentSections = [];

        sectionsSnap.forEach(doc => {
            const data = doc.data();
            // Count Grades
            if (gradeCounts[data.gradeLevel] !== undefined) {
                gradeCounts[data.gradeLevel]++;
            }
            // Collect Recent
            recentSections.push(data);
        });

        // 5. RENDER CHARTS
        renderGradeChart(gradeCounts);
        renderStaffChart(teacherCount, guidanceCount);

        // 6. RENDER RECENT TABLE (Last 5 sections)
        renderRecentTable(recentSections);

    } catch (error) {
        console.error("Error generating reports:", error);
    }
}

// --- CHART 1: BAR CHART (Sections per Grade) ---
function renderGradeChart(dataObj) {
    const ctx = document.getElementById('gradeLevelChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(dataObj),
            datasets: [{
                label: 'Number of Sections',
                data: Object.values(dataObj),
                backgroundColor: 'rgba(165, 42, 42, 0.6)', // Primary Color
                borderColor: 'rgba(165, 42, 42, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            }
        }
    });
}

// --- CHART 2: PIE CHART (Staff Dist) ---
function renderStaffChart(teachers, guidance) {
    const ctx = document.getElementById('staffChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Teachers', 'Guidance Staff'],
            datasets: [{
                data: [teachers, guidance],
                backgroundColor: [
                    '#a52a2a', // Primary
                    '#e65100'  // Secondary color
                ],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// --- RECENT TABLE ---
function renderRecentTable(sections) {
    const tbody = document.getElementById('recent-activity-body');
    tbody.innerHTML = '';

    // Sort by createdAt desc (if available), take top 5
    // Note: Assuming createdAt exists, otherwise just takes first 5
    sections.sort((a, b) => {
        const dateA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : new Date(0);
        const dateB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : new Date(0);
        return dateB - dateA;
    });

    const top5 = sections.slice(0, 5);

    if (top5.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center">No data available</td></tr>';
        return;
    }

    top5.forEach(s => {
        let dateStr = "N/A";
        if (s.createdAt) {
            const d = s.createdAt.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
            dateStr = d.toLocaleDateString();
        }

        const row = `<tr>
            <td><span class="badge-success" style="background:#f4f6f9; color:#333;">${s.gradeLevel}</span></td>
            <td><strong>${s.sectionName}</strong></td>
            <td>${dateStr}</td>
        </tr>`;
        tbody.innerHTML += row;
    });
}

// --- ANIMATION HELPER ---
function animateValue(id, start, end, duration) {
    if (start === end) return;
    const range = end - start;
    let current = start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / range));
    const obj = document.getElementById(id);
    
    const timer = setInterval(function() {
        current += increment;
        obj.innerHTML = current;
        if (current == end) {
            clearInterval(timer);
        }
    }, stepTime);
}