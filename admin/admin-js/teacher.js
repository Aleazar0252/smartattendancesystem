/**
 * teacher.js
 * Manages Personnel & Displays Workload
 */

let allTeachers = []; 
let currentViewPassword = ""; 

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.db) {
            console.log("Database connected. Fetching teachers...");
            loadTeachersWithLoad();
        } else {
            console.error("Firebase DB not initialized.");
        }
    }, 500);

    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = "none";
        }
        if (!event.target.closest('.action-menu-container') && !event.target.closest('#toggle-password-btn')) {
            const dropdowns = document.getElementsByClassName("action-dropdown");
            for (let i = 0; i < dropdowns.length; i++) {
                dropdowns[i].classList.remove('show');
            }
        }
    }
});

// --- HELPER: Generate ID ---
function generateTeacherID() {
    const sequence = Math.floor(100 + Math.random() * 900);
    return `TCHR-202630-${sequence}`;
}

// --- HELPER: Generate Password ---
function generatePassword() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    for (let i = 0; i < 6; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// --- VALIDATION FUNCTIONS ---

function validateEmailInput() {
    const email = document.getElementById('new-email').value;
    const errorMsg = document.getElementById('email-error');
    
    if (email.length > 0 && !email.endsWith("@gmail.com")) {
        errorMsg.style.display = 'block';
        return false;
    } else {
        errorMsg.style.display = 'none';
        return true;
    }
}

function validatePhoneInput() {
    const phone = document.getElementById('new-phone').value;
    const errorMsg = document.getElementById('phone-error');
    
    if (phone.length > 0 && phone.length !== 11) {
        errorMsg.style.display = 'block';
        return false;
    } else {
        errorMsg.style.display = 'none';
        return true;
    }
}

// 1. FETCH DATA
async function loadTeachersWithLoad() {
    const tableBody = document.getElementById('teachers-list-body');
    if(allTeachers.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="loading-cell">Loading personnel...</td></tr>';
    }

    try {
        const teachersSnap = await window.db.collection('users')
            .where('role', '==', 'teacher')
            .get();

        const schedulesSnap = await window.db.collection('classSessions').get();

        const loadCounts = {};
        schedulesSnap.forEach(doc => {
            const s = doc.data();
            const teacherName = s.teacher; 
            if (teacherName) {
                loadCounts[teacherName] = (loadCounts[teacherName] || 0) + 1;
            }
        });

        allTeachers = [];
        if (teachersSnap.empty) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No teachers found.</td></tr>';
            return;
        }

        teachersSnap.forEach((doc) => {
            const data = doc.data();
            const fullName = `${data.firstName} ${data.lastName}`;
            
            let createdStr = "N/A";
            if (data.createdAt && data.createdAt.toDate) {
                createdStr = data.createdAt.toDate().toLocaleDateString() + ' ' + data.createdAt.toDate().toLocaleTimeString();
            } else if (data.createdAt) {
                createdStr = new Date(data.createdAt).toLocaleDateString();
            }

            allTeachers.push({
                docId: doc.id, 
                id: data.teacherId || 'N/A',
                firstName: data.firstName || '',
                middleName: data.middleName || '',
                lastName: data.lastName || '',
                fullName: fullName,
                email: data.email || '',
                phone: data.phone || 'N/A', 
                status: data.status || 'Active',
                password: data.password || '******',
                createdAtStr: createdStr,
                classCount: loadCounts[fullName] || 0
            });
        });

        renderTable(allTeachers);

    } catch (error) {
        console.error("Error:", error);
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Error: ${error.message}</td></tr>`;
    }
}

// 2. RENDER TABLE
function renderTable(data) {
    const tableBody = document.getElementById('teachers-list-body');
    tableBody.innerHTML = '';

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No matches found.</td></tr>';
        return;
    }

    data.forEach(teacher => {
        const row = document.createElement('tr');
        
        let badgeStyle = teacher.classCount === 0 
            ? "background:#ffebee; color:#c62828; border:none; cursor:pointer;" 
            : "background:#e8f5e9; color:#2e7d32; border:none; cursor:pointer;";

        const countBadge = `<span class="badge-success" style="${badgeStyle}" onclick="viewTeacherSchedules('${teacher.fullName}')">
                                ${teacher.classCount} Classes
                            </span>`;

        row.innerHTML = `
            <td><strong>${teacher.id}</strong></td>
            <td>${teacher.fullName}</td>
            <td>${teacher.email}</td>
            <td>${countBadge}</td> 
            <td style="text-align: right;">
                <div class="action-menu-container">
                    <button class="btn-icon" onclick="toggleActionMenu('menu-${teacher.docId}')">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div id="menu-${teacher.docId}" class="action-dropdown">
                        <div onclick="viewTeacherDetails('${teacher.docId}')">
                            <i class="fas fa-eye" style="color:#6c757d"></i> View Profile
                        </div>
                        <div onclick="archiveTeacher('${teacher.docId}')">
                            <i class="fas fa-archive" style="color:#dc3545"></i> Archive
                        </div>
                    </div>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// 3. ADD NEW TEACHER
function addNewTeacher() {
    const id = document.getElementById('new-id').value;
    const firstName = document.getElementById('new-firstname').value;
    const middleName = document.getElementById('new-middlename').value;
    const lastName = document.getElementById('new-lastname').value;
    const email = document.getElementById('new-email').value;
    const phone = document.getElementById('new-phone').value;

    // Check basic required fields
    if(!id || !firstName || !lastName || !email || !phone) {
        alert("Please fill in required fields.");
        return;
    }

    // Run format validations
    if (!validateEmailInput() || !validatePhoneInput()) {
        alert("Please correct the errors in the form (Email or Phone).");
        return;
    }

    const password = generatePassword(); 

    const newTeacher = {
        teacherId: id,
        password: password,
        firstName: firstName,
        middleName: middleName,
        lastName: lastName,
        email: email,
        phone: phone,
        status: 'Active',
        role: 'teacher',
        createdAt: new Date()
    };

    const btn = document.querySelector('#add-teacher-modal .btn-primary');
    const originalText = btn.innerText;
    btn.innerText = "Saving...";
    btn.disabled = true;

    window.db.collection('users').add(newTeacher)
        .then(() => {
            alert(`Teacher Added Successfully!\n\nID: ${id}\n\nPlease check 'View Profile' to see the password.`);
            closeModal('add-teacher-modal');
            loadTeachersWithLoad(); 
        })
        .catch((error) => {
            alert("Error: " + error.message);
        })
        .finally(() => {
            btn.innerText = originalText;
            btn.disabled = false;
        });
}

// --- UI HELPERS ---

function showAddTeacherModal() {
    document.getElementById('add-teacher-form').reset();
    document.getElementById('email-error').style.display = 'none';
    document.getElementById('phone-error').style.display = 'none';
    document.getElementById('new-id').value = generateTeacherID();
    document.getElementById('add-teacher-modal').style.display = 'block';
}

function searchTeachers() {
    const input = document.getElementById('search-input').value.toLowerCase();
    const filtered = allTeachers.filter(t => 
        t.firstName.toLowerCase().includes(input) || 
        t.lastName.toLowerCase().includes(input) ||
        t.id.toLowerCase().includes(input)
    );
    renderTable(filtered);
}

function viewTeacherDetails(docId) {
    const teacher = allTeachers.find(t => t.docId === docId);
    if (teacher) {
        document.getElementById('view-avatar').innerText = teacher.firstName.charAt(0);
        document.getElementById('view-fullname').innerText = teacher.fullName;
        document.getElementById('view-id').innerText = teacher.id;
        document.getElementById('view-middlename').innerText = teacher.middleName || '-';
        document.getElementById('view-phone').innerText = teacher.phone;
        document.getElementById('view-email').innerText = teacher.email;
        document.getElementById('view-timestamp').innerText = teacher.createdAtStr;
        
        currentViewPassword = teacher.password || 'Not Set';
        const passField = document.getElementById('view-password');
        const icon = document.getElementById('toggle-password-btn');
        passField.innerText = "********"; 
        icon.className = "fas fa-eye";
        
        document.getElementById('view-status').innerText = teacher.status || 'Active';
        document.getElementById('view-teacher-modal').style.display = 'block';
    }
}

function togglePasswordView() {
    const passField = document.getElementById('view-password');
    const icon = document.getElementById('toggle-password-btn');
    
    if (passField.innerText === "********") {
        passField.innerText = currentViewPassword;
        icon.className = "fas fa-eye-slash"; 
    } else {
        passField.innerText = "********";
        icon.className = "fas fa-eye"; 
    }
}

function viewTeacherSchedules(teacherName) {
    const modal = document.getElementById('view-schedules-modal');
    const title = document.getElementById('schedules-modal-title');
    const loading = document.getElementById('schedules-loading');
    const table = document.getElementById('teacher-schedules-table');
    const tbody = document.getElementById('teacher-schedules-body');
    const emptyMsg = document.getElementById('schedules-empty');

    title.innerText = `Schedules: ${teacherName}`;
    modal.style.display = 'block';
    loading.style.display = 'block';
    table.style.display = 'none';
    emptyMsg.style.display = 'none';
    tbody.innerHTML = '';

    window.db.collection('classSessions')
        .where('teacher', '==', teacherName)
        .get()
        .then((querySnapshot) => {
            loading.style.display = 'none';
            if (querySnapshot.empty) {
                emptyMsg.style.display = 'block';
                return;
            }
            table.style.display = 'table';
            querySnapshot.forEach((doc) => {
                const s = doc.data();
                const row = document.createElement('tr');
                const timeStr = `${s.startTime || '?'} - ${s.endTime || '?'}`;
                row.innerHTML = `
                    <td><strong>${s.subject}</strong></td>
                    <td>${s.section}</td>
                    <td><span style="color:#e65100;">${s.days}</span> <small>${timeStr}</small></td>
                `;
                tbody.appendChild(row);
            });
        })
        .catch((err) => {
            console.error(err);
            loading.innerText = "Error loading schedules.";
        });
}

function archiveTeacher(docId) {
    if(confirm("Are you sure you want to archive this teacher?")) {
        window.db.collection('users').doc(docId).update({
            status: 'Archived'
        }).then(() => {
            alert("Teacher archived.");
            loadTeachersWithLoad();
        }).catch(err => alert("Error: " + err.message));
    }
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
window.validateEmailInput = validateEmailInput;
window.validatePhoneInput = validatePhoneInput;
window.togglePasswordView = togglePasswordView;