/**
 * students.js
 * Read-Only Student List for Admin
 * Fetches users with role="student"
 */

let allStudents = []; 

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.db) {
            console.log("Database connected. Fetching students...");
            loadStudents();
        } else {
            console.error("Firebase DB not initialized.");
        }
    }, 500);

    // Global Click Handler (Closes Modals & Dropdowns)
    window.onclick = function(event) {
        // Close Modal
        if (event.target.classList.contains('modal')) {
            event.target.style.display = "none";
        }
        
        // Close Action Menu if clicked outside
        if (!event.target.closest('.action-menu-container')) {
            const dropdowns = document.getElementsByClassName("action-dropdown");
            for (let i = 0; i < dropdowns.length; i++) {
                dropdowns[i].classList.remove('show');
            }
        }
    }
});

// 1. FETCH DATA
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
                
                let createdStr = "Unknown";
                if (data.createdAt && data.createdAt.toDate) {
                    createdStr = data.createdAt.toDate().toLocaleDateString() + ' ' + data.createdAt.toDate().toLocaleTimeString();
                } else if (data.createdAt) {
                    createdStr = new Date(data.createdAt).toLocaleDateString();
                }

                allStudents.push({
                    docId: doc.id,
                    studentId: data.studentId || 'N/A',
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    fullName: `${data.firstName} ${data.lastName}`,
                    gradeLevel: data.gradeLevel || 'N/A',
                    section: data.section || 'N/A',
                    email: data.email || 'N/A',
                    addedBy: data.addedBy || 'System Admin', 
                    createdAt: createdStr
                });
            });
            
            // Sort by Last Name
            allStudents.sort((a, b) => a.lastName.localeCompare(b.lastName));
            
            renderTable(allStudents);
        })
        .catch((error) => {
            console.error("Error:", error);
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Error: ${error.message}</td></tr>`;
        });
}

// 2. RENDER TABLE (Updated with 3-Dot Menu)
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
            <td>${student.fullName}</td>
            <td><span class="badge-success" style="background:#e3f2fd; color:#0d47a1; border:none;">${student.gradeLevel}</span></td>
            <td>${student.section}</td>
            <td>${student.email}</td>
            <td style="text-align: right;">
                <div class="action-menu-container">
                    <button class="btn-icon" onclick="toggleActionMenu('menu-${student.docId}')">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div id="menu-${student.docId}" class="action-dropdown">
                        <div onclick="viewStudentDetails('${student.docId}')">
                            <i class="fas fa-eye" style="color:#6c757d"></i> View Profile
                        </div>
                        </div>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// 3. SEARCH & FILTER
function searchStudents() {
    const searchInput = document.getElementById('search-input').value.toLowerCase();
    const gradeFilter = document.getElementById('filter-grade').value;
    
    const filtered = allStudents.filter(s => {
        const matchesText = s.fullName.toLowerCase().includes(searchInput) || 
                            s.studentId.toLowerCase().includes(searchInput);
        
        const matchesGrade = (gradeFilter === 'All') || (s.gradeLevel === gradeFilter);
        
        return matchesText && matchesGrade;
    });
    
    renderTable(filtered);
}

// 4. VIEW DETAILS
function viewStudentDetails(docId) {
    const student = allStudents.find(s => s.docId === docId);
    
    if (student) {
        document.getElementById('view-avatar').innerText = student.firstName.charAt(0);
        document.getElementById('view-fullname').innerText = student.fullName;
        document.getElementById('view-id').innerText = student.studentId;
        
        document.getElementById('view-grade').innerText = student.gradeLevel;
        document.getElementById('view-section').innerText = student.section;
        document.getElementById('view-email').innerText = student.email;
        
        document.getElementById('view-added-by').innerText = student.addedBy;
        document.getElementById('view-timestamp').innerText = student.createdAt;
        
        document.getElementById('view-student-modal').style.display = 'block';
    }
}

// 5. UI HELPERS
function toggleActionMenu(menuId) {
    const dropdowns = document.getElementsByClassName("action-dropdown");
    for (let i = 0; i < dropdowns.length; i++) {
        // Close all other dropdowns except the one clicked
        if (dropdowns[i].id !== menuId) {
            dropdowns[i].classList.remove('show');
        }
    }
    // Toggle current
    const menu = document.getElementById(menuId);
    if(menu) menu.classList.toggle('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}