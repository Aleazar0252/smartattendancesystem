/**
 * teacher.js
 * Manages Personnel & Displays Workloads
 * Features: View, Edit, Archive, Restore, Delete
 */

let allTeachers = [];
let archivedTeachers = [];
let currentViewPassword = "";

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    if (window.db) {
      console.log("Database connected. Fetching teachers...");
      loadTeachersWithLoad();
      loadArchivedTeachers(); // Load archived in background
    } else {
      console.error("Firebase DB not initialized.");
    }
  }, 500);

  window.onclick = function (event) {
    if (event.target.classList.contains("modal")) {
      event.target.style.display = "none";
    }
    if (
      !event.target.closest(".action-menu-container") &&
      !event.target.closest("#toggle-password-btn")
    ) {
      const dropdowns = document.getElementsByClassName("action-dropdown");
      for (let i = 0; i < dropdowns.length; i++) {
        dropdowns[i].classList.remove("show");
      }
    }
  };
});

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
function validateEmailInput(inputId = "new-email", errorId = "email-error") {
  const email = document.getElementById(inputId).value;
  const errorMsg = document.getElementById(errorId);

  if (email.length > 0 && !email.endsWith("@gmail.com")) {
    errorMsg.style.display = "block";
    return false;
  } else {
    errorMsg.style.display = "none";
    return true;
  }
}

function validatePhoneInput(inputId = "new-phone", errorId = "phone-error") {
  const phone = document.getElementById(inputId).value;
  const errorMsg = document.getElementById(errorId);

  if (phone.length > 0 && phone.length !== 11) {
    errorMsg.style.display = "block";
    return false;
  } else {
    errorMsg.style.display = "none";
    return true;
  }
}

