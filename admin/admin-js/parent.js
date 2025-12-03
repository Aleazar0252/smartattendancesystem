/**
 * parent.js
 * Manages Parent List & Add Functionality
 * Filters users by role: 'parent'
 */

let allParents = []; 
let currentViewPassword = "";

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
        if (!event.target.closest('.action-menu-container') && !event.target.closest('#toggle-password-btn')) {
            const dropdowns = document.getElementsByClassName("action-dropdown");
            for (let i = 0; i < dropdowns.length; i++) {
                dropdowns[i].classList.remove('show');
            }
        }
    }
});

// --- HELPER: Generate Password ---
function generatePassword() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// 1. FETCH DATA
function loadParents() {
    const tableBody = document.getElementById('parent-list-body');
    
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
                    createdStr = data.createdAt.toDate().toLocaleDateString();
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
                    password: data.password || '******',
                    status: data.status || 'Active',
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

// 3. ADD NEW PARENT
function addNewParent() {
    const parentId = document.getElementById('new-parent-id').value;
    const firstName = document.getElementById('new-firstname').value;
    const middleName = document.getElementById('new-middlename').value;
    const lastName = document.getElementById('new-lastname').value;
    const email = document.getElementById('new-email').value;
    const phone = document.getElementById('new-phone').value;
    const address = document.getElementById('new-address').value;

    if (!parentId || !firstName || !lastName || !email || !phone) {
        alert("Please fill in all required fields.");
        return;
    }

    const password = generatePassword();

    const newParent = {
        parentId: parentId, // Manual ID
        firstName: firstName,
        middleName: middleName,
        lastName: lastName,
        email: email,
        phone: phone,
        address: address,
        password: password,
        role: 'parent',
        status: 'Active',
        createdAt: new Date()
    };

    const btn = document.querySelector('#add-parent-modal .btn-primary');
    const originalText = btn.innerText;
    btn.innerText = "Saving...";
    btn.disabled = true;

    window.db.collection('users').add(newParent)
        .then(() => {
            alert(`Parent Added Successfully!\n\nID: ${parentId}\nPassword: ${password}`);
            closeModal('add-parent-modal');
            loadParents();
        })
        .catch((error) => {
            alert("Error: " + error.message);
        })
        .finally(() => {
            btn.innerText = originalText;
            btn.disabled = false;
        });
}

// 4. SEARCH
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

// 5. VIEW DETAILS
function viewParentDetails(docId) {
    const parent = allParents.find(p => p.docId === docId);
    
    if (parent) {
        document.getElementById('view-avatar').innerText = parent.firstName.charAt(0);
        document.getElementById('view-fullname').innerText = parent.fullName;
        document.getElementById('view-id').innerText = parent.parentId;
        
        document.getElementById('view-phone').innerText = parent.phone;
        document.getElementById('view-email').innerText = parent.email;
        document.getElementById('view-address').innerText = parent.address;
        
        document.getElementById('view-timestamp').innerText = parent.createdAt;
        document.getElementById('view-status').innerText = parent.status;

        // Password Reveal Logic
        currentViewPassword = parent.password || 'Not Set';
        const passField = document.getElementById('view-password');
        const icon = document.getElementById('toggle-password-btn');
        passField.innerText = "********"; 
        icon.className = "fas fa-eye";
        
        document.getElementById('view-parent-modal').style.display = 'block';
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

// 6. UI HELPERS
function showAddParentModal() {
    document.getElementById('add-parent-form').reset();
    document.getElementById('add-parent-modal').style.display = 'block';
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