/**
 * guidance.js
 * Manages Guidance Counselors (Role: 'guidance')
 * Features: 
 * - Add Staff (Auto Uppercase, Duplicate Checks)
 * - View Staff (Active & Archived)
 * - Archive/Restore Staff
 * - Permanent Delete
 */

let allGuidance = []; 
let archivedGuidance = []; // Stores archived staff
let currentViewPassword = ""; 

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.db) {
            console.log("Database connected. Fetching guidance staff...");
            loadGuidanceList();
            loadArchivedGuidance(); // Load archives in background
        } else {
            console.error("Firebase DB not initialized.");
        }
    }, 500);

    // Global Click Handler for Modals and Dropdowns
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
    
    // Add input event listeners for validation
    setTimeout(setupInputValidation, 1000);
});

// --- INPUT VALIDATION SETUP ---
function setupInputValidation() {
    // Add event listeners for name fields
    const nameInputs = ['new-firstname', 'new-middlename', 'new-lastname'];
    nameInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', function(e) {
                validateNameInput(this);
            });
            // Visual formatting (Title Case) while typing, but saved as Uppercase
            input.addEventListener('blur', function(e) {
                formatNameInput(this);
            });
        }
    });
    
    // Add event listener for phone field
    const phoneInput = document.getElementById('new-phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            validatePhoneInputRealTime(this);
        });
    }
}

