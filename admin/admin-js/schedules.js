/**
 * schedules.js
 * Manages Class Schedules
 * Logic: Days fixed to Daily, Room Removed, Grade Filtering Added.
 */

let allSchedules = []; 

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.db) {
            console.log("Database connected.");
            loadSchedulesFromDB();
            populateDropdowns();
        } else {
            console.error("Firebase DB not initialized.");
        }
    }, 500);

    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = "none";
        }
        if (!event.target.closest('.action-menu-container')) {
            const dropdowns = document.getElementsByClassName("action-dropdown");
            for (let i = 0; i < dropdowns.length; i++) {
                dropdowns[i].classList.remove('show');
            }
        }
    }
});

// --- HELPER: Format Time ---
function formatTime(timeStr) {
    if (!timeStr) return "";
    const [hour, minute] = timeStr.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minute} ${ampm}`;
}

// --- 1. POPULATE DROPDOWNS ---
async function populateDropdowns() {
    const sectionSelect = document.getElementById('sel-section');
    const subjectSelect = document.getElementById('sel-subject');
    const teacherSelect = document.getElementById('sel-teacher');

    try {
        const secSnap = await window.db.collection('sections').orderBy('gradeLevel').get();
        sectionSelect.innerHTML = '<option value="">Select Section</option>';
        secSnap.forEach(doc => {
            const s = doc.data();
            sectionSelect.innerHTML += `<option value="${s.gradeLevel} - ${s.sectionName}">${s.gradeLevel} - ${s.sectionName}</option>`;
        });

        const subSnap = await window.db.collection('subjects').orderBy('subjectName').get();
        subjectSelect.innerHTML = '<option value="">Select Subject</option>';
        subSnap.forEach(doc => {
            const s = doc.data();
            subjectSelect.innerHTML += `<option value="${s.subjectName}">${s.subjectName}</option>`;
        });

        const teachSnap = await window.db.collection('users').where('role', '==', 'teacher').get();
        teacherSelect.innerHTML = '<option value="">Select Teacher</option>';
        teachSnap.forEach(doc => {
            const t = doc.data();
            const fullName = `${t.firstName} ${t.lastName}`;
            teacherSelect.innerHTML += `<option value="${fullName}">${fullName}</option>`;
        });

    } catch (error) {
        console.error("Error populating dropdowns:", error);
    }
}

// --- 2. LOAD SCHEDULES TABLE ---
function loadSchedulesFromDB() {
    const tableBody = document.getElementById('schedules-list-body');
    
    window.db.collection('classSessions').orderBy('section').get()
        .then((querySnapshot) => {
            allSchedules = [];
            tableBody.innerHTML = '';

            if (querySnapshot.empty) {
                renderTable([]); 
                return;
            }

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                allSchedules.push({ docId: doc.id, ...data });
            });
            renderTable(allSchedules);
        })
        .catch((error) => {
            console.error("Error:", error);
            tableBody.innerHTML = `<tr><td colspan="5" style="color:red; text-align:center;">Error: ${error.message}</td></tr>`;
        });
}

// --- RENDER TABLE ---
function renderTable(data) {
    const tableBody = document.getElementById('schedules-list-body');
    tableBody.innerHTML = '';

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No schedules found.</td></tr>';
        return;
    }

    data.forEach(s => {
        const startDisplay = formatTime(s.startTime);
        const endDisplay = formatTime(s.endTime);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${s.section || 'N/A'}</strong></td>
            <td>${s.subject || 'N/A'}</td>
            <td>${s.teacher || 'N/A'}</td>
            <td>
                <span class="badge-success" style="background:#e3f2fd; color:#0d47a1; border:none;">${s.days || 'Daily'}</span><br>
                <small style="color:#666;">${startDisplay} - ${endDisplay}</small>
            </td>
            <td style="text-align: right;">
                <div class="action-menu-container">
                    <button class="btn-icon" onclick="toggleActionMenu('menu-${s.docId}')">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div id="menu-${s.docId}" class="action-dropdown">
                        <div onclick="deleteSchedule('${s.docId}')">
                            <i class="fas fa-trash" style="color:#dc3545"></i> Delete
                        </div>
                    </div>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// --- 3. DUAL FILTER FUNCTION (Grade + Search Text) ---
function filterSchedules() {
    const gradeFilter = document.getElementById('filter-grade').value; // "All", "Grade 7", etc.
    const searchInput = document.getElementById('search-input').value.toLowerCase();
    
    const filtered = allSchedules.filter(s => {
        // 1. Filter by Grade (matches the Section Name)
        // Since section name is "Grade 7 - Rizal", we check if it starts with the filter
        const sectionName = s.section || "";
        const matchesGrade = (gradeFilter === 'All') || sectionName.startsWith(gradeFilter);

        // 2. Filter by Text Search (Teacher, Subject, or Section)
        const matchesSearch = 
            (s.section && s.section.toLowerCase().includes(searchInput)) ||
            (s.subject && s.subject.toLowerCase().includes(searchInput)) ||
            (s.teacher && s.teacher.toLowerCase().includes(searchInput));
        
        return matchesGrade && matchesSearch;
    });
    
    renderTable(filtered);
}

// --- 4. SAVE SCHEDULE ---
function saveSchedule() {
    const section = document.getElementById('sel-section').value;
    const subject = document.getElementById('sel-subject').value;
    const teacher = document.getElementById('sel-teacher').value;
    const start = document.getElementById('sched-start').value;
    const end = document.getElementById('sched-end').value;

    if(!section || !subject || !teacher || !start || !end) {
        alert("Please select Section, Subject, Teacher, and Time.");
        return;
    }

    const btn = document.querySelector('#schedule-modal .btn-primary');
    const originalText = btn.innerText;
    btn.innerText = "Saving...";
    btn.disabled = true;

    const scheduleData = {
        section: section,
        subject: subject,
        teacher: teacher,
        days: "Daily",
        startTime: start, 
        endTime: end,     
        createdAt: new Date()
    };

    window.db.collection('classSessions').add(scheduleData)
        .then(() => {
            alert("Schedule Added!");
            closeModal('schedule-modal');
            document.getElementById('schedule-form').reset();
            loadSchedulesFromDB();
        })
        .catch(err => alert("Error: " + err.message))
        .finally(() => {
            btn.innerText = originalText;
            btn.disabled = false;
        });
}

// --- 5. DELETE SCHEDULE ---
function deleteSchedule(docId) {
    if(confirm("Are you sure you want to delete this schedule?")) {
        window.db.collection('classSessions').doc(docId).delete()
            .then(() => loadSchedulesFromDB())
            .catch(err => alert("Error: " + err.message));
    }
}

// --- UI HELPERS ---
function openScheduleModal() {
    document.getElementById('schedule-form').reset();
    document.getElementById('modal-title').innerText = "Add Class Schedule";
    document.getElementById('schedule-modal').style.display = 'block';
}

function toggleActionMenu(menuId) {
    const dropdowns = document.getElementsByClassName("action-dropdown");
    for (let i = 0; i < dropdowns.length; i++) {
        if (dropdowns[i].id !== menuId) dropdowns[i].classList.remove('show');
    }
    document.getElementById(menuId).classList.toggle('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Global Export
window.filterSchedules = filterSchedules;
window.openScheduleModal = openScheduleModal;
window.saveSchedule = saveSchedule;
window.deleteSchedule = deleteSchedule;
window.toggleActionMenu = toggleActionMenu;
window.closeModal = closeModal;