/**
 * guidance.js
 * Manages Guidance Counselors (Role: 'guidance')
 */

let allGuidance = []; 
let currentViewPassword = ""; 

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.db) {
            console.log("Database connected. Fetching guidance staff...");
            loadGuidanceList();
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

// --- GENERATORS ---
function generateGuidanceID() {
    const sequence = Math.floor(100 + Math.random() * 900);
    return `GUID-202630-${sequence}`; // GUID prefix
}

function generatePassword() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    for (let i = 0; i < 6; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// --- VALIDATIONS ---
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
function loadGuidanceList() {
    const tableBody = document.getElementById('guidance-list-body');
    if(allGuidance.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="loading-cell">Loading personnel...</td></tr>';
    }

    // Fetch users where role is 'guidance'
    window.db.collection('users')
        .where('role', '==', 'guidance')
        .get()
        .then((querySnapshot) => {
            allGuidance = [];
            if (querySnapshot.empty) {
                tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No guidance staff found.</td></tr>';
                return;
            }

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const fullName = `${data.firstName} ${data.lastName}`;
                
                // Format Timestamp
                let createdStr = "N/A";
                if (data.createdAt && data.createdAt.toDate) {
                    createdStr = data.createdAt.toDate().toLocaleDateString() + ' ' + data.createdAt.toDate().toLocaleTimeString();
                } else if (data.createdAt) {
                    createdStr = new Date(data.createdAt).toLocaleDateString();
                }

                allGuidance.push({
                    docId: doc.id, 
                    id: data.guidanceId || 'N/A', // Using guidanceId field
                    firstName: data.firstName || '',
                    middleName: data.middleName || '',
                    lastName: data.lastName || '',
                    fullName: fullName,
                    email: data.email || '',
                    phone: data.phone || 'N/A', 
                    status: data.status || 'Active',
                    password: data.password || '******',
                    createdAtStr: createdStr
                });
            });
            renderTable(allGuidance);
        })
        .catch((error) => {
            console.error("Error:", error);
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Error: ${error.message}</td></tr>`;
        });
}

// 2. RENDER TABLE
function renderTable(data) {
    const tableBody = document.getElementById('guidance-list-body');
    tableBody.innerHTML = '';

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No matches found.</td></tr>';
        return;
    }

    data.forEach(staff => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${staff.id}</strong></td>
            <td>${staff.fullName}</td>
            <td>${staff.email}</td>
            <td>${staff.phone}</td>
            <td style="text-align: right;">
                <div class="action-menu-container">
                    <button class="btn-icon" onclick="toggleActionMenu('menu-${staff.docId}')">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div id="menu-${staff.docId}" class="action-dropdown">
                        <div onclick="viewGuidanceDetails('${staff.docId}')">
                            <i class="fas fa-eye" style="color:#6c757d"></i> View Profile
                        </div>
                        <div onclick="archiveGuidance('${staff.docId}')">
                            <i class="fas fa-archive" style="color:#dc3545"></i> Archive
                        </div>
                    </div>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// 3. ADD NEW GUIDANCE
function addNewGuidance() {
    const id = document.getElementById('new-id').value;
    const firstName = document.getElementById('new-firstname').value;
    const middleName = document.getElementById('new-middlename').value;
    const lastName = document.getElementById('new-lastname').value;
    const email = document.getElementById('new-email').value;
    const phone = document.getElementById('new-phone').value;

    if(!id || !firstName || !lastName || !email || !phone) {
        alert("Please fill in required fields.");
        return;
    }

    if (!validateEmailInput() || !validatePhoneInput()) {
        alert("Please correct the errors in the form.");
        return;
    }

    const password = generatePassword(); 

    const newStaff = {
        guidanceId: id, // Unique field name for Guidance
        password: password,
        firstName: firstName,
        middleName: middleName,
        lastName: lastName,
        email: email,
        phone: phone,
        status: 'Active',
        role: 'guidance', // IMPORTANT: Role identifier
        createdAt: new Date()
    };

    const btn = document.querySelector('#add-guidance-modal .btn-primary');
    const originalText = btn.innerText;
    btn.innerText = "Saving...";
    btn.disabled = true;

    window.db.collection('users').add(newStaff)
        .then(() => {
            alert(`Staff Added Successfully!\n\nID: ${id}\n\nPlease check 'View Profile' for credentials.`);
            closeModal('add-guidance-modal');
            loadGuidanceList(); 
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

function showAddGuidanceModal() {
    document.getElementById('add-guidance-form').reset();
    document.getElementById('email-error').style.display = 'none';
    document.getElementById('phone-error').style.display = 'none';
    document.getElementById('new-id').value = generateGuidanceID();
    document.getElementById('add-guidance-modal').style.display = 'block';
}

function searchGuidance() {
    const input = document.getElementById('search-input').value.toLowerCase();
    const filtered = allGuidance.filter(t => 
        t.firstName.toLowerCase().includes(input) || 
        t.lastName.toLowerCase().includes(input) ||
        t.id.toLowerCase().includes(input)
    );
    renderTable(filtered);
}

function viewGuidanceDetails(docId) {
    const staff = allGuidance.find(t => t.docId === docId);
    if (staff) {
        document.getElementById('view-avatar').innerText = staff.firstName.charAt(0);
        document.getElementById('view-fullname').innerText = staff.fullName;
        document.getElementById('view-id').innerText = staff.id;
        document.getElementById('view-middlename').innerText = staff.middleName || '-';
        document.getElementById('view-phone').innerText = staff.phone;
        document.getElementById('view-email').innerText = staff.email;
        document.getElementById('view-timestamp').innerText = staff.createdAtStr;
        
        currentViewPassword = staff.password || 'Not Set';
        const passField = document.getElementById('view-password');
        const icon = document.getElementById('toggle-password-btn');
        passField.innerText = "********"; 
        icon.className = "fas fa-eye";
        
        document.getElementById('view-status').innerText = staff.status || 'Active';
        document.getElementById('view-guidance-modal').style.display = 'block';
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

function archiveGuidance(docId) {
    if(confirm("Are you sure you want to archive this staff member?")) {
        window.db.collection('users').doc(docId).update({
            status: 'Archived'
        }).then(() => {
            alert("Staff archived.");
            loadGuidanceList();
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