// --- VALIDATION FUNCTIONS ---
function validateNameInput(input) {
    let value = input.value;
    let originalValue = value;
    
    // Allow only letters, spaces, hyphens, and apostrophes
    value = value.replace(/[^A-Za-z\s\-']/g, '');
    
    if (value !== originalValue) {
        input.value = value;
        showInputError(input, 'Letters only');
        return false;
    }
    
    clearInputError(input);
    return true;
}

function formatNameInput(input) {
    // Visual formatting for the UI
    let value = input.value.trim();
    if (value) {
        value = value.toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
            
        input.value = value;
    }
    clearInputError(input);
}

function validatePhoneInputRealTime(input) {
    let value = input.value;
    let originalValue = value;
    
    // Allow only numbers
    value = value.replace(/\D/g, '');
    
    if (value !== originalValue) {
        input.value = value;
        showInputError(input, 'Numbers only');
        return false;
    }
    
    // Limit to 11 digits
    if (value.length > 11) {
        input.value = value.substring(0, 11);
        showInputError(input, 'Maximum 11 digits');
        return false;
    }
    
    clearInputError(input);
    return true;
}

function showInputError(input, message) {
    const errorId = input.id + '-error-realtime';
    let errorElement = document.getElementById(errorId);
    
    if (!errorElement) {
        errorElement = document.createElement('small');
        errorElement.id = errorId;
        errorElement.style.color = '#dc3545';
        errorElement.style.fontSize = '0.8rem';
        errorElement.style.display = 'block';
        errorElement.style.marginTop = '5px';
        input.parentNode.appendChild(errorElement);
    }
    
    errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    errorElement.style.display = 'block';
    input.style.borderColor = '#dc3545';
    
    setTimeout(() => {
        if (input.value.match(/^[A-Za-z\s\-']*$/)) {
            clearInputError(input);
        }
    }, 3000);
}

function clearInputError(input) {
    const errorId = input.id + '-error-realtime';
    const errorElement = document.getElementById(errorId);
    if (errorElement) {
        errorElement.style.display = 'none';
    }
    input.style.borderColor = '#ddd';
}

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

function validateFormFields() {
    let isValid = true;
    
    // Validate names
    const nameInputs = ['new-firstname', 'new-middlename', 'new-lastname'];
    nameInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input && input.value.trim()) {
            const value = input.value.trim();
            if (/[0-9!@#$%^&*()_+=\[\]{};:"\\|,.<>\/?]/.test(value)) {
                showInputError(input, 'Please enter letters only');
                isValid = false;
            }
        }
    });
    
    // Validate phone
    const phoneInput = document.getElementById('new-phone');
    if (phoneInput && phoneInput.value) {
        const phoneValue = phoneInput.value;
        if (!/^\d+$/.test(phoneValue)) {
            showInputError(phoneInput, 'Please enter numbers only');
            isValid = false;
        }
        if (phoneValue.length !== 11) {
            document.getElementById('phone-error').style.display = 'block';
            isValid = false;
        }
    }
    
    if (!validateEmailInput()) isValid = false;
    
    return isValid;
}

// --- GENERATORS ---
function generateGuidanceID() {
    const sequence = Math.floor(100 + Math.random() * 900);
    return `GUID-202630-${sequence}`;
}

function generatePassword() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    for (let i = 0; i < 6; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// --- DUPLICATE CHECKING ---
async function checkForDuplicates(email, phone, firstName, lastName, guidanceId = null) {
    try {
        // 1. Check Email
        const emailQuery = await window.db.collection('users')
            .where('email', '==', email.toLowerCase())
            .where('role', '==', 'guidance')
            .get();
        
        let emailDuplicate = false;
        emailQuery.forEach(doc => {
            if (doc.data().status !== 'Archived') emailDuplicate = true;
        });
        
        // 2. Check Phone
        const phoneQuery = await window.db.collection('users')
            .where('phone', '==', phone)
            .where('role', '==', 'guidance')
            .get();
        
        let phoneDuplicate = false;
        phoneQuery.forEach(doc => {
            if (doc.data().status !== 'Archived') phoneDuplicate = true;
        });

        // 3. Check ID
        let idDuplicate = false;
        if (guidanceId) {
            const idQuery = await window.db.collection('users')
                .where('guidanceId', '==', guidanceId)
                .where('role', '==', 'guidance')
                .get();
            
            idQuery.forEach(doc => {
                if (doc.data().status !== 'Archived') idDuplicate = true;
            });
        }

        // 4. Check Name (First + Last)
        const nameQuery = await window.db.collection('users')
            .where('firstName', '==', firstName) 
            .where('lastName', '==', lastName) 
            .where('role', '==', 'guidance')
            .get();

        let nameDuplicate = false;
        nameQuery.forEach(doc => {
            if (doc.data().status !== 'Archived') nameDuplicate = true;
        });
        
        return { 
            email: emailDuplicate, 
            phone: phoneDuplicate, 
            id: idDuplicate, 
            name: nameDuplicate 
        };

    } catch (error) {
        console.error("Error checking duplicates:", error);
        return { email: false, phone: false, id: false, name: false };
    }
}

// 1. FETCH ACTIVE GUIDANCE STAFF
function loadGuidanceList() {
    const tableBody = document.getElementById('guidance-list-body');
    if(allGuidance.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="loading-cell">Loading personnel...</td></tr>';
    }

    window.db.collection('users')
        .where('role', '==', 'guidance')
        .where('status', '==', 'Active')
        .get()
        .then((querySnapshot) => {
            allGuidance = [];
            if (querySnapshot.empty) {
                tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No active guidance staff found.</td></tr>';
                return;
            }

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const fullName = `${data.firstName} ${data.lastName}`;
                
                let createdStr = "N/A";
                if (data.createdAt && data.createdAt.toDate) {
                    createdStr = data.createdAt.toDate().toLocaleDateString() + ' ' + data.createdAt.toDate().toLocaleTimeString();
                } else if (data.createdAt) {
                    createdStr = new Date(data.createdAt).toLocaleDateString();
                }

                allGuidance.push({
                    docId: doc.id, 
                    id: data.guidanceId || 'N/A',
                    firstName: data.firstName || '',
                    middleName: data.middleName || '',
                    lastName: data.lastName || '',
                    fullName: fullName,
                    email: data.email || '',
                    phone: data.phone || 'N/A', 
                    status: data.status || 'Active',
                    password: data.password || '******',
                    createdAtStr: createdStr,
                    archivedAt: data.archivedAt || null
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
async function addNewGuidance() {
    const id = document.getElementById('new-id').value;
    
    let firstNameRaw = document.getElementById('new-firstname').value.trim();
    let middleNameRaw = document.getElementById('new-middlename').value.trim();
    let lastNameRaw = document.getElementById('new-lastname').value.trim();
    const email = document.getElementById('new-email').value.trim();
    const phone = document.getElementById('new-phone').value.trim();

    if(!id || !firstNameRaw || !lastNameRaw || !email || !phone) {
        alert("Please fill in all required fields.");
        return;
    }

    if (/[0-9]/.test(firstNameRaw) || /[0-9]/.test(middleNameRaw) || /[0-9]/.test(lastNameRaw)) {
        alert("Name fields cannot contain numbers.");
        return;
    }

    if (!validateFormFields()) {
        alert("Please correct the errors in the form before submitting.");
        return;
    }

    // SAVE AS UPPERCASE
    const firstName = firstNameRaw.toUpperCase();
    const middleName = middleNameRaw.toUpperCase();
    const lastName = lastNameRaw.toUpperCase();

    const duplicates = await checkForDuplicates(email, phone, firstName, lastName, id);
    
    let errorMessages = [];
    if (duplicates.name) errorMessages.push(`The name "${firstName} ${lastName}" already exists.`);
    if (duplicates.email) {
        errorMessages.push(`The email "${email}" is already taken.`);
        document.getElementById('email-error').style.display = 'block';
    }
    if (duplicates.phone) {
        errorMessages.push(`The phone number "${phone}" is already taken.`);
        document.getElementById('phone-error').style.display = 'block';
    }
    if (duplicates.id) errorMessages.push(`The ID "${id}" already exists.`);

    if (errorMessages.length > 0) {
        alert("Unable to save staff:\n\n" + errorMessages.join("\n"));
        return;
    }

    const password = generatePassword(); 

    const newStaff = {
        guidanceId: id,
        password: password,
        firstName: firstName,
        middleName: middleName,
        lastName: lastName,
        email: email.toLowerCase(),
        phone: phone,
        status: 'Active',
        role: 'guidance',
        createdAt: new Date(),
        archivedAt: null
    };

    const btn = document.querySelector('#add-guidance-modal .btn-primary');
    const originalText = btn.innerText;
    btn.innerText = "Saving...";
    btn.disabled = true;

    window.db.collection('users').add(newStaff)
        .then(() => {
            alert(`Staff Added Successfully!\n\nID: ${id}\nPassword: ${password}\n\nPlease share these credentials.`);
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

// --- ARCHIVE MANAGEMENT ---

// A. Load Archived Data
function loadArchivedGuidance() {
    window.db.collection('users')
        .where('role', '==', 'guidance')
        .where('status', '==', 'Archived')
        .get()
        .then((querySnapshot) => {
            archivedGuidance = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const fullName = `${data.firstName} ${data.lastName}`;
                
                let archivedStr = "N/A";
                if (data.archivedAt && data.archivedAt.toDate) {
                    archivedStr = data.archivedAt.toDate().toLocaleDateString() + ' ' + data.archivedAt.toDate().toLocaleTimeString();
                } else if (data.archivedAt) {
                    archivedStr = new Date(data.archivedAt).toLocaleDateString();
                }

                archivedGuidance.push({
                    docId: doc.id,
                    id: data.guidanceId || 'N/A',
                    fullName: fullName,
                    firstName: data.firstName || '',
                    middleName: data.middleName || '',
                    lastName: data.lastName || '',
                    email: data.email || '',
                    phone: data.phone || 'N/A',
                    password: data.password || '******',
                    archivedAt: data.archivedAt,
                    archivedAtStr: archivedStr,
                    createdAtStr: archivedStr // Fallback for view
                });
            });
            // If modal is currently open, refresh it
            const modal = document.getElementById('archive-guidance-modal');
            if(modal.style.display === 'block') {
                showArchivedModal();
            }
        })
        .catch((error) => {
            console.error("Error loading archived staff:", error);
        });
}

// B. Show Archived Modal
function showArchivedModal() {
    const modal = document.getElementById('archive-guidance-modal');
    const listBody = document.getElementById('archived-list-body');
    
    listBody.innerHTML = '';
    
    if (archivedGuidance.length === 0) {
        listBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">No archived staff found.</td></tr>';
    } else {
        archivedGuidance.forEach(staff => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${staff.id}</strong></td>
                <td>${staff.fullName}</td>
                <td>${staff.email}</td>
                <td>${staff.phone}</td>
                <td>${staff.archivedAtStr}</td>
                <td style="text-align: right;">
                    <div style="display: flex; gap: 8px; justify-content: flex-end;">
                        <button onclick="viewGuidanceDetails('${staff.docId}')" title="View Details" 
                                style="background: #17a2b8; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-eye"></i>
                        </button>
                        
                        <button onclick="restoreGuidance('${staff.docId}')" title="Restore" 
                                style="background: #28a745; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-undo"></i>
                        </button>
                        
                        <button onclick="deleteGuidancePermanent('${staff.docId}')" title="Delete Permanently" 
                                style="background: #dc3545; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            listBody.appendChild(row);
        });
    }
    
    modal.style.display = 'block';
}

// C. Archive Staff
function archiveGuidance(docId) {
    if(confirm("Are you sure you want to archive this staff member?\n\nArchived staff will be moved to the Archive section.")) {
        const archiveData = {
            status: 'Archived',
            archivedAt: new Date()
        };
        
        window.db.collection('users').doc(docId).update(archiveData)
        .then(() => {
            alert("Staff archived successfully.");
            loadGuidanceList();
            loadArchivedGuidance();
        })
        .catch(err => {
            console.error("Error archiving staff:", err);
            alert("Error: " + err.message);
        });
    }
}

// D. Restore Staff
function restoreGuidance(docId) {
    if(confirm("Are you sure you want to restore this staff member?\n\nThey will be moved back to the active staff list.")) {
        const restoreData = {
            status: 'Active',
            archivedAt: null
        };
        
        window.db.collection('users').doc(docId).update(restoreData)
        .then(() => {
            alert("Staff restored successfully.");
            loadGuidanceList();
            loadArchivedGuidance();
        })
        .catch(err => {
            console.error("Error restoring staff:", err);
            alert("Error: " + err.message);
        });
    }
}

// E. Delete Permanent
function deleteGuidancePermanent(docId) {
    if(confirm("WARNING: This action cannot be undone!\n\nAre you sure you want to PERMANENTLY DELETE this staff member from the database?")) {
        window.db.collection('users').doc(docId).delete()
        .then(() => {
            alert("Staff member permanently deleted.");
            loadArchivedGuidance(); // Refresh list
        })
        .catch((error) => {
            console.error("Error removing document: ", error);
            alert("Error deleting staff: " + error.message);
        });
    }
}

// --- UI HELPERS ---

function showAddGuidanceModal() {
    document.getElementById('add-guidance-form').reset();
    document.getElementById('email-error').style.display = 'none';
    document.getElementById('phone-error').style.display = 'none';
    
    const idError = document.getElementById('id-error');
    if (idError) idError.style.display = 'none';
    
    const errorElements = document.querySelectorAll('[id$="-error-realtime"]');
    errorElements.forEach(el => el.style.display = 'none');
    
    const inputs = document.querySelectorAll('#add-guidance-form input');
    inputs.forEach(input => {
        input.style.borderColor = '#ddd';
    });
    
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

// UPDATED: Works for both Active and Archived lists
function viewGuidanceDetails(docId) {
    // Try finding in Active list first, then Archived list
    let staff = allGuidance.find(t => t.docId === docId);
    if (!staff) {
        staff = archivedGuidance.find(t => t.docId === docId);
    }

    if (staff) {
        document.getElementById('view-avatar').innerText = staff.firstName.charAt(0);
        document.getElementById('view-fullname').innerText = staff.fullName;
        document.getElementById('view-id').innerText = staff.id;
        document.getElementById('view-middlename').innerText = staff.middleName || '-';
        document.getElementById('view-phone').innerText = staff.phone;
        document.getElementById('view-email').innerText = staff.email;
        document.getElementById('view-timestamp').innerText = staff.createdAtStr || staff.archivedAtStr;
        
        currentViewPassword = staff.password || 'Not Set';
        const passField = document.getElementById('view-password');
        const icon = document.getElementById('toggle-password-btn');
        passField.innerText = "********"; 
        icon.className = "fas fa-eye";
        
        const statusText = staff.status || (staff.archivedAt ? 'Archived' : 'Active');
        document.getElementById('view-status').innerText = statusText;

        const viewModal = document.getElementById('view-guidance-modal');
        // VITAL: Ensure this modal is on top of archive modal
        viewModal.style.zIndex = "2000"; 
        viewModal.style.display = 'block';
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