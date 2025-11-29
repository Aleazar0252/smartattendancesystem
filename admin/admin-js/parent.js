/**
 * parent.js
 * Manages Parent List (Read-Only/View)
 * Filters users by role: 'parent'
 */

let allParents = []; 

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.db) {
            console.log("Database connected. Fetching parents...");
            loadParents();
        } else {
            console.error("Firebase DB not initialized.");
        }
    }, 500);

    // Global Click Handler
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

// 1. FETCH DATA
function loadParents() {
    const tableBody = document.getElementById('parent-list-body');
    
    // Updated Query: Users -> role == parent
    window.db.collection('users')
        .where('role', '==', 'parent')
        .get()
        .then((querySnapshot) => {
            allParents = [];
            
            if (querySnapshot.empty) {
                tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No parents registered yet.</td></tr>';
                return;
            }

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                
                // Format Timestamp
                let createdStr = "Unknown";
                if (data.createdAt && data.createdAt.toDate) {
                    createdStr = data.createdAt.toDate().toLocaleDateString() + ' ' + data.createdAt.toDate().toLocaleTimeString();
                } else if (data.createdAt) {
                    createdStr = new Date(data.createdAt).toLocaleDateString();
                }

                allParents.push({
                    docId: doc.id,
                    parentId: data.parentId || 'N/A',
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    fullName: `${data.firstName} ${data.lastName}`,
                    email: data.email || 'N/A',
                    phone: data.phone || 'N/A',
                    address: data.address || 'N/A',
                    status: data.status || 'Active',
                    addedBy: data.addedBy || 'System Admin',
                    createdAt: createdStr
                });
            });
            
            // Sort by Last Name
            allParents.sort((a, b) => a.lastName.localeCompare(b.lastName));
            
            renderTable(allParents);
        })
        .catch((error) => {
            console.error("Error:", error);
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Error: ${error.message}</td></tr>`;
        });
}

// 2. RENDER TABLE (With 3-Dot Menu)
function renderTable(data) {
    const tableBody = document.getElementById('parent-list-body');
    tableBody.innerHTML = '';

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No matches found.</td></tr>';
        return;
    }

    data.forEach(p => {
        const row = document.createElement('tr');
        
        let statusBadge = p.status === 'Active' 
            ? `<span class="badge-success">${p.status}</span>` 
            : `<span class="badge-success" style="background:#ffebee; color:#c62828;">${p.status}</span>`;

        row.innerHTML = `
            <td><strong>${p.parentId}</strong></td>
            <td>${p.fullName}</td>
            <td>${p.email}</td>
            <td>${p.phone}</td>
            <td>${statusBadge}</td>
            <td style="text-align: right;">
                <div class="action-menu-container">
                    <button class="btn-icon" onclick="toggleActionMenu('menu-${p.docId}')">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div id="menu-${p.docId}" class="action-dropdown">
                        <div onclick="viewParentDetails('${p.docId}')">
                            <i class="fas fa-eye" style="color:#6c757d"></i> View Profile
                        </div>
                    </div>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// 3. SEARCH
function searchParents() {
    const input = document.getElementById('search-input').value.toLowerCase();
    
    const filtered = allParents.filter(p => {
        return p.fullName.toLowerCase().includes(input) || 
               p.parentId.toLowerCase().includes(input) ||
               p.phone.includes(input) ||
               p.email.toLowerCase().includes(input);
    });
    
    renderTable(filtered);
}

// 4. VIEW DETAILS
function viewParentDetails(docId) {
    const parent = allParents.find(p => p.docId === docId);
    
    if (parent) {
        document.getElementById('view-avatar').innerText = parent.firstName.charAt(0);
        document.getElementById('view-fullname').innerText = parent.fullName;
        document.getElementById('view-id').innerText = parent.parentId;
        
        document.getElementById('view-phone').innerText = parent.phone;
        document.getElementById('view-email').innerText = parent.email;
        document.getElementById('view-address').innerText = parent.address;
        
        document.getElementById('view-added-by').innerText = parent.addedBy;
        document.getElementById('view-timestamp').innerText = parent.createdAt;
        document.getElementById('view-status').innerText = parent.status;
        
        document.getElementById('view-parent-modal').style.display = 'block';
    }
}

// 5. UI HELPERS
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

window.closeModal = function(modalId) {
    document.getElementById(modalId).style.display = 'none';
}