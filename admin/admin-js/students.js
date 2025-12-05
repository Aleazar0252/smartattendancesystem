/**
 * students.js
 * Single Account Model: Parents log in via Student Account.
 * Parent details are stored INSIDE the student document.
 * FIXED: Added Student Phone Number field to data model and all CRUD/UI functions.
 */

// ==========================================
// 1. GLOBAL SCOPE EXPORTS
// ==========================================
window.toggleDropdown = toggleDropdown;
window.toggleActionMenu = toggleActionMenu;
window.viewStudentDetails = viewStudentDetails;
window.deleteStudent = deleteStudent;
window.searchStudents = searchStudents;
window.showAddStudentModal = showAddStudentModal;
window.showBulkUploadModal = showBulkUploadModal;
window.closeModal = closeModal;
window.addNewStudent = addNewStudent;
window.processBulkUpload = processBulkUpload;
window.downloadTemplate = downloadTemplate;
window.togglePasswordView = togglePasswordView;

// ==========================================
// 2. VARIABLES & INITIALIZATION
// ==========================================
let allStudents = []; 
let currentViewPassword = "";
let latestLocalId = 0; 

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.db) {
            console.log("Database connected. Fetching students...");
            loadStudents();
        } else {
            console.error("Firebase DB not initialized.");
        }
    }, 500);

    // Global Click Listener
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = "none";
        }
        if (!event.target.closest('.action-menu-container') && !event.target.closest('#toggle-password-btn')) {
            const dropdowns = document.getElementsByClassName("action-dropdown");
            for (let i = 0; i < dropdowns.length; i++) {
                dropdowns[i].classList.remove('show');
                dropdowns[i].style.display = 'none';
            }
        }
    });
});

// ==========================================
// 3. CORE UI FUNCTIONS
// ==========================================

function toggleDropdown(id, el) {
    document.getElementById(id).classList.toggle("show");
    el.classList.toggle("dropdown-open");
}

