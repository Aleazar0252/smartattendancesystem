/**
 * teacher.js
 * Manages Personnel & Displays Workloads
 * ADDED: Bulk Upload Functionality and auto-ID generation logic (T-YYYY-NNN)
 */

// ==========================================
// 1. GLOBAL SCOPE EXPORTS (REQUIRED FOR HOSTING)
// ==========================================
window.validateEmailInput = validateEmailInput;
window.validatePhoneInput = validatePhoneInput;
window.togglePasswordView = togglePasswordView;
window.showAddTeacherModal = showAddTeacherModal;
window.showBulkUploadModal = showBulkUploadModal; // NEW
window.downloadTemplate = downloadTemplate;         // NEW
window.processBulkUpload = processBulkUpload;       // NEW
window.searchTeachers = searchTeachers;
window.viewTeacherDetails = viewTeacherDetails;
window.viewTeacherSchedules = viewTeacherSchedules;
window.archiveTeacher = archiveTeacher;
window.toggleActionMenu = toggleActionMenu;
window.closeModal = closeModal;
window.addNewTeacher = addNewTeacher;

// ==========================================
// 2. VARIABLES & INITIALIZATION
// ==========================================
let allTeachers = [];
let currentViewPassword = "";
let latestLocalTeacherId = 0; // NEW: To track highest ID locally (e.g., 001)

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    if (window.db) {
      console.log("Database connected. Fetching teachers...");
      loadTeachersWithLoad();
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

// ==========================================
// 3. CORE HELPERS
// ==========================================

// --- HELPER: Generate Password ---
function generatePassword() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let password = "";
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// --- NEW HELPER: Generate Next Teacher ID (T-YYYY-NNN) ---
async function generateNextTeacherId(currentHighestNum = 0) {
    const currentYear = new Date().getFullYear(); 
    
    let dbHighestNum = 0;
    
    // Only query DB if no currentHighestNum is provided (i.e., this is the first call in a batch or for single add)
    if (currentHighestNum === 0) {
        try {
            const snapshot = await window.db.collection('users')
                .where('role', '==', 'teacher')
                .orderBy('userId', 'desc') 
                .limit(1)
                .get();
            if (!snapshot.empty) {
                const lastId = snapshot.docs[0].data().userId;
                if (lastId && lastId.startsWith('T-')) {
                    const parts = lastId.split('-');
                    if (parts.length === 3) {
                        dbHighestNum = parseInt(parts[2]);
                    }
                }
            }
        } catch (e) { console.warn("First run or index building for teacher ID:", e); }
    }
    
    // Use whichever is higher: DB, passed argument, or local tracker
    const actualHighest = Math.max(dbHighestNum, currentHighestNum, latestLocalTeacherId);
    
    const nextNum = actualHighest + 1;
    // Pad with zeros to 3 digits (e.g., 1 -> 001)
    const paddedNum = String(nextNum).padStart(3, '0');
    
    return { 
        nextId: `T-${currentYear}-${paddedNum}`, 
        nextNum: nextNum 
    };
}


// --- VALIDATION FUNCTIONS ---

function validateEmailInput() {
  const email = document.getElementById("new-email").value;
  const errorMsg = document.getElementById("email-error");

  if (email.length > 0 && !email.endsWith("@gmail.com")) {
    errorMsg.style.display = "block";
    return false;
  } else {
    errorMsg.style.display = "none";
    return true;
  }
}

function validatePhoneInput() {
  const phone = document.getElementById("new-phone").value;
  const errorMsg = document.getElementById("phone-error");

  if (phone.length > 0 && phone.length !== 11) {
    errorMsg.style.display = "block";
    return false;
  } else {
    errorMsg.style.display = "none";
    return true;
  }
}

// ==========================================
// 4. DATA FETCH & RENDERING
// ==========================================

// 1. FETCH DATA (UPDATED to track latestLocalTeacherId)
async function loadTeachersWithLoad() {
  const tableBody = document.getElementById("teachers-list-body");
  if (allTeachers.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="5" class="loading-cell">Loading personnel...</td></tr>';
  }

  try {
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
    if (teachersSnap.empty) {
        latestLocalTeacherId = 0; // Reset if empty
        tableBody.innerHTML =
        '<tr><td colspan="5" style="text-align:center;">No teachers found.</td></tr>';
      return;
    }
    
    // Reset global tracker for accurate max ID
    latestLocalTeacherId = 0; 

    teachersSnap.forEach((doc) => {
      const data = doc.data();
      const fullName = `${data.firstName} ${data.lastName}`;
      
      // NEW: Track highest ID
      if (data.userId && data.userId.startsWith('T-')) {
        const parts = data.userId.split('-');
        if (parts.length === 3) {
            const currentIdNum = parseInt(parts[2]);
            if (currentIdNum > latestLocalTeacherId) latestLocalTeacherId = currentIdNum;
        }
      }
      // END NEW

      let createdStr = "N/A";
      if (data.createdAt && data.createdAt.toDate) {
        createdStr =
          data.createdAt.toDate().toLocaleDateString();
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
    });

    renderTable(allTeachers);
  } catch (error) {
    console.error("Error:", error);
    tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Error: ${error.message}</td></tr>`;
  }
}

// 2. RENDER TABLE (No changes needed)
function renderTable(data) {
  const tableBody = document.getElementById("teachers-list-body");
  tableBody.innerHTML = "";

  if (data.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="5" style="text-align:center;">No matches found.</td></tr>';
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

// ==========================================
// 5. CRUD & UI MANAGEMENT
// ==========================================

// 3. ADD NEW TEACHER (No changes needed)
function addNewTeacher() {
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
        // Update local tracker if the ID follows the pattern, for future reference
        if (id && id.startsWith('T-')) {
            const parts = id.split('-');
            if (parts.length === 3) {
                const currentIdNum = parseInt(parts[2]);
                if (currentIdNum > latestLocalTeacherId) latestLocalTeacherId = currentIdNum;
            }
        }
        
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

// --- UI HELPERS (No changes needed) ---

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

function viewTeacherDetails(docId) {
  const teacher = allTeachers.find((t) => t.docId === docId);
  if (teacher) {
    document.getElementById("view-avatar").innerText =
      teacher.firstName.charAt(0);
    document.getElementById("view-fullname").innerText = teacher.fullName;
    document.getElementById("view-id").innerText = teacher.id;
    document.getElementById("view-middlename").innerText =
      teacher.middleName || "-";
    document.getElementById("view-phone").innerText = teacher.phone;
    document.getElementById("view-email").innerText = teacher.email;
    document.getElementById("view-timestamp").innerText = teacher.createdAtStr;

    currentViewPassword = teacher.password || "Not Set";
    const passField = document.getElementById("view-password");
    const icon = document.getElementById("toggle-password-btn");
    passField.innerText = "********";
    icon.className = "fas fa-eye";

    document.getElementById("view-status").innerText =
      teacher.status || "Active";
    document.getElementById("view-teacher-modal").style.display = "block";
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

function archiveTeacher(docId) {
  if (confirm("Are you sure you want to archive this teacher?")) {
    window.db
      .collection("users")
      .doc(docId)
      .update({
        status: "Archived",
      })
      .then(() => {
        alert("Teacher archived.");
        loadTeachersWithLoad();
      })
      .catch((err) => alert("Error: " + err.message));
  }
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


// ==========================================
// 6. BULK UPLOAD LOGIC (NEW)
// ==========================================

function showBulkUploadModal() {
    document.getElementById('bulk-upload-modal').style.display = 'block';
    document.getElementById('bulk-file-input').value = ""; 
    document.getElementById('upload-status').style.display = 'none'; 
    document.getElementById('upload-logs').innerHTML = "";
}

function downloadTemplate() {
    // Headers matching the processor
    const headers = ["Teacher ID", "First Name", "Lastname", "Middle name", "email", "phone"];
    const dummy = ["T-2024-001", "Jane", "Doe", "A", "jane@gmail.com", "09171234567"];
    
    const rows = [headers, dummy];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = "teacher_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function processBulkUpload() {
    const fileInput = document.getElementById('bulk-file-input');
    const logsDiv = document.getElementById('upload-logs');
    const statusDiv = document.getElementById('upload-status');
    const btn = document.getElementById('btn-process-upload');

    // 1. Validation
    if (fileInput.files.length === 0) { 
        alert("Please select a file first!"); 
        return; 
    }
    
    // 2. Check Library
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

            // 3. Initial ID Fetch
            let currentIdInfo = await generateNextTeacherId(0);
            let currentIdNum = currentIdInfo.nextNum - 1; // Start from highest existing
            
            let successCount = 0;
            let failCount = 0;
            
            for (let i = 0; i < jsonData.length; i++) {
                const row = jsonData[i];

                // 4. Loose Header Matching and Data Extraction
                const tId = String(row["Teacher ID"] || row["TeacherID"] || row["ID"] || "").trim();
                const fName = row["First Name"] || row["firstname"] || row["Firstname"];
                const lName = row["Lastname"] || row["lastname"] || row["Last Name"];
                const email = row["email"] || row["Email"];
                const phone = String(row["phone"] || row["Phone"] || "");

                
                if(!fName || !lName || !email || !phone) {
                    logsDiv.innerHTML += `<div style='color:orange;'>Row ${i+1}: Skipped (Missing Name, Email, or Phone)</div>`;
                    failCount++;
                    continue;
                }
                
                let teacherId = tId;
                if (!teacherId || teacherId === "") {
                    // Generate new ID if missing
                    currentIdNum++; 
                    const newIdInfo = await generateNextTeacherId(currentIdNum);
                    teacherId = newIdInfo.nextId;
                    currentIdNum = newIdInfo.nextNum; // Update counter in case of async gap
                }

                const newTeacher = {
                    userId: teacherId, 
                    firstName: fName,
                    lastName: lName,
                    middleName: row["Middle name"] || row["middlename"] || "",
                    email: email,
                    phone: phone,
                    password: generatePassword(),
                    status: 'Active',
                    role: 'teacher',
                    createdAt: new Date()
                };

                try {
                    // Check if ID already exists (simple check, not perfect but helps)
                    const existingSnap = await window.db.collection('users').where('userId', '==', teacherId).limit(1).get();
                    if (!existingSnap.empty) {
                        logsDiv.innerHTML += `<div style='color:red;'>Row ${i+1}: Skipped (ID ${teacherId} already exists)</div>`;
                        failCount++;
                    } else {
                         await window.db.collection('users').add(newTeacher);
                         logsDiv.innerHTML += `<div style='color:green; font-size:11px;'>Added: ${fName} ${lName} (${teacherId})</div>`;
                         // If the ID was manually provided, also track it
                         if (tId && tId.startsWith('T-')) {
                              const parts = tId.split('-');
                              if (parts.length === 3) {
                                  const idNum = parseInt(parts[2]);
                                  if (idNum > currentIdNum) currentIdNum = idNum;
                              }
                         }
                         successCount++;
                         logsDiv.scrollTop = logsDiv.scrollHeight;
                    }

                } catch(err) {
                    console.error(err);
                    logsDiv.innerHTML += `<div style='color:red;'>Row ${i+1} DB Error: ${err.message}</div>`;
                    failCount++;
                }
            }

            // Update global tracker
            latestLocalTeacherId = currentIdNum;

            logsDiv.innerHTML += `<br><strong>Done! Success: ${successCount}, Failed: ${failCount}</strong>`;
            
            if(successCount > 0) {
                alert(`Upload Complete!\nSuccess: ${successCount}\nFailed: ${failCount}`);
                loadTeachersWithLoad();
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

// Global Export (Moved to top of file)