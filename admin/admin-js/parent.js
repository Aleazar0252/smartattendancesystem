/**
 * parent.js
 * DERIVED Parent List from Student Records
 * Groups students by their listed Parent Contact/Name
 */

// ==========================================
// 1. GLOBAL SCOPE EXPORTS
// ==========================================
window.togglePasswordView = togglePasswordView;
window.searchParents = searchParents; 
window.viewParentDetails = viewParentDetails;
window.toggleActionMenu = toggleActionMenu;
window.closeModal = closeModal;
window.viewAssociatedStudents = viewAssociatedStudents; 
window.loadParents = loadParents; 

// ==========================================
// 2. VARIABLES & INITIALIZATION
// ==========================================
let allParents = []; 
let currentViewPassword = "";

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.db) {
            console.log("✅ Database connection confirmed. Aggregating parents from students...");
            loadParents();
        } else {
            console.error("❌ Firebase DB not initialized. Check admin-js/admin-config.js file.");
        }
    }, 500);

    // Global Click Handler
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

// ==========================================
// 3. DATA FETCHING & RENDERING (AGGREGATION LOGIC)
// ==========================================

async function loadParents() {
    const tableBody = document.getElementById('parent-list-body');
    tableBody.innerHTML = '<tr><td colspan="6" class="loading-cell">Loading parent information...</td></tr>';
    
    try {
        // FETCH STUDENTS ONLY
        const snapshot = await window.db.collection('users').where('role', '==', 'student').get();
        
        if (snapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No students (and thus no parents) found.</td></tr>';
            allParents = [];
            return;
        }

        const parentMap = {}; // Key = Unique Identifier (Name + Contact)

        snapshot.forEach(doc => {
            const data = doc.data();
            
            // Extract Parent Info
            const pFName = data.parentFirstName || '';
            const pLName = data.parentLastName || '';
            const pFullName = data.parentFullName || `${pFName} ${pLName}`.trim();
            const pContact = data.parentContact || 'N/A';
            const pEmail = data.parentEmail || 'N/A';

            // Skip if no parent info exists at all
            if (!pFullName && pContact === 'N/A') return;

            // GENERATE UNIQUE KEY TO GROUP SIBLINGS
            // We use Phone + Name. If phone is N/A, we use Name only.
            const uniqueKey = (pContact !== 'N/A') ? (pFullName + pContact) : (pFullName + doc.id);

            // If this parent isn't in our list yet, add them
            if (!parentMap[uniqueKey]) {
                parentMap[uniqueKey] = {
                    docId: "derived_" + doc.id, // Fake ID for UI logic
                    parentId: "Linked to Student", // No separate Parent ID
                    firstName: pFName,
                    lastName: pLName,
                    fullName: pFullName || "Unknown Parent",
                    email: pEmail,
                    phone: pContact,
                    address: data.address || 'N/A', // Usually in student record
                    status: 'Active',
                    createdAt: data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : 'N/A',
                    
                    // We can't show a parent password because they share the student's account
                    password: "Uses Student Account", 
                    
                    studentCount: 0,
                    associatedStudents: []
                };
            }

            // Add this student to the parent's list
            parentMap[uniqueKey].studentCount++;
            parentMap[uniqueKey].associatedStudents.push({
                studentId: data.studentId || 'N/A',
                fullName: `${data.firstName || ''} ${data.lastName || ''}`,
                gradeLevel: data.gradeLevel || 'N/A',
                section: data.sectionName || 'N/A'
            });
        });

        // Convert Map to Array
        allParents = Object.values(parentMap);
        
        // Sort by Last Name
        allParents.sort((a, b) => a.lastName.localeCompare(b.lastName));
        
        console.log(`Unique Parents Derived: ${allParents.length}`);
        renderTable(allParents);

    } catch (error) {
        console.error("❌ Critical Error in loadParents:", error);
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Error fetching data: ${error.message}</td></tr>`;
    }
}

// 2. RENDER TABLE 
function renderTable(data) {
    const tableBody = document.getElementById('parent-list-body');
    tableBody.innerHTML = '';

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No matches found.</td></tr>';
        return;
    }

    data.forEach(p => {
        const row = document.createElement('tr');
        
        let studentCountBadge = p.studentCount > 0 
            ? `<span class="badge-success" style="background:#e8f5e9; color:#2e7d32; cursor:pointer;" onclick="viewAssociatedStudents('${p.docId}')">${p.studentCount} Child(ren)</span>`
            : `<span class="badge-success" style="background:#f0f0f0; color:#6c757d;">0 Students</span>`;

        row.innerHTML = `
            <td><span style="font-size:0.85rem; color:#888;">${p.parentId}</span></td>
            <td><strong>${p.fullName}</strong></td>
            <td>${p.email}</td>
            <td>${p.phone}</td>
            <td>${studentCountBadge}</td>
            <td style="text-align: right;">
                <div class="action-menu-container">
                    <button class="btn-icon" onclick="toggleActionMenu('menu-${p.docId}')">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div id="menu-${p.docId}" class="action-dropdown">
                        <div onclick="viewParentDetails('${p.docId}')">
                            <i class="fas fa-eye" style="color:#6c757d"></i> View Profile
                        </div>
                        <div onclick="viewAssociatedStudents('${p.docId}')">
                            <i class="fas fa-user-graduate" style="color:#007bff"></i> View Children
                        </div>
                    </div>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// ==========================================
// 4. SEARCH FUNCTION (FIXED & SAFE)
// ==========================================

function searchParents() {
    if (!Array.isArray(allParents) || allParents.length === 0) {
        console.warn("Attempted search before parent data was fully loaded.");
        return; 
    }
    
    const input = document.getElementById('search-input').value.toLowerCase().trim();
    
    const filtered = allParents.filter(p => {
        const nameMatch = String(p.fullName).toLowerCase().includes(input);
        const phoneMatch = String(p.phone).includes(input);
        const emailMatch = String(p.email).toLowerCase().includes(input);

        return nameMatch || phoneMatch || emailMatch;
    });
    
    renderTable(filtered);
}

// ==========================================
// 5. UI MANAGEMENT FUNCTIONS
// ==========================================

function viewParentDetails(docId) {
    const parent = allParents.find(p => p.docId === docId);
    
    if (parent) {
        document.getElementById('view-avatar').innerText = parent.firstName.charAt(0) || 'P';
        document.getElementById('view-fullname').innerText = parent.fullName;
        document.getElementById('view-id').innerText = parent.phone; // Show Phone instead of ID
        
        document.getElementById('view-phone').innerText = parent.phone;
        document.getElementById('view-email').innerText = parent.email;
        document.getElementById('view-address').innerText = parent.address;
        
        document.getElementById('view-timestamp').innerText = parent.createdAt;
        document.getElementById('view-status').innerText = parent.status;

        const passField = document.getElementById('view-password');
        const icon = document.getElementById('toggle-password-btn');
        
        // Disable Password view since they use Student Account
        passField.innerText = "Uses Student Login"; 
        passField.style.fontSize = "0.9rem";
        passField.style.color = "#666";
        icon.style.display = "none";
        
        document.getElementById('view-parent-modal').style.display = 'block';
    }
}

function togglePasswordView() {
    // Disabled in this mode
}

function viewAssociatedStudents(docId) {
    const parent = allParents.find(p => p.docId === docId);
    if (!parent) return;
    
    const modal = document.getElementById("view-associated-students-modal");
    const title = document.getElementById("students-modal-title");
    const loading = document.getElementById("students-loading");
    const table = document.getElementById("associated-students-table");
    const tbody = document.getElementById("associated-students-body");
    const emptyMsg = document.getElementById("students-empty");

    title.innerText = `Children of ${parent.fullName}`;
    modal.style.display = "block";
    
    loading.style.display = "none";
    tbody.innerHTML = "";

    if (parent.associatedStudents.length === 0) {
        table.style.display = "none";
        emptyMsg.style.display = "block";
        return;
    }

    table.style.display = "table";
    emptyMsg.style.display = "none";

    parent.associatedStudents.forEach((s) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${s.studentId}</strong></td>
            <td>${s.fullName}</td>
            <td>${s.gradeLevel} - ${s.section}</td>
        `;
        tbody.appendChild(row);
    });
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