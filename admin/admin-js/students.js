/**
 * students.js
 * Student Management for Admin
 * Handles CRUD operations: List, Add, View, Delete, and Search
 */

let allStudents = []; 
let currentViewPassword = "";

document.addEventListener('DOMContentLoaded', () => {
    // 1. Check for Database Connection
    setTimeout(() => {
        if (window.db) {
            console.log("Database connected. Fetching students...");
            loadStudents();
        } else {
            console.error("Firebase DB not initialized.");
        }
    }, 500);

    // 2. Global Event Listeners (Close Modals & Dropdowns)
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = "none";
        }
        // Close Action Menu if clicked outside
        if (!event.target.closest('.action-menu-container') && !event.target.closest('#toggle-password-btn')) {
            const dropdowns = document.getElementsByClassName("action-dropdown");
            for (let i = 0; i < dropdowns.length; i++) {
                dropdowns[i].classList.remove('show');
            }
        }
    }
});

// --- HELPER: Generate Random Password ---
function generatePassword() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// ==========================================
// 1. FETCH & DISPLAY STUDENTS
// ==========================================

function loadStudents() {
    const tableBody = document.getElementById('students-list-body');
    
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
                
                // Format Date
                let createdStr = "Unknown";
                if (data.createdAt && data.createdAt.toDate) {
                    createdStr = data.createdAt.toDate().toLocaleDateString();
                } else if (data.createdAt) {
                    createdStr = new Date(data.createdAt).toLocaleDateString();
                }

                allStudents.push({
                    docId: doc.id,
                    studentId: data.studentId || 'N/A', 
                    lrn: data.lrn || 'N/A',            
                    firstName: data.firstName || '',
                    middleName: data.middleName || '',
                    lastName: data.lastName || '',
                    fullName: `${data.firstName} ${data.lastName}`,
                    gradeLevel: data.gradeLevel || 'N/A',
                    section: data.section || 'N/A',
                    email: data.email || 'N/A',
                    password: data.password || '******',
                    createdAt: createdStr
                });
            });
            
            // Sort by Last Name Alphabetically
            allStudents.sort((a, b) => a.lastName.localeCompare(b.lastName));
            
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
            <td><span class="badge-success" style="background:#e3f2fd; color:#0d47a1; border:none;">${student.gradeLevel}</span></td>
            <td>${student.section}</td>
            <td style="text-align: right;">
                <div class="action-menu-container">
                    <button class="btn-icon" onclick="toggleActionMenu('menu-${student.docId}')">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div id="menu-${student.docId}" class="action-dropdown">
                        <div onclick="viewStudentDetails('${student.docId}')">
                            <i class="fas fa-eye" style="color:#6c757d"></i> View Profile
                        </div>
                        <div onclick="deleteStudent('${student.docId}')">
                            <i class="fas fa-trash" style="color:#dc3545"></i> Remove
                        </div>
                    </div>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// ==========================================
// 2. SEARCHABLE SECTION DROPDOWN (DATALIST)
// ==========================================

async function loadAvailableSections() {
    const dataList = document.getElementById('sections-list');
    const input = document.getElementById('new-section-input');
    
    // Clear previous options
    dataList.innerHTML = '';
    input.placeholder = "Loading available sections...";
    
    try {
        const snap = await window.db.collection('sections').get();
        
        if(snap.empty) {
            input.placeholder = "No sections found. Create one first.";
            return;
        }

        let sections = [];
        snap.forEach(doc => {
            const d = doc.data();
            sections.push({
                grade: d.gradeLevel,
                name: d.sectionName
            });
        });

        // Sort by Grade then Name
        sections.sort((a, b) => a.grade.localeCompare(b.grade) || a.name.localeCompare(b.name));

        // Populate Datalist
        sections.forEach(s => {
            // Format: "Grade 7 - Rizal"
            const text = `${s.grade} - ${s.name}`;
            const option = document.createElement('option');
            option.value = text; 
            dataList.appendChild(option);
        });
        
        input.placeholder = "Type to search (e.g., Grade 7...)";

    } catch(e) {
        console.error(e);
        input.placeholder = "Error loading sections";
    }
}

// ==========================================
// 3. ADD NEW STUDENT
// ==========================================

