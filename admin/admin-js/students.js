/**
 * students.js
 * Single Account Model: Parents log in via Student Account.
 * Parent details are stored INSIDE the student document.
 * UPDATED: Renamed 'studentId' to 'userId' for the data model.
 * UPDATED: Added duplicate prevention, edit functionality, and archive support.
 */

// ==========================================
// 1. GLOBAL SCOPE EXPORTS
// ==========================================
window.toggleDropdown = toggleDropdown;
window.toggleActionMenu = toggleActionMenu;
window.viewStudentDetails = viewStudentDetails;
window.editStudent = editStudent;
window.deleteStudent = deleteStudent;
window.restoreStudent = restoreStudent;
window.permanentlyDeleteStudent = permanentlyDeleteStudent;
window.searchStudents = searchStudents;
window.showAddStudentModal = showAddStudentModal;
window.showBulkUploadModal = showBulkUploadModal;
window.closeModal = closeModal;
window.addNewStudent = addNewStudent;
window.updateStudent = updateStudent;
window.processBulkUpload = processBulkUpload;
window.downloadTemplate = downloadTemplate;
window.togglePasswordView = togglePasswordView;

// ==========================================
// 2. VARIABLES & INITIALIZATION
// ==========================================
let allStudents = []; 
let archivedStudents = [];
let currentViewPassword = "";
let latestLocalId = 0; 
let isArchiveView = false;

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
        if (event.target.classList.contains('.modal')) {
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

function loadStudents(archiveMode = false) {
    const tableBody = document.getElementById('students-list-body');
    if(!tableBody) return;

    isArchiveView = archiveMode;
    const collection = archiveMode ? 'archived_users' : 'users';
    
    // Update UI title based on mode
    const titleElement = document.querySelector('.content-section h2');
    if (titleElement) {
        titleElement.textContent = archiveMode ? 'Archived Students' : 'Enrolled Students';
    }

    window.db.collection(collection)
        .where('role', '==', 'student')
        .get()
        .then((querySnapshot) => {
            if (archiveMode) {
                archivedStudents = [];
            } else {
                allStudents = [];
            }
            
            if (querySnapshot.empty) {
                tableBody.innerHTML = '<tr><td colspan="' + (archiveMode ? '7' : '6') + '" style="text-align:center;">' + (archiveMode ? 'No archived students found.' : 'No students found.') + '</td></tr>';
                return;
            }

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                
                // Compatibility: Check userId first, fallback to studentId if old data exists
                const dbId = data.userId || data.studentId;

                if (dbId && !isNaN(dbId)) {
                    const currentIdNum = parseInt(dbId);
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

                const studentData = {
                    docId: doc.id,
                    userId: dbId || 'N/A',
                    lrn: data.lrn || 'N/A',            
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    fullName: `${data.firstName || ''} ${data.lastName || ''}`,
                    
                    // Student Fields
                    email: data.email || 'N/A',
                    phone: data.phone || 'N/A', 
                    
                    // Parent Fields
                    parentFirstName: pFName,
                    parentMiddleName: data.parentMiddleName || '',
                    parentLastName: pLName,
                    parentFullName: parentFullName,
                    parentEmail: data.parentEmail || 'N/A',
                    parentContact: data.parentContact || 'N/A', 
                    
                    password: data.password || '******',
                    createdAt: createdStr,
                    archivedAt: data.archivedAt || null
                };

                if (archiveMode) {
                    archivedStudents.push(studentData);
                } else {
                    allStudents.push(studentData);
                }
            });
            
            // Sort by userId
            const dataToSort = archiveMode ? archivedStudents : allStudents;
            dataToSort.sort((a, b) => a.userId.localeCompare(b.userId, undefined, { numeric: true }));
            renderTable(dataToSort, archiveMode);
        })
        .catch((error) => {
            console.error("Error:", error);
            tableBody.innerHTML = `<tr><td colspan="${archiveMode ? '7' : '6'}" style="text-align:center; color:red;">Error: ${error.message}</td></tr>`;
        });
}

