/**
 * attendance.js
 * Teacher Attendance: Grid View -> Daily Sheet
 */

let currentSection = "";
let currentSubject = "";
let loadedStudents = []; // Stores student data locally

document.addEventListener('DOMContentLoaded', () => {
    if (window.sessionManager && window.sessionManager.isLoggedIn()) {
        const user = window.sessionManager.getSession();
        document.getElementById('header-user-name').innerText = user.name;
        
        // 1. Load Classes
        loadTeacherClasses(user.name);
        
        // 2. Set Date to Today
        document.getElementById('attendance-date').valueAsDate = new Date();
    }
});

// --- 1. LOAD CLASS CARDS ---
async function loadTeacherClasses(teacherName) {
    const container = document.getElementById('classes-container');
    
    try {
        const [snap1, snap2] = await Promise.all([
            window.db.collection('classSessions').where('teacherName', '==', teacherName).get(),
            window.db.collection('classSessions').where('teacher', '==', teacherName).get()
        ]);

        const classMap = new Map();
        const process = (doc) => {
            const d = doc.data();
            const key = `${d.section}-${d.subject}`; 
            if(!classMap.has(key)) classMap.set(key, d);
        };

        snap1.forEach(process);
        snap2.forEach(process);

        if (classMap.size === 0) {
            container.innerHTML = '<p>No classes assigned.</p>';
            return;
        }

        container.innerHTML = '';
        classMap.forEach(c => {
            const card = document.createElement('div');
            card.className = 'class-card';
            card.onclick = () => openAttendanceSheet(c);
            
            card.innerHTML = `
                <div class="card-header-strip"></div>
                <div class="card-body">
                    <div class="card-subject">${c.subject}</div>
                    <div class="card-section">${c.section}</div>
                    <div class="card-footer" style="background:transparent; padding:0; border:none;">
                        <span style="font-size:0.85rem;"><i class="fas fa-clock"></i> ${c.days}</span>
                    </div>
                </div>
                <div class="card-footer">
                    <span>Take Attendance</span>
                    <i class="fas fa-chevron-right"></i>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (e) {
        console.error(e);
    }
}

// --- 2. OPEN SHEET & LOAD STUDENTS ---
function openAttendanceSheet(classData) {
    currentSection = classData.section;
    currentSubject = classData.subject;

    document.getElementById('att-subject').innerText = currentSubject;
    document.getElementById('att-section').innerText = currentSection;

    document.getElementById('view-classes-grid').style.display = 'none';
    document.getElementById('view-attendance-sheet').style.display = 'block';

    loadAttendanceForDate();
}

function backToGrid() {
    document.getElementById('view-classes-grid').style.display = 'grid';
    document.getElementById('view-attendance-sheet').style.display = 'none';
}

// --- 3. CHECK FOR EXISTING RECORDS OR LOAD NEW ---
async function loadAttendanceForDate() {
    const date = document.getElementById('attendance-date').value;
    const tbody = document.getElementById('attendance-table-body');
    tbody.innerHTML = '<tr><td colspan="3" class="loading-cell">Checking records...</td></tr>';

    // Parse section name if needed (e.g. "Grade 7 - Rizal" -> "Rizal")
    // Assuming Users collection stores "Rizal" or the full string. 
    // We try to match user data structure.
    let searchSec = currentSection;
    if(currentSection.includes(' - ')) {
        searchSec = currentSection.split(' - ')[1].trim();
    }

    try {
        // A. Check if attendance already exists for this Section + Date + Subject
        // docID format suggestion: "Section_Subject_Date" to make it unique easily
        const docId = `${currentSection}_${currentSubject}_${date}`.replace(/ /g, '_');
        
        const existingRecord = await window.db.collection('attendance_records').doc(docId).get();

        if (existingRecord.exists) {
            // LOAD EXISTING
            renderTable(existingRecord.data().students);
        } else {
            // LOAD FRESH LIST FROM USERS
            const snapshot = await window.db.collection('users')
                .where('role', '==', 'student')
                .where('section', '==', searchSec)
                .get();

            if (snapshot.empty) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No students enrolled in this class.</td></tr>';
                return;
            }

            loadedStudents = [];
            snapshot.forEach(doc => {
                const s = doc.data();
                loadedStudents.push({
                    id: doc.id,
                    name: `${s.lastName}, ${s.firstName}`,
                    status: 'Present', // Default
                    remarks: ''
                });
            });
            
            // Sort
            loadedStudents.sort((a,b) => a.name.localeCompare(b.name));
            renderTable(loadedStudents);
        }

    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="3" style="color:red">Error loading data.</td></tr>';
    }
}

function renderTable(studentList) {
    const tbody = document.getElementById('attendance-table-body');
    tbody.innerHTML = '';
    loadedStudents = studentList; // Update local cache

    studentList.forEach((s, index) => {
        const row = document.createElement('tr');
        
        // Generate Unique IDs for Radios
        const nameId = `s_${index}`;
        
        row.innerHTML = `
            <td><strong>${s.name}</strong></td>
            <td>
                <div class="att-options">
                    <input type="radio" name="${nameId}" id="${nameId}_p" class="att-radio" value="Present" ${s.status==='Present'?'checked':''} onchange="updateStatus(${index}, 'Present')">
                    <label for="${nameId}_p" class="att-label present" title="Present">P</label>

                    <input type="radio" name="${nameId}" id="${nameId}_l" class="att-radio" value="Late" ${s.status==='Late'?'checked':''} onchange="updateStatus(${index}, 'Late')">
                    <label for="${nameId}_l" class="att-label late" title="Late">L</label>

                    <input type="radio" name="${nameId}" id="${nameId}_a" class="att-radio" value="Absent" ${s.status==='Absent'?'checked':''} onchange="updateStatus(${index}, 'Absent')">
                    <label for="${nameId}_a" class="att-label absent" title="Absent">A</label>
                </div>
            </td>
            <td>
                <input type="text" class="form-control" style="margin:0; font-size:0.85rem;" placeholder="Remarks..." value="${s.remarks || ''}" oninput="updateRemarks(${index}, this.value)">
            </td>
        `;
        tbody.appendChild(row);
    });
    
    calculateSummary();
}

// --- 4. STATE MANAGEMENT ---
window.updateStatus = function(index, status) {
    loadedStudents[index].status = status;
    calculateSummary();
};

window.updateRemarks = function(index, value) {
    loadedStudents[index].remarks = value;
};

window.markAllPresent = function() {
    loadedStudents.forEach((s, i) => {
        s.status = 'Present';
        // Visually update radio buttons
        const radio = document.getElementById(`s_${i}_p`);
        if(radio) radio.checked = true;
    });
    calculateSummary();
};

function calculateSummary() {
    let p = 0, l = 0, a = 0;
    loadedStudents.forEach(s => {
        if(s.status === 'Present') p++;
        else if(s.status === 'Late') l++;
        else if(s.status === 'Absent') a++;
    });
    
    document.getElementById('count-p').innerText = p;
    document.getElementById('count-l').innerText = l;
    document.getElementById('count-a').innerText = a;
}

// --- 5. SAVE TO FIREBASE ---
window.saveAttendance = async function() {
    const date = document.getElementById('attendance-date').value;
    const btn = document.querySelector('.btn-primary'); // The Save Button
    
    if(loadedStudents.length === 0) return;

    btn.innerText = "Saving...";
    btn.disabled = true;

    try {
        const docId = `${currentSection}_${currentSubject}_${date}`.replace(/ /g, '_');
        
        await window.db.collection('attendance_records').doc(docId).set({
            date: date,
            section: currentSection,
            subject: currentSubject,
            teacherName: document.getElementById('header-user-name').innerText,
            students: loadedStudents, // Saves the array of objects {id, name, status, remarks}
            updatedAt: new Date()
        });

        alert("Attendance Saved Successfully!");

    } catch (e) {
        console.error(e);
        alert("Error saving: " + e.message);
    } finally {
        btn.innerHTML = '<i class="fas fa-save"></i> Save Record';
        btn.disabled = false;
    }
};