function addNewStudent() {
    // 1. Get Values
    const studentId = document.getElementById('new-student-id').value;
    const lrn = document.getElementById('new-lrn').value;
    const firstName = document.getElementById('new-firstname').value;
    const middleName = document.getElementById('new-middlename').value;
    const lastName = document.getElementById('new-lastname').value;
    const email = document.getElementById('new-email').value;
    const sectionInputValue = document.getElementById('new-section-input').value;

    // 2. Validate
    if(!studentId || !lrn || !firstName || !lastName || !email || !sectionInputValue) {
        alert("Please fill in all required fields.");
        return;
    }

    // 3. Parse "Grade X - SectionName"
    if (!sectionInputValue.includes(' - ')) {
        alert("Invalid Section format. Please select a valid option from the list (e.g., 'Grade 7 - Rizal').");
        return;
    }

    const parts = sectionInputValue.split(' - ');
    const gradeLevel = parts[0].trim();
    // Join remaining parts in case section name has a hyphen
    const section = parts.slice(1).join(' - ').trim();

    // 4. Generate Password
    const password = generatePassword();

    // 5. Create Data Object
    const newStudent = {
        studentId: studentId,
        lrn: lrn,
        firstName: firstName,
        middleName: middleName,
        lastName: lastName,
        email: email,
        gradeLevel: gradeLevel, // Parsed Grade
        section: section,       // Parsed Section
        password: password,
        role: 'student',
        createdAt: new Date()
    };

    // 6. Save to Firebase
    const btn = document.querySelector('#add-student-modal .btn-primary');
    const originalText = btn.innerText;
    btn.innerText = "Saving...";
    btn.disabled = true;

    window.db.collection('users').add(newStudent)
        .then(() => {
            alert(`Student Added Successfully!\n\nID: ${studentId}\nPassword: ${password}`);
            closeModal('add-student-modal');
            loadStudents(); 
        })
        .catch((error) => {
            alert("Error: " + error.message);
        })
        .finally(() => {
            btn.innerText = originalText;
            btn.disabled = false;
        });
}

// ==========================================
// 4. VIEW & DELETE FUNCTIONS
// ==========================================

function viewStudentDetails(docId) {
    const student = allStudents.find(s => s.docId === docId);
    
    if (student) {
        document.getElementById('view-avatar').innerText = student.firstName.charAt(0);
        document.getElementById('view-fullname').innerText = student.fullName;
        document.getElementById('view-id').innerText = student.studentId;
        document.getElementById('view-lrn').innerText = student.lrn;
        
        document.getElementById('view-grade').innerText = student.gradeLevel;
        document.getElementById('view-section').innerText = student.section;
        document.getElementById('view-email').innerText = student.email;
        document.getElementById('view-timestamp').innerText = student.createdAt;

        // Password Reveal Logic
        currentViewPassword = student.password || 'Not Set';
        const passField = document.getElementById('view-password');
        const icon = document.getElementById('toggle-password-btn');
        
        // Reset state
        passField.innerText = "********"; 
        icon.className = "fas fa-eye";
        
        document.getElementById('view-student-modal').style.display = 'block';
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

function deleteStudent(docId) {
    if(confirm("Are you sure you want to remove this student? This cannot be undone.")) {
        window.db.collection('users').doc(docId).delete()
        .then(() => {
            alert("Student removed successfully.");
            loadStudents();
        })
        .catch((error) => {
            console.error("Error removing document: ", error);
            alert("Error removing student: " + error.message);
        });
    }
}

// ==========================================
// 5. SEARCH & FILTER
// ==========================================

function searchStudents() {
    const searchInput = document.getElementById('search-input').value.toLowerCase();
    const gradeFilter = document.getElementById('filter-grade').value;
    
    const filtered = allStudents.filter(s => {
        const matchesText = s.fullName.toLowerCase().includes(searchInput) || 
                            s.studentId.toLowerCase().includes(searchInput) ||
                            s.lrn.includes(searchInput);
        
        const matchesGrade = (gradeFilter === 'All') || (s.gradeLevel === gradeFilter);
        
        return matchesText && matchesGrade;
    });
    
    renderTable(filtered);
}

// ==========================================
// 6. UI HELPERS
// ==========================================

// Open Modal & Initialize Section List
function showAddStudentModal() {
    const form = document.getElementById('add-student-form');
    if(form) form.reset();
    
    // Clear the specific search input manually to be safe
    const input = document.getElementById('new-section-input');
    if(input) input.value = "";

    document.getElementById('add-student-modal').style.display = 'block';
    
    // Load fresh sections
    loadAvailableSections();
}

function toggleActionMenu(menuId) {
    const dropdowns = document.getElementsByClassName("action-dropdown");
    for (let i = 0; i < dropdowns.length; i++) {
        if (dropdowns[i].id !== menuId) {
            dropdowns[i].classList.remove('show');
        }
    }
    const menu = document.getElementById(menuId);
    if(menu) menu.classList.toggle('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}