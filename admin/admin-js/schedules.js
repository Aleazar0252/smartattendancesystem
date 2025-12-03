/**
 * schedules.js
 * Manages Class Schedules
 * Fix: Prevents duplicate dropdown items by clearing lists after fetching data.
 */

let allSchedules = [];
window.teacherNameToIdMap = {}; 

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.db) {
            console.log("Database connected.");
            loadSchedulesFromDB();
            // We only load dropdowns here. We won't reload them in openModal to prevent lag/dupes
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

function formatTime(timeStr) {
    if (!timeStr) return "";
    const [hour, minute] = timeStr.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minute} ${ampm}`;
}

// --- 1. POPULATE DROPDOWNS (FIXED) ---
async function populateDropdowns() {
    const listSection = document.getElementById('list-section');
    const listSubject = document.getElementById('list-subject');
    const listTeacher = document.getElementById('list-teacher');

    try {
        // Fetch all data FIRST
        const [secSnap, subSnap, teachSnap] = await Promise.all([
            window.db.collection('sections').orderBy('gradeLevel').get(),
            window.db.collection('subjects').orderBy('subjectName').get(),
            window.db.collection('users').where('role', '==', 'teacher').get()
        ]);

        // Clear Lists NOW (Just before adding new ones to prevent duplication)
        listSection.innerHTML = '';
        listSubject.innerHTML = '';
        listTeacher.innerHTML = '';

        // A. SECTIONS
        secSnap.forEach(doc => {
            const s = doc.data();
            const option = document.createElement('option');
            option.value = `${s.gradeLevel} - ${s.sectionName}`;
            listSection.appendChild(option);
        });

        // B. SUBJECTS
        subSnap.forEach(doc => {
            const s = doc.data();
            const option = document.createElement('option');
            option.value = s.subjectName;
            listSubject.appendChild(option);
        });

        // C. TEACHERS
        window.teacherNameToIdMap = {}; 
        teachSnap.forEach(doc => {
            const t = doc.data();
            const fullName = `${t.firstName} ${t.lastName}`;
            window.teacherNameToIdMap[fullName] = t.userId;

            const option = document.createElement('option');
            option.value = fullName;
            listTeacher.appendChild(option);
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
        const teacherName = s.teacherName || "Unknown Teacher";

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${s.section || 'N/A'}</strong></td>
            <td>${s.subject || 'N/A'}</td>
            <td>${teacherName}</td>
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

// --- 3. FILTER FUNCTION ---
function filterSchedules() {
    const gradeFilter = document.getElementById('filter-grade').value;
    const searchInput = document.getElementById('search-input').value.toLowerCase();

    const filtered = allSchedules.filter(s => {
        const sectionName = s.section || "";
        const matchesGrade = (gradeFilter === 'All') || sectionName.startsWith(gradeFilter);
        const teacherName = (s.teacherName || "").toLowerCase();

        const matchesSearch =
            (s.section && s.section.toLowerCase().includes(searchInput)) ||
            (s.subject && s.subject.toLowerCase().includes(searchInput)) ||
            teacherName.includes(searchInput);

        return matchesGrade && matchesSearch;
    });

    renderTable(filtered);
}

// --- 4. SAVE SCHEDULE ---
async function saveSchedule() {
    const section = document.getElementById('sel-section').value;
    const subject = document.getElementById('sel-subject').value;
    const teacherName = document.getElementById('sel-teacher').value;
    const start = document.getElementById('sched-start').value;
    const end = document.getElementById('sched-end').value;

    if (!section || !subject || !teacherName || !start || !end) {
        alert("Please fill in all fields.");
        return;
    }

    const teacherId = window.teacherNameToIdMap[teacherName];
    if (!teacherId) {
        alert("Please select a valid teacher from the list.");
        return;
    }

    const btn = document.querySelector('#schedule-modal .btn-primary');
    const originalText = btn.innerText;
    btn.innerText = "Checking...";
    btn.disabled = true;

    try {
        // DUPLICATE CHECK
        const duplicateCheck = await window.db.collection('classSessions')
            .where('section', '==', section)
            .where('subject', '==', subject)
            .where('startTime', '==', start)
            .get();

        if (!duplicateCheck.empty) {
            alert("Error: A schedule for this Subject and Section at this Time already exists!");
            btn.innerText = originalText;
            btn.disabled = false;
            return;
        }

        // SAVE
        btn.innerText = "Saving...";
        
        await window.db.collection('classSessions').add({
            section,
            subject,
            teacherId,
            teacherName,
            days: "Daily",
            startTime: start,
            endTime: end,
            createdAt: new Date()
        });
        
        alert("Schedule Added Successfully!");
        closeModal('schedule-modal');
        document.getElementById('schedule-form').reset();
        
        // Clear inputs manually
        document.getElementById('sel-section').value = "";
        document.getElementById('sel-subject').value = "";
        document.getElementById('sel-teacher').value = "";
        
        loadSchedulesFromDB();

    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// --- 5. DELETE SCHEDULE ---
function deleteSchedule(docId) {
    if (confirm("Are you sure you want to delete this schedule?")) {
        window.db.collection('classSessions').doc(docId).delete()
            .then(() => loadSchedulesFromDB())
            .catch(err => alert("Error: " + err.message));
    }
}

// --- UI HELPERS ---
function openScheduleModal() {
    document.getElementById('schedule-form').reset();
    document.getElementById('sel-section').value = "";
    document.getElementById('sel-subject').value = "";
    document.getElementById('sel-teacher').value = "";
    document.getElementById('modal-title').innerText = "Add Class Schedule";
    document.getElementById('schedule-modal').style.display = 'block';
    
    // NOTE: Removed populateDropdowns() call here to prevent duplication.
    // The list is loaded once on page load.
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

window.filterSchedules = filterSchedules;
window.openScheduleModal = openScheduleModal;
window.saveSchedule = saveSchedule;
window.deleteSchedule = deleteSchedule;
window.toggleActionMenu = toggleActionMenu;
window.closeModal = closeModal;