function loadStudents() {
    const tableBody = document.getElementById('students-list-body');
    if(!tableBody) return;

    window.db.collection('users')
        .where('role', '==', 'student')
        .get()
        .then((querySnapshot) => {
            allStudents = [];
            
            if (querySnapshot.empty) {
                tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No students found.</td></tr>';
                return;
            }

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                
                if (data.studentId && !isNaN(data.studentId)) {
                    const currentIdNum = parseInt(data.studentId);
                    if (currentIdNum > latestLocalId) latestLocalId = currentIdNum;
                }
                
                let createdStr = "Unknown";
                if (data.createdAt && data.createdAt.toDate) {
                    createdStr = data.createdAt.toDate().toLocaleDateString();
                } else if (data.createdAt) {
                    createdStr = new Date(data.createdAt).toLocaleDateString();
                }

                const pFName = data.parentFirstName || '';
                const pLName = data.parentLastName || '';
                const parentFullName = `${pFName} ${pLName}`.trim() || 'N/A';

                allStudents.push({
                    docId: doc.id,
                    studentId: data.studentId || 'N/A', 
                    lrn: data.lrn || 'N/A',            
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    fullName: `${data.firstName || ''} ${data.lastName || ''}`,
                    
                    // Student Fields
                    email: data.email || 'N/A',
                    phone: data.phone || 'N/A', // <--- ADDED STUDENT PHONE FETCH
                    
                    // Parent Fields
                    parentFirstName: pFName,
                    parentMiddleName: data.parentMiddleName || '',
                    parentLastName: pLName,
                    parentFullName: parentFullName,
                    parentEmail: data.parentEmail || 'N/A',
                    parentContact: data.parentContact || 'N/A', 
                    
                    password: data.password || '******',
                    createdAt: createdStr
                });
            });
            
            allStudents.sort((a, b) => a.studentId.localeCompare(b.studentId, undefined, { numeric: true }));
            renderTable(allStudents);
        })
        .catch((error) => {
            console.error("Error:", error);
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Error: ${error.message}</td></tr>`;
        });
}

function renderTable(data) {
    const tableBody = document.getElementById('students-list-body');
    tableBody.innerHTML = '';

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No matches found.</td></tr>';
        return;
    }

    data.forEach(student => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${student.studentId}</strong></td>
            <td>${student.lrn}</td>
            <td>${student.fullName}</td>
            <td>${student.parentFullName}</td> 
            <td>${student.parentContact}</td> 
            <td style="text-align: right; overflow: visible;">
                <div class="action-menu-container" style="position:relative;">
                    <button class="btn-icon" onclick="toggleActionMenu('menu-${student.docId}')">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div id="menu-${student.docId}" class="action-dropdown" style="display:none; position:absolute; right:0; z-index:9999; background:white; border:1px solid #ccc; border-radius:4px; box-shadow:0 2px 5px rgba(0,0,0,0.2); min-width:140px; text-align:left;">
                        <div onclick="viewStudentDetails('${student.docId}')" style="padding:10px; cursor:pointer; border-bottom:1px solid #eee;">
                            <i class="fas fa-eye" style="color:#6c757d"></i> View Profile
                        </div>
                        <div onclick="deleteStudent('${student.docId}')" style="padding:10px; cursor:pointer; color:#dc3545;">
                            <i class="fas fa-trash"></i> Remove
                        </div>
                    </div>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function toggleActionMenu(menuId) {
    const allMenus = document.querySelectorAll('.action-dropdown');
    allMenus.forEach(menu => {
        if(menu.id !== menuId) {
            menu.style.display = 'none';
            menu.classList.remove('show');
        }
    });

    const menu = document.getElementById(menuId);
    if(menu) {
        if (menu.style.display === 'block') {
            menu.style.display = 'none';
        } else {
            menu.style.display = 'block';
        }
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function searchStudents() {
    const term = document.getElementById('search-input').value.toLowerCase();
    
    const filtered = allStudents.filter(s => {
        const textMatch = s.fullName.toLowerCase().includes(term) || 
                          s.studentId.includes(term) || 
                          s.lrn.includes(term) ||
                          s.parentFirstName.toLowerCase().includes(term) ||
                          s.parentMiddleName.toLowerCase().includes(term) ||
                          s.parentLastName.toLowerCase().includes(term) ||
                          s.parentContact.includes(term) ||
                          s.phone.includes(term); // <--- ADDED STUDENT PHONE TO SEARCH
        return textMatch;
    });
    renderTable(filtered);
}

// ==========================================
// 4. STUDENT DETAILS & MODALS
// ==========================================

function viewStudentDetails(docId) {
    const student = allStudents.find(s => s.docId === docId);
    if (!student) return;

    const avatarEl = document.getElementById('view-avatar');
    if (avatarEl) {
        avatarEl.innerText = student.firstName.charAt(0);
    }
    
    document.getElementById('view-fullname').innerText = student.fullName;
    document.getElementById('view-id').innerText = student.studentId;
    document.getElementById('view-lrn').innerText = student.lrn;
    
    document.getElementById('view-email').innerText = student.email;
    document.getElementById('view-student-phone').innerText = student.phone; // <--- ADDED STUDENT PHONE DISPLAY
    
    document.getElementById('view-parent-fullname').innerText = student.parentFullName;
    document.getElementById('view-parent-email').innerText = student.parentEmail;
    document.getElementById('view-parent-contact').innerText = student.parentContact;
    
    document.getElementById('view-timestamp').innerText = student.createdAt;

    currentViewPassword = student.password || 'Not Set';
    document.getElementById('view-password').innerText = "********";
    
    document.getElementById('view-student-modal').style.display = 'block';
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

async function showAddStudentModal() {
    const form = document.getElementById('add-student-form');
    if(form) form.reset();
    
    document.getElementById('add-student-modal').style.display = 'block';

    const idField = document.getElementById('new-student-id');
    if(idField) {
        idField.value = "Calculating...";
        try {
            const nextId = await generateNextStudentId();
            idField.value = nextId; 
        } catch (error) {
            idField.value = "Error"; 
        }
    }
}

// ==========================================
// 5. CRUD: ADD (Single Account Only)
// ==========================================

async function addNewStudent() {
    const lrn = document.getElementById('new-lrn').value;
    const firstName = document.getElementById('new-firstname').value;
    const lastName = document.getElementById('new-lastname').value;
    const email = document.getElementById('new-email').value;
    const studentPhone = document.getElementById('new-student-phone').value; // <--- FETCHED NEW STUDENT PHONE INPUT
    
    // Parent Data
    const parentFirstName = document.getElementById('new-parent-firstname').value;
    const parentMiddleName = document.getElementById('new-parent-middlename').value;
    const parentLastName = document.getElementById('new-parent-lastname').value;
    const parentEmail = document.getElementById('new-parent-email').value;
    const parentContact = document.getElementById('new-parent-contact').value;
    
    const studentId = document.getElementById('new-student-id').value;
    
    // Create ONE document (Student) with parent info embedded
    const newStudent = {
        studentId: studentId,
        lrn: lrn,
        firstName: firstName,
        middleName: document.getElementById('new-middlename').value,
        lastName: lastName,
        email: email,
        phone: studentPhone, // <--- ADDED STUDENT PHONE TO OBJECT
        
        // Embedded Parent Info
        parentFirstName: parentFirstName,
        parentMiddleName: parentMiddleName,
        parentLastName: parentLastName,
        parentEmail: parentEmail,
        parentContact: parentContact,
        
        password: generatePassword(),
        role: 'student',
        createdAt: new Date()
    };

    try {
        await window.db.collection('users').add(newStudent);
        console.log("Student account created:", studentId);

        latestLocalId = parseInt(studentId); 
        alert("Student Added Successfully!");
        closeModal('add-student-modal');
        loadStudents();
    } catch(err) {
        alert("Error: " + err.message);
    }
}

function deleteStudent(docId) {
    if(confirm("Are you sure you want to remove this student? This cannot be undone.")) {
        window.db.collection('users').doc(docId).delete()
        .then(() => {
            alert("Student removed successfully.");
            loadStudents();
        })
        .catch((error) => {
            alert("Error: " + error.message);
        });
    }
}

// ==========================================
// 6. HELPER FUNCTIONS
// ==========================================

async function generateNextStudentId() {
    const currentYear = new Date().getFullYear(); 
    let dbHighestId = 0;
    try {
        const snapshot = await window.db.collection('users')
            .where('role', '==', 'student')
            .orderBy('studentId', 'desc') 
            .limit(1)
            .get();
        if (!snapshot.empty) {
            const lastId = snapshot.docs[0].data().studentId;
            if (lastId && !isNaN(lastId)) dbHighestId = parseInt(lastId);
        }
    } catch (e) { console.warn("First run or index building:", e); }

    const actualHighest = Math.max(dbHighestId, latestLocalId);
    
    if (actualHighest === 0) {
        return parseInt(`${currentYear}00001`).toString();
    } else {
        return (actualHighest + 1).toString();
    }
}

function generatePassword() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    for (let i = 0; i < 8; i++) password += chars.charAt(Math.floor(Math.random() * chars.length));
    return password;
}

// ==========================================
// 7. BULK UPLOAD LOGIC
// ==========================================

function showBulkUploadModal() {
    document.getElementById('bulk-upload-modal').style.display = 'block';
    document.getElementById('bulk-file-input').value = ""; 
    document.getElementById('upload-status').style.display = 'none'; 
    document.getElementById('upload-logs').innerHTML = "";
}

function downloadTemplate() {
    // MODIFIED: Added "Student Phone" column
    const headers = ["First Name", "Lastname", "Middle name", "email", "Student Phone", "LRN", "Parent First Name", "Parent Middle Name", "Parent Last Name", "Parent Email", "Parent Contact"];
    const dummy = ["John", "Doe", "A", "john@mail.com", "09991234567", "123456789", "Jane", "P.", "Smith", "jane@mail.com", "09171234567"];
    
    const rows = [headers, dummy];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = "student_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function processBulkUpload() {
    const fileInput = document.getElementById('bulk-file-input');
    const logsDiv = document.getElementById('upload-logs');
    const statusDiv = document.getElementById('upload-status');
    const btn = document.getElementById('btn-process-upload');

    if (fileInput.files.length === 0) { 
        alert("Please select a file first!"); 
        return; 
    }
    
    if (!window.XLSX) {
        alert("Error: Excel Library (SheetJS) is not loaded. Please refresh.");
        return;
    }

    btn.innerText = "Processing...";
    btn.disabled = true;
    statusDiv.style.display = 'block';
    logsDiv.innerHTML = "<div>Reading file...</div>";

    const reader = new FileReader();
    
    reader.onload = async function(e) {
        try {
            const workbook = window.XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const jsonData = window.XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName]);
            
            if (jsonData.length === 0) {
                logsDiv.innerHTML += "<div style='color:red;'>File is empty!</div>";
                btn.innerText = "Upload & Process";
                btn.disabled = false;
                return;
            }

            logsDiv.innerHTML += `<div>Found ${jsonData.length} rows. Generating IDs...</div>`;

            let currentIdString = await generateNextStudentId(); 
            let currentIdNum = parseInt(currentIdString); 
            
            let successCount = 0;
            let failCount = 0;
            
            for (let i = 0; i < jsonData.length; i++) {
                const row = jsonData[i];

                const fName = row["First Name"] || row["firstname"] || row["Firstname"];
                const lName = row["Lastname"] || row["lastname"] || row["Last Name"];
                
                const pFName = row["Parent First Name"] || row["Parent Firstname"] || row["parent first name"] || row["Parent FName"] || "";
                
                if(!fName || !lName) {
                    logsDiv.innerHTML += `<div style='color:orange;'>Row ${i+1}: Skipped (Missing Name)</div>`;
                    failCount++;
                    continue;
                }

                const studentId = currentIdNum.toString();
                const newStudent = {
                    studentId: studentId,
                    firstName: fName,
                    lastName: lName,
                    middleName: row["Middle name"] || row["middlename"] || "",
                    email: row["email"] || row["Email"] || "",
                    phone: String(row["Student Phone"] || row["student phone"] || row["Phone"] || ""), // <--- ADDED STUDENT PHONE FROM BULK
                    lrn: String(row["LRN"] || row["lrn"] || ""),
                    
                    // Embedded Parent Info
                    parentFirstName: pFName,
                    parentMiddleName: row["Parent Middle Name"] || row["Parent Middle Name"] || row["parent middle name"] || row["Parent MName"] || "",
                    parentLastName: row["Parent Last Name"] || row["Parent Lastname"] || row["parent last name"] || row["Parent LName"] || "",
                    parentEmail: row["Parent Email"] || row["Parent Email"] || row["parent email"] || "",
                    parentContact: String(row["Parent Contact"] || row["Parent Contact"] || row["parent contact"] || ""),
                    
                    password: generatePassword(),
                    role: 'student',
                    createdAt: new Date()
                };

                try {
                    await window.db.collection('users').add(newStudent);
                    
                    logsDiv.innerHTML += `<div style='color:green; font-size:11px;'>Added: ${fName} ${lName}</div>`;
                    
                    currentIdNum++; 
                    successCount++;
                    logsDiv.scrollTop = logsDiv.scrollHeight;

                } catch(err) {
                    console.error(err);
                    logsDiv.innerHTML += `<div style='color:red;'>Row ${i+1} DB Error: ${err.message}</div>`;
                    failCount++;
                }
            }

            latestLocalId = currentIdNum;

            logsDiv.innerHTML += `<br><strong>Done! Success: ${successCount}, Failed: ${failCount}</strong>`;
            
            if(successCount > 0) {
                alert(`Upload Complete!\nSuccess: ${successCount}\nFailed: ${failCount}`);
                loadStudents();
            }

        } catch (error) {
            console.error(error);
            logsDiv.innerHTML += `<div style='color:red;'>Critical Error: ${error.message}</div>`;
            alert("An error occurred. Check console.");
        } finally {
            btn.innerText = "Upload & Process";
            btn.disabled = false;
        }
    };

    reader.readAsArrayBuffer(fileInput.files[0]);
}