// 1. FETCH ACTIVE DATA
async function loadTeachersWithLoad() {
  const tableBody = document.getElementById("teachers-list-body");
  if (allTeachers.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5" class="loading-cell">Loading personnel...</td></tr>';
  }

  try {
    // Only fetch active users for the main list
    const teachersSnap = await window.db
      .collection("users")
      .where("role", "==", "teacher")
      .get();

    const schedulesSnap = await window.db.collection("classSessions").get();

    const loadCounts = {};
    schedulesSnap.forEach((doc) => {
      const s = doc.data();
      const teacherName = s.teacher || s.teacherName;
      if (teacherName) {
        loadCounts[teacherName] = (loadCounts[teacherName] || 0) + 1;
      }
    });

    allTeachers = [];
    
    teachersSnap.forEach((doc) => {
      const data = doc.data();
      
      // Filter Active users here
      if (data.status !== "Archived") {
          const fullName = `${data.firstName} ${data.lastName}`;

          let createdStr = "N/A";
          if (data.createdAt && data.createdAt.toDate) {
            createdStr = data.createdAt.toDate().toLocaleDateString();
          } else if (data.createdAt) {
            createdStr = new Date(data.createdAt).toLocaleDateString();
          }

          allTeachers.push({
            docId: doc.id,
            id: data.userId || "N/A",
            firstName: data.firstName || "",
            middleName: data.middleName || "",
            lastName: data.lastName || "",
            fullName: fullName,
            email: data.email || "",
            phone: data.phone || "N/A",
            status: data.status || "Active",
            password: data.password || "******",
            createdAtStr: createdStr,
            classCount: loadCounts[fullName] || 0,
          });
      }
    });

    if (allTeachers.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No active teachers found.</td></tr>';
    } else {
      renderTable(allTeachers);
    }
  } catch (error) {
    console.error("Error:", error);
    tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Error: ${error.message}</td></tr>`;
  }
}

// 2. RENDER ACTIVE TABLE
function renderTable(data) {
  const tableBody = document.getElementById("teachers-list-body");
  tableBody.innerHTML = "";

  if (data.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No matches found.</td></tr>';
    return;
  }

  data.forEach((teacher) => {
    const row = document.createElement("tr");

    let badgeStyle =
      teacher.classCount === 0
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
                        <div onclick="openEditModal('${teacher.docId}')">
                            <i class="fas fa-edit" style="color:#ffc107"></i> Edit
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

// 3. ADD NEW TEACHER - MODIFIED WITH DUPLICATE PREVENTION
async function addNewTeacher() {
  const id = document.getElementById("new-id").value;
  const firstName = document.getElementById("new-firstname").value;
  const middleName = document.getElementById("new-middlename").value;
  const lastName = document.getElementById("new-lastname").value;
  const email = document.getElementById("new-email").value;
  const phone = document.getElementById("new-phone").value;

  // Check basic required fields
  if (!id || !firstName || !lastName || !email || !phone) {
    alert("Please fill in required fields.");
    return;
  }

  // Run format validations
  if (!validateEmailInput() || !validatePhoneInput()) {
    alert("Please correct the errors in the form (Email or Phone).");
    return;
  }

  // Check for duplicate ID
  const idExists = await checkIfUserExists('userId', id);
  if (idExists) {
    alert(`Error: User ID "${id}" already exists. Please use a different ID.`);
    return;
  }

  // Check for duplicate email
  const emailExists = await checkIfUserExists('email', email);
  if (emailExists) {
    alert(`Error: Email "${email}" is already registered. Please use a different email.`);
    return;
  }

  const password = generatePassword();

  const newTeacher = {
    userId: id, // Manual ID from Input
    password: password,
    firstName: firstName,
    middleName: middleName,
    lastName: lastName,
    email: email,
    phone: phone,
    status: "Active",
    role: "teacher",
    createdAt: new Date(),
  };

  const btn = document.querySelector("#add-teacher-modal .btn-primary");
  const originalText = btn.innerText;
  btn.innerText = "Saving...";
  btn.disabled = true;

  window.db
    .collection("users")
    .add(newTeacher)
    .then(() => {
      alert(
        `Teacher Added Successfully!\n\nID: ${id}\nPassword: ${password}`
      );
      closeModal("add-teacher-modal");
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

// NEW FUNCTION: Check if user with specific field value already exists
async function checkIfUserExists(field, value) {
  try {
    const querySnapshot = await window.db
      .collection("users")
      .where(field, "==", value)
      .get();
    
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error checking user existence:", error);
    return false;
  }
}
// --- EDIT FUNCTIONALITY ---
function openEditModal(docId) {
    const teacher = allTeachers.find(t => t.docId === docId);
    if (!teacher) return;

    document.getElementById('edit-doc-id').value = docId;
    document.getElementById('edit-id').value = teacher.id;
    document.getElementById('edit-firstname').value = teacher.firstName;
    document.getElementById('edit-middlename').value = teacher.middleName;
    document.getElementById('edit-lastname').value = teacher.lastName;
    document.getElementById('edit-email').value = teacher.email;
    document.getElementById('edit-phone').value = teacher.phone;
    
    // Clear errors
    document.getElementById('edit-email-error').style.display = 'none';
    document.getElementById('edit-phone-error').style.display = 'none';

    document.getElementById('edit-teacher-modal').style.display = 'block';
}

function updateTeacher() {
    const docId = document.getElementById('edit-doc-id').value;
    const firstName = document.getElementById('edit-firstname').value;
    const middleName = document.getElementById('edit-middlename').value;
    const lastName = document.getElementById('edit-lastname').value;
    const email = document.getElementById('edit-email').value;
    const phone = document.getElementById('edit-phone').value;

    if (!firstName || !lastName || !email || !phone) {
        alert("Please fill in required fields.");
        return;
    }

    if (!validateEmailInput('edit-email', 'edit-email-error') || 
        !validatePhoneInput('edit-phone', 'edit-phone-error')) {
        alert("Please correct errors.");
        return;
    }

    const btn = document.querySelector("#edit-teacher-modal .btn-primary");
    const originalText = btn.innerText;
    btn.innerText = "Updating...";
    btn.disabled = true;

    window.db.collection("users").doc(docId).update({
        firstName: firstName,
        middleName: middleName,
        lastName: lastName,
        email: email,
        phone: phone
    })
    .then(() => {
        alert("Teacher updated successfully!");
        closeModal("edit-teacher-modal");
        loadTeachersWithLoad();
    })
    .catch((error) => {
        alert("Error updating: " + error.message);
    })
    .finally(() => {
        btn.innerText = originalText;
        btn.disabled = false;
    });
}

// --- ARCHIVE LOGIC ---

function loadArchivedTeachers() {
    window.db.collection('users')
        .where('role', '==', 'teacher')
        .where('status', '==', 'Archived')
        .get()
        .then((querySnapshot) => {
            archivedTeachers = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                let archivedStr = "N/A";
                if (data.archivedAt && data.archivedAt.toDate) {
                    archivedStr = data.archivedAt.toDate().toLocaleDateString() + ' ' + data.archivedAt.toDate().toLocaleTimeString();
                }

                archivedTeachers.push({
                    docId: doc.id,
                    id: data.userId || 'N/A',
                    fullName: `${data.firstName} ${data.lastName}`,
                    firstName: data.firstName,
                    middleName: data.middleName,
                    lastName: data.lastName,
                    email: data.email,
                    phone: data.phone,
                    password: data.password,
                    status: 'Archived',
                    archivedAtStr: archivedStr,
                    createdAtStr: archivedStr // Reuse for view detail
                });
            });
            // If modal is open, refresh it
            const modal = document.getElementById('archive-teacher-modal');
            if (modal.style.display === 'block') {
                showArchivedModal();
            }
        });
}

function showArchivedModal() {
    const listBody = document.getElementById('archived-list-body');
    listBody.innerHTML = '';
    
    if (archivedTeachers.length === 0) {
        listBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No archived teachers found.</td></tr>';
    } else {
        archivedTeachers.forEach(t => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${t.fullName}</td>
                <td>${t.email}</td>
                <td>${t.phone}</td>
                <td>${t.archivedAtStr}</td>
                <td style="text-align: right;">
                    <div style="display: flex; gap: 5px; justify-content: flex-end;">
                        <button onclick="viewTeacherDetails('${t.docId}')" title="View" style="background: #17a2b8; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="restoreTeacher('${t.docId}')" title="Restore" style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-undo"></i>
                        </button>
                        <button onclick="deleteTeacherPermanent('${t.docId}')" title="Delete" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            listBody.appendChild(row);
        });
    }
    document.getElementById('archive-teacher-modal').style.display = 'block';
}

function archiveTeacher(docId) {
  if (confirm("Are you sure you want to archive this teacher?")) {
    window.db.collection("users").doc(docId).update({
        status: "Archived",
        archivedAt: new Date()
    })
    .then(() => {
        alert("Teacher archived.");
        loadTeachersWithLoad();
        loadArchivedTeachers();
    })
    .catch((err) => alert("Error: " + err.message));
  }
}

function restoreTeacher(docId) {
    if(confirm("Restore this teacher to Active status?")) {
        window.db.collection("users").doc(docId).update({
            status: "Active",
            archivedAt: null
        })
        .then(() => {
            alert("Teacher Restored!");
            loadTeachersWithLoad();
            loadArchivedTeachers();
        })
        .catch(err => alert("Error: " + err.message));
    }
}

function deleteTeacherPermanent(docId) {
    if(confirm("WARNING: This will PERMANENTLY delete this user. This cannot be undone.")) {
        window.db.collection("users").doc(docId).delete()
        .then(() => {
            alert("Teacher Deleted Permanently.");
            loadArchivedTeachers();
        })
        .catch(err => alert("Error: " + err.message));
    }
}

// --- UI HELPERS ---

function showAddTeacherModal() {
  document.getElementById("add-teacher-form").reset();
  document.getElementById("email-error").style.display = "none";
  document.getElementById("phone-error").style.display = "none";
  document.getElementById("add-teacher-modal").style.display = "block";
}

function searchTeachers() {
  const input = document.getElementById("search-input").value.toLowerCase();
  const filtered = allTeachers.filter(
    (t) =>
      t.firstName.toLowerCase().includes(input) ||
      t.lastName.toLowerCase().includes(input) ||
      t.id.toLowerCase().includes(input)
  );
  renderTable(filtered);
}

// Updated View Logic to check both lists
function viewTeacherDetails(docId) {
  let teacher = allTeachers.find((t) => t.docId === docId);
  if (!teacher) {
      teacher = archivedTeachers.find(t => t.docId === docId);
  }

  if (teacher) {
    document.getElementById("view-avatar").innerText = teacher.firstName.charAt(0);
    document.getElementById("view-fullname").innerText = teacher.fullName;
    document.getElementById("view-id").innerText = teacher.id;
    document.getElementById("view-middlename").innerText = teacher.middleName || "-";
    document.getElementById("view-phone").innerText = teacher.phone;
    document.getElementById("view-email").innerText = teacher.email;
    document.getElementById("view-timestamp").innerText = teacher.createdAtStr;

    currentViewPassword = teacher.password || "Not Set";
    const passField = document.getElementById("view-password");
    const icon = document.getElementById("toggle-password-btn");
    passField.innerText = "********";
    icon.className = "fas fa-eye";

    document.getElementById("view-status").innerText = teacher.status || "Active";
    
    // Ensure view modal is on top
    const viewModal = document.getElementById("view-teacher-modal");
    viewModal.style.zIndex = "2000";
    viewModal.style.display = "block";
  }
}

function togglePasswordView() {
  const passField = document.getElementById("view-password");
  const icon = document.getElementById("toggle-password-btn");

  if (passField.innerText === "********") {
    passField.innerText = currentViewPassword;
    icon.className = "fas fa-eye-slash";
  } else {
    passField.innerText = "********";
    icon.className = "fas fa-eye";
  }
}

function viewTeacherSchedules(teacherName) {
  const modal = document.getElementById("view-schedules-modal");
  const title = document.getElementById("schedules-modal-title");
  const loading = document.getElementById("schedules-loading");
  const table = document.getElementById("teacher-schedules-table");
  const tbody = document.getElementById("teacher-schedules-body");
  const emptyMsg = document.getElementById("schedules-empty");

  title.innerText = `Schedules: ${teacherName}`;
  modal.style.display = "block";
  loading.style.display = "block";
  table.style.display = "none";
  emptyMsg.style.display = "none";
  tbody.innerHTML = "";

  const db = window.db;

  const schedulePromises = [
    db.collection("classSessions").where("teacher", "==", teacherName).get(),
    db.collection("classSessions").where("teacherName", "==", teacherName).get(),
  ];

  Promise.all(schedulePromises)
    .then(([querySnapshot1, querySnapshot2]) => {
      loading.style.display = "none";
      const allSchedules = [];

      const processSnapshot = (snapshot) => {
        snapshot.forEach((doc) => {
          const data = doc.data();
          const isDuplicate = allSchedules.some(
            (s) => s.subject === data.subject && s.section === data.section
          );
          if (!isDuplicate) {
            allSchedules.push(data);
          }
        });
      };

      processSnapshot(querySnapshot1);
      processSnapshot(querySnapshot2);

      if (allSchedules.length === 0) {
        emptyMsg.style.display = "block";
        return;
      }

      table.style.display = "table";

      allSchedules.forEach((s) => {
        const row = document.createElement("tr");
        const timeStr = `${s.startTime || "?"} - ${s.endTime || "?"}`;
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

function toggleActionMenu(menuId) {
  const dropdowns = document.getElementsByClassName("action-dropdown");
  for (let i = 0; i < dropdowns.length; i++) {
    if (dropdowns[i].id !== menuId) dropdowns[i].classList.remove("show");
  }
  document.getElementById(menuId).classList.toggle("show");
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = "none";
}

// Global Export
window.validateEmailInput = validateEmailInput;
window.validatePhoneInput = validatePhoneInput;
window.togglePasswordView = togglePasswordView;
window.checkIfUserExists = checkIfUserExists;  