function renderTable(data, isArchive = false) {
    const tableBody = document.getElementById('students-list-body');
    tableBody.innerHTML = '';

    if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="${isArchive ? '7' : '6'}" style="text-align:center;">No matches found.</td></tr>`;
        return;
    }

    data.forEach(student => {
        const row = document.createElement('tr');
        
        // Add archived date column for archive view
        if (isArchive) {
            row.innerHTML = `
                <td><strong>${student.userId}</strong></td>
                <td>${student.lrn}</td>
                <td>${student.fullName}</td>
                <td>${student.parentFullName}</td>
                <td>${student.parentContact}</td>
                <td>${student.archivedAt ? new Date(student.archivedAt.seconds * 1000).toLocaleDateString() : 'N/A'}</td>
                <td style="text-align: right; overflow: visible;">
                    <div class="action-menu-container" style="position:relative;">
                        <button class="btn-icon" onclick="toggleActionMenu('menu-${student.docId}')">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <div id="menu-${student.docId}" class="action-dropdown" style="display:none; position:absolute; right:0; z-index:9999; background:white; border:1px solid #ccc; border-radius:4px; box-shadow:0 2px 5px rgba(0,0,0,0.2); min-width:160px; text-align:left;">
                            <div onclick="viewStudentDetails('${student.docId}', true)" style="padding:10px; cursor:pointer; border-bottom:1px solid #eee;">
                                <i class="fas fa-eye" style="color:#6c757d"></i> View Profile
                            </div>
                            <div onclick="restoreStudent('${student.docId}')" style="padding:10px; cursor:pointer; border-bottom:1px solid #eee; color:#28a745;">
                                <i class="fas fa-undo"></i> Restore
                            </div>
                            <div onclick="permanentlyDeleteStudent('${student.docId}')" style="padding:10px; cursor:pointer; color:#dc3545;">
                                <i class="fas fa-trash"></i> Delete Permanently
                            </div>
                        </div>
                    </div>
                </td>
            `;
        } else {
            // ORIGINAL with Edit button added
            row.innerHTML = `
                <td><strong>${student.userId}</strong></td>
                <td>${student.lrn}</td>
                <td>${student.fullName}</td>
                <td>${student.parentFullName}</td>
                <td>${student.parentContact}</td>
                <td style="text-align: right; overflow: visible;">
                    <div class="action-menu-container" style="position:relative;">
                        <button class="btn-icon" onclick="toggleActionMenu('menu-${student.docId}')">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <div id="menu-${student.docId}" class="action-dropdown" style="display:none; position:absolute; right:0; z-index:9999; background:white; border:1px solid #ccc; border-radius:4px; box-shadow:0 2px 5px rgba(0,0,0,0.2); min-width:160px; text-align:left;">
                            <div onclick="viewStudentDetails('${student.docId}')" style="padding:10px; cursor:pointer; border-bottom:1px solid #eee;">
                                <i class="fas fa-eye" style="color:#6c757d"></i> View Profile
                            </div>
                            <div onclick="editStudent('${student.docId}')" style="padding:10px; cursor:pointer; border-bottom:1px solid #eee; color:#17a2b8;">
                                <i class="fas fa-edit"></i> Edit
                            </div>
                            <div onclick="deleteStudent('${student.docId}')" style="padding:10px; cursor:pointer; color:#dc3545;">
                                <i class="fas fa-trash"></i> Remove
                            </div>
                        </div>
                    </div>
                </td>
            `;
        }
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
    const dataToSearch = isArchiveView ? archivedStudents : allStudents;
    
    const filtered = dataToSearch.filter(s => {
        const textMatch = s.fullName.toLowerCase().includes(term) || 
                          s.userId.includes(term) ||
                          s.lrn.includes(term) ||
                          s.parentFirstName.toLowerCase().includes(term) ||
                          s.parentMiddleName.toLowerCase().includes(term) ||
                          s.parentLastName.toLowerCase().includes(term) ||
                          s.parentContact.includes(term) ||
                          s.phone.includes(term); 
        return textMatch;
    });
    renderTable(filtered, isArchiveView);
}

// ==========================================
// 4. STUDENT DETAILS & MODALS
// ==========================================

function viewStudentDetails(docId, fromArchive = false) {
    const dataArray = fromArchive ? archivedStudents : allStudents;
    const student = dataArray.find(s => s.docId === docId);
    if (!student) return;

    const avatarEl = document.getElementById('view-avatar');
    if (avatarEl) {
        avatarEl.innerText = student.firstName.charAt(0);
    }
    
    document.getElementById('view-fullname').innerText = student.fullName;
    document.getElementById('view-id').innerText = student.userId;
    document.getElementById('view-lrn').innerText = student.lrn;
    
    document.getElementById('view-email').innerText = student.email;
    document.getElementById('view-student-phone').innerText = student.phone; 
    
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
            const nextId = await generateNextUserId();
            idField.value = nextId; 
        } catch (error) {
            idField.value = "Error"; 
        }
    }
}

// NEW: Edit Student Function
function editStudent(docId) {
    const student = allStudents.find(s => s.docId === docId);
    if (!student) return;

    // Populate the edit form
    document.getElementById('edit-student-id').value = student.userId;
    document.getElementById('edit-doc-id').value = student.docId;
    document.getElementById('edit-lrn').value = student.lrn;
    document.getElementById('edit-firstname').value = student.firstName;
    document.getElementById('edit-middlename').value = student.middleName || '';
    document.getElementById('edit-lastname').value = student.lastName;
    document.getElementById('edit-email').value = student.email;
    document.getElementById('edit-student-phone').value = student.phone;
    document.getElementById('edit-parent-firstname').value = student.parentFirstName;
    document.getElementById('edit-parent-middlename').value = student.parentMiddleName;
    document.getElementById('edit-parent-lastname').value = student.parentLastName;
    document.getElementById('edit-parent-email').value = student.parentEmail;
    document.getElementById('edit-parent-contact').value = student.parentContact;
    
    document.getElementById('edit-student-modal').style.display = 'block';
}

// NEW: Update Student Function
async function updateStudent() {
    const docId = document.getElementById('edit-doc-id').value;
    const lrn = document.getElementById('edit-lrn').value;
    const firstName = document.getElementById('edit-firstname').value;
    const lastName = document.getElementById('edit-lastname').value;
    const email = document.getElementById('edit-email').value;
    const studentPhone = document.getElementById('edit-student-phone').value;
    
    const parentFirstName = document.getElementById('edit-parent-firstname').value;
    const parentMiddleName = document.getElementById('edit-parent-middlename').value;
    const parentLastName = document.getElementById('edit-parent-lastname').value;
    const parentEmail = document.getElementById('edit-parent-email').value;
    const parentContact = document.getElementById('edit-parent-contact').value;
    
    // Check for duplicates (excluding current student)
    const duplicateCheck = await checkForDuplicates(email, lrn, docId);
    if (duplicateCheck.exists) {
        alert(`Error: ${duplicateCheck.field} already exists!`);
        return;
    }

    const updatedData = {
        lrn: lrn,
        firstName: firstName,
        middleName: document.getElementById('edit-middlename').value,
        lastName: lastName,
        email: email,
        phone: studentPhone,
        
        parentFirstName: parentFirstName,
        parentMiddleName: parentMiddleName,
        parentLastName: parentLastName,
        parentEmail: parentEmail,
        parentContact: parentContact,
        
        updatedAt: new Date()
    };

    try {
        await window.db.collection('users').doc(docId).update(updatedData);
        alert("Student updated successfully!");
        closeModal('edit-student-modal');
        loadStudents();
    } catch(err) {
        alert("Error: " + err.message);
    }
}

// ==========================================
// 5. CRUD: ADD (Single Account Only) - ENHANCED DUPLICATE PREVENTION
// ==========================================

async function addNewStudent() {
    const lrn = document.getElementById('new-lrn').value.trim();
    const firstName = document.getElementById('new-firstname').value.trim();
    const lastName = document.getElementById('new-lastname').value.trim();
    const email = document.getElementById('new-email').value.trim().toLowerCase();
    const studentPhone = document.getElementById('new-student-phone').value.trim();
    
    // Parent Data
    const parentFirstName = document.getElementById('new-parent-firstname').value.trim();
    const parentMiddleName = document.getElementById('new-parent-middlename').value.trim();
    const parentLastName = document.getElementById('new-parent-lastname').value.trim();
    const parentEmail = document.getElementById('new-parent-email').value.trim().toLowerCase();
    const parentContact = document.getElementById('new-parent-contact').value.trim();
    
    const userId = document.getElementById('new-student-id').value;
    
    // Validation
    if (!firstName || !lastName || !email) {
        alert("Error: First Name, Last Name, and Email are required!");
        return;
    }

    // ENHANCED DUPLICATE CHECK - Check multiple fields
    const duplicateCheck = await checkForDuplicatesEnhanced(email, lrn, studentPhone, parentEmail, parentContact);
    
    if (duplicateCheck.exists) {
        let errorMessage = `Error: Duplicate entry found!\n`;
        if (duplicateCheck.emailDuplicate) errorMessage += `• Email "${email}" already exists\n`;
        if (duplicateCheck.lrnDuplicate) errorMessage += `• LRN "${lrn}" already exists\n`;
        if (duplicateCheck.phoneDuplicate) errorMessage += `• Student Phone "${studentPhone}" already exists\n`;
        if (duplicateCheck.parentEmailDuplicate) errorMessage += `• Parent Email "${parentEmail}" already exists\n`;
        if (duplicateCheck.parentContactDuplicate) errorMessage += `• Parent Contact "${parentContact}" already exists\n`;
        
        alert(errorMessage);
        return;
    }
    
    // Create ONE document (Student) with parent info embedded
    const newStudent = {
        userId: userId,
        lrn: lrn,
        firstName: firstName,
        middleName: document.getElementById('new-middlename').value.trim(),
        lastName: lastName,
        email: email,
        phone: studentPhone,
        
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

    // try {
    //     await window.db.collection('users').add(newStudent);
    //     console.log("Student account created:", userId);

    //     latestLocalId = parseInt(userId); 
    //     alert("Student Added Successfully!");
    //     closeModal('add-student-modal');
    //     loadStudents();
    // } catch(err) {
    //     alert("Error: " + err.message);
    // }
    try {
    // Step 1: Save to Firebase
   
   await window.db.collection('users').add(newStudent)
   latestLocalId = parseInt(userId); 
    
    // Step 2: Try to send email
    const emailResult = await sendGuidanceCredentials({
      email: email,
      id: id,
      password: password,
      firstName: firstName,
      lastName: lastName
    });
    
    if (emailResult.success) {
      alert(`Student Added Successfully!\n\nID: ${id}\nPassword: ${password}\n\nCredentials have been sent to: ${email}`);
    } else {
      alert(`Student Added Successfully!\n\nID: ${id}\nPassword: ${password}\n\nBUT email failed to send: ${emailResult.message}\n\nPlease provide these credentials manually to the student.`);
    }
    
    // Close modal and refresh
    closeModal("add-student-modal");
    loadStudents();
    
  } catch (error) {
    console.error("Error:", error);
    
    // Check if it's a Firebase error
    if (error.message && error.message.includes("Firebase")) {
      alert("Error saving to database: " + error.message);
    } else {
      alert("Unexpected error: " + error.message);
    }
  } finally {
    btn.innerText = originalText;
    btn.disabled = false;
  }
}
// 4. SEND EMAIL FUNCTION - FIXED PATH
async function sendGuidanceCredentials(guidanceData) {
  try {
    console.log('Attempting to send email...');
    
    // Try different possible paths
    const possiblePaths = [
      'send-student-credentials.php',
      './send-student-credentials.php',
      'admin-js/send-student-credentials.php',
      '/admin/admin-js/send-student-credentials.php'
    ];
    
    let response;
    let successfulPath;
    
    // Try each path until one works
    for (const path of possiblePaths) {
      try {
        console.log('Trying path:', path);
        response = await fetch(path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(guidanceData),
          mode: 'cors'
        });
        
        if (response.ok) {
          successfulPath = path;
          console.log('Success with path:', path);
          break;
        } else if (response.status !== 404) {
          // If it's not 404, we found the file but it has an error
          successfulPath = path;
          break;
        }
      } catch (err) {
        console.log('Failed with path', path, ':', err.message);
      }
    }
    
    if (!response) {
      throw new Error('Could not find email endpoint. All paths failed.');
    }
    
    console.log('Response status:', response.status);
    
    const text = await response.text();
    console.log('Response text:', text.substring(0, 200));
    
    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      throw new Error('Server returned invalid JSON: ' + text.substring(0, 100));
    }
    
    if (!result.success) {
      throw new Error(result.message || 'Email sending failed');
    }
    
    return result;
    
  } catch (error) {
    console.error('Email error:', error);
    return {
      success: false,
      message: error.message,
      credentials: {
        id: guidanceData.id,
        password: guidanceData.password
      }
    };
  }
}
async function deleteStudent(docId) {
    if(confirm("Are you sure you want to archive this student? They will be moved to the Archive Menu.")) {
        try {
            // Get the student data
            const studentDoc = await window.db.collection('users').doc(docId).get();
            const studentData = studentDoc.data();
            
            // Add to archived collection
            studentData.archivedAt = new Date();
            await window.db.collection('archived_users').add(studentData);
            
            // Remove from active collection
            await window.db.collection('users').doc(docId).delete();
            
            alert("Student archived successfully.");
            loadStudents();
        } catch (error) {
            alert("Error: " + error.message);
        }
    }
}

// NEW: Restore Student Function
async function restoreStudent(docId) {
    if(confirm("Are you sure you want to restore this student?")) {
        try {
            // Get the archived student data
            const studentDoc = await window.db.collection('archived_users').doc(docId).get();
            const studentData = studentDoc.data();
            
            // Check for duplicates before restoring
            const duplicateCheck = await checkForDuplicatesEnhanced(
                studentData.email, 
                studentData.lrn, 
                studentData.phone, 
                studentData.parentEmail, 
                studentData.parentContact
            );
            
            if (duplicateCheck.exists) {
                let errorMessage = `Cannot restore: Duplicate entry found!\n`;
                if (duplicateCheck.emailDuplicate) errorMessage += `• Email "${studentData.email}" already exists\n`;
                if (duplicateCheck.lrnDuplicate) errorMessage += `• LRN "${studentData.lrn}" already exists\n`;
                if (duplicateCheck.phoneDuplicate) errorMessage += `• Student Phone "${studentData.phone}" already exists\n`;
                if (duplicateCheck.parentEmailDuplicate) errorMessage += `• Parent Email "${studentData.parentEmail}" already exists\n`;
                if (duplicateCheck.parentContactDuplicate) errorMessage += `• Parent Contact "${studentData.parentContact}" already exists\n`;
                
                alert(errorMessage);
                return;
            }
            
            // Remove archivedAt field
            delete studentData.archivedAt;
            
            // Add back to active collection
            await window.db.collection('users').add(studentData);
            
            // Remove from archived collection
            await window.db.collection('archived_users').doc(docId).delete();
            
            alert("Student restored successfully.");
            loadStudents(true);
        } catch (error) {
            alert("Error: " + error.message);
        }
    }
}

// NEW: Permanently Delete Student Function
async function permanentlyDeleteStudent(docId) {
    if(confirm("Are you sure you want to permanently delete this student? This action cannot be undone.")) {
        try {
            await window.db.collection('archived_users').doc(docId).delete();
            alert("Student permanently deleted.");
            loadStudents(true);
        } catch (error) {
            alert("Error: " + error.message);
        }
    }
}

// ==========================================
// 6. HELPER FUNCTIONS - ENHANCED DUPLICATE CHECKING
// ==========================================

// ENHANCED: Comprehensive duplicate check function
async function checkForDuplicatesEnhanced(email, lrn, phone, parentEmail, parentContact, excludeDocId = null) {
    try {
        const results = {
            exists: false,
            emailDuplicate: false,
            lrnDuplicate: false,
            phoneDuplicate: false,
            parentEmailDuplicate: false,
            parentContactDuplicate: false
        };

        // Check email duplicates
        if (email) {
            const emailQuery = await window.db.collection('users')
                .where('email', '==', email)
                .get();
            
            if (!emailQuery.empty) {
                if (excludeDocId) {
                    const isSameDoc = emailQuery.docs.some(doc => doc.id === excludeDocId);
                    if (!isSameDoc) {
                        results.exists = true;
                        results.emailDuplicate = true;
                    }
                } else {
                    results.exists = true;
                    results.emailDuplicate = true;
                }
            }
        }
        
        // Check LRN duplicates (if provided)
        if (lrn && lrn.trim() !== '') {
            const lrnQuery = await window.db.collection('users')
                .where('lrn', '==', lrn)
                .get();
            
            if (!lrnQuery.empty) {
                if (excludeDocId) {
                    const isSameDoc = lrnQuery.docs.some(doc => doc.id === excludeDocId);
                    if (!isSameDoc) {
                        results.exists = true;
                        results.lrnDuplicate = true;
                    }
                } else {
                    results.exists = true;
                    results.lrnDuplicate = true;
                }
            }
        }
        
        // Check student phone duplicates (if provided)
        if (phone && phone.trim() !== '') {
            const phoneQuery = await window.db.collection('users')
                .where('phone', '==', phone)
                .get();
            
            if (!phoneQuery.empty) {
                if (excludeDocId) {
                    const isSameDoc = phoneQuery.docs.some(doc => doc.id === excludeDocId);
                    if (!isSameDoc) {
                        results.exists = true;
                        results.phoneDuplicate = true;
                    }
                } else {
                    results.exists = true;
                    results.phoneDuplicate = true;
                }
            }
        }
        
        // Check parent email duplicates (if provided)
        if (parentEmail && parentEmail.trim() !== '') {
            const parentEmailQuery = await window.db.collection('users')
                .where('parentEmail', '==', parentEmail)
                .get();
            
            if (!parentEmailQuery.empty) {
                if (excludeDocId) {
                    const isSameDoc = parentEmailQuery.docs.some(doc => doc.id === excludeDocId);
                    if (!isSameDoc) {
                        results.exists = true;
                        results.parentEmailDuplicate = true;
                    }
                } else {
                    results.exists = true;
                    results.parentEmailDuplicate = true;
                }
            }
        }
        
        // Check parent contact duplicates (if provided)
        if (parentContact && parentContact.trim() !== '') {
            const parentContactQuery = await window.db.collection('users')
                .where('parentContact', '==', parentContact)
                .get();
            
            if (!parentContactQuery.empty) {
                if (excludeDocId) {
                    const isSameDoc = parentContactQuery.docs.some(doc => doc.id === excludeDocId);
                    if (!isSameDoc) {
                        results.exists = true;
                        results.parentContactDuplicate = true;
                    }
                } else {
                    results.exists = true;
                    results.parentContactDuplicate = true;
                }
            }
        }
        
        return results;
    } catch (error) {
        console.error("Error checking duplicates:", error);
        return {
            exists: false,
            emailDuplicate: false,
            lrnDuplicate: false,
            phoneDuplicate: false,
            parentEmailDuplicate: false,
            parentContactDuplicate: false
        };
    }
}

// Original duplicate check for backward compatibility
async function checkForDuplicates(email, lrn, excludeDocId = null) {
    const result = await checkForDuplicatesEnhanced(email, lrn, '', '', '', excludeDocId);
    return {
        exists: result.exists,
        field: result.emailDuplicate ? "Email" : result.lrnDuplicate ? "LRN" : ""
    };
}

async function generateNextUserId() {
    const currentYear = new Date().getFullYear(); 
    let dbHighestId = 0;
    try {
        const snapshot = await window.db.collection('users')
            .where('role', '==', 'student')
            .orderBy('userId', 'desc')
            .limit(1)
            .get();
        if (!snapshot.empty) {
            const data = snapshot.docs[0].data();
            const lastId = data.userId || data.studentId;
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
// 7. BULK UPLOAD LOGIC - ENHANCED DUPLICATE PREVENTION
// ==========================================

function showBulkUploadModal() {
    document.getElementById('bulk-upload-modal').style.display = 'block';
    document.getElementById('bulk-file-input').value = ""; 
    document.getElementById('upload-status').style.display = 'none'; 
    document.getElementById('upload-logs').innerHTML = "";
}

function downloadTemplate() {
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

            logsDiv.innerHTML += `<div>Found ${jsonData.length} rows. Checking for duplicates...</div>`;

            let currentIdString = await generateNextUserId();
            let currentIdNum = parseInt(currentIdString); 
            
            let successCount = 0;
            let failCount = 0;
            let duplicateCount = 0;
            let skippedCount = 0;
            
            // Create a map to track duplicates within the file itself
            const fileDuplicates = new Map();
            
            for (let i = 0; i < jsonData.length; i++) {
                const row = jsonData[i];

                const fName = row["First Name"] || row["firstname"] || row["Firstname"];
                const lName = row["Lastname"] || row["lastname"] || row["Last Name"];
                const email = (row["email"] || row["Email"] || "").toString().toLowerCase().trim();
                const lrn = String(row["LRN"] || row["lrn"] || "").trim();
                const phone = String(row["Student Phone"] || row["student phone"] || row["Phone"] || "").trim();
                const pFName = row["Parent First Name"] || row["Parent Firstname"] || row["parent first name"] || row["Parent FName"] || "";
                const parentEmail = (row["Parent Email"] || row["parent email"] || "").toString().toLowerCase().trim();
                const parentContact = String(row["Parent Contact"] || row["parent contact"] || "").trim();
                
                // Check for required fields
                if(!fName || !lName || !email) {
                    logsDiv.innerHTML += `<div style='color:orange;'>Row ${i+1}: Skipped (Missing required fields)</div>`;
                    skippedCount++;
                    continue;
                }

                // Check for duplicates within the file
                const rowKey = `${email}_${lrn}_${phone}_${parentEmail}_${parentContact}`;
                if (fileDuplicates.has(rowKey)) {
                    logsDiv.innerHTML += `<div style='color:orange;'>Row ${i+1}: Skipped (Duplicate within file)</div>`;
                    duplicateCount++;
                    continue;
                }
                fileDuplicates.set(rowKey, true);

                // ENHANCED: Check for duplicates in database with multiple fields
                const duplicateCheck = await checkForDuplicatesEnhanced(
                    email, 
                    lrn, 
                    phone, 
                    parentEmail, 
                    parentContact
                );
                
                if (duplicateCheck.exists) {
                    let duplicateFields = [];
                    if (duplicateCheck.emailDuplicate) duplicateFields.push("Email");
                    if (duplicateCheck.lrnDuplicate) duplicateFields.push("LRN");
                    if (duplicateCheck.phoneDuplicate) duplicateFields.push("Phone");
                    if (duplicateCheck.parentEmailDuplicate) duplicateFields.push("Parent Email");
                    if (duplicateCheck.parentContactDuplicate) duplicateFields.push("Parent Contact");
                    
                    logsDiv.innerHTML += `<div style='color:orange;'>Row ${i+1}: Skipped (Duplicate: ${duplicateFields.join(", ")})</div>`;
                    duplicateCount++;
                    continue;
                }

                const userId = currentIdNum.toString();
                const newStudent = {
                    userId: userId,
                    firstName: fName,
                    lastName: lName,
                    middleName: row["Middle name"] || row["middlename"] || "",
                    email: email,
                    phone: phone,
                    lrn: lrn,
                    
                    // Embedded Parent Info
                    parentFirstName: pFName,
                    parentMiddleName: row["Parent Middle Name"] || row["Parent Middle Name"] || row["parent middle name"] || row["Parent MName"] || "",
                    parentLastName: row["Parent Last Name"] || row["Parent Lastname"] || row["parent last name"] || row["Parent LName"] || "",
                    parentEmail: parentEmail,
                    parentContact: parentContact,
                    
                    password: generatePassword(),
                    role: 'student',
                    createdAt: new Date()
                };

                try {
                    await window.db.collection('users').add(newStudent);
                    
                    logsDiv.innerHTML += `<div style='color:green; font-size:11px;'>Added: ${fName} ${lName} (ID: ${userId})</div>`;
                    
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

            logsDiv.innerHTML += `<br><strong>Upload Complete!</strong><br>`;
            logsDiv.innerHTML += `Success: ${successCount}<br>`;
            logsDiv.innerHTML += `Duplicates Skipped: ${duplicateCount}<br>`;
            logsDiv.innerHTML += `Invalid Rows Skipped: ${skippedCount}<br>`;
            logsDiv.innerHTML += `Failed: ${failCount}<br>`;
            
            if(successCount > 0) {
                alert(`Upload Complete!\nSuccess: ${successCount}\nDuplicates Skipped: ${duplicateCount}\nInvalid Rows Skipped: ${skippedCount}\nFailed: ${failCount}`);
                loadStudents();
            } else if (duplicateCount > 0) {
                alert(`No records added. Found ${duplicateCount} duplicate(s) in the file.`);
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