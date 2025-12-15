/**
 * sections.js
 * Logic for Grade Level & Sections Management
 * Features: Floating Action Menu, Excel Export, Batch Assign, Modal Search
 * Updates: Added Duplicate Section Prevention
 */

let allSections = [];
let currentClassList = [];
let allStudentsCache = [];
let batchStudents = [];

const STANDARD_GRADES = [
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
];

let currentGradeContext = "";
let currentSectionContext = "";

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    if (window.db) {
      console.log("Database connected.");
      loadSectionsFromDB();
    }
  }, 500);

  window.onclick = function (event) {
    if (event.target.classList.contains("modal")) {
      event.target.style.display = "none";
    }
    if (!event.target.closest(".action-menu-container")) {
      const dropdowns = document.getElementsByClassName("action-dropdown");
      for (let i = 0; i < dropdowns.length; i++) {
        dropdowns[i].classList.remove("show");
      }
    }
  };
});

// --- 1. LOAD SECTIONS (CRITICAL FOR DUPLICATE CHECK) ---
function loadSectionsFromDB() {
  const container = document.getElementById("grade-levels-container");
  window.db
    .collection("sections")
    .get()
    .then((querySnapshot) => {
      allSections = [];
      querySnapshot.forEach((doc) => {
        // We store the data globally so we can check it later without calling the DB again
        allSections.push({ docId: doc.id, ...doc.data() });
      });
      renderGradeGroups();
    })
    .catch((error) => {
      container.innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
    });
}

// --- 2. RENDER UI ---
function renderGradeGroups() {
  const container = document.getElementById("grade-levels-container");
  const searchInput = document
    .getElementById("search-input")
    .value.toLowerCase();
  container.innerHTML = "";

  STANDARD_GRADES.forEach((grade) => {
    // Filter sections for this grade loop
    const gradeSections = allSections.filter((s) => {
      const matchesGrade = s.gradeLevel === grade;
      const matchesSearch = s.sectionName.toLowerCase().includes(searchInput);
      return matchesGrade && matchesSearch;
    });

    // Sort alphabetically
    gradeSections.sort((a, b) => a.sectionName.localeCompare(b.sectionName));

    const groupDiv = document.createElement("div");
    groupDiv.className = "grade-group-card";

    let sectionsHtml = "";
    if (gradeSections.length === 0) {
      sectionsHtml = `<div class="empty-message">No sections added yet.</div>`;
    } else {
      sectionsHtml = `<div class="grade-body">`;
      gradeSections.forEach((section) => {
        sectionsHtml += `
                    <div class="section-item">
                        <span style="font-weight:500;">${section.sectionName}</span>
                        <div class="action-menu-container" style="display:inline-block;">
                            <button class="btn-icon" onclick="toggleActionMenu('menu-${section.docId}')">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div id="menu-${section.docId}" class="action-dropdown">
                                <div onclick="viewClassList('${grade}', '${section.sectionName}')">
                                    <i class="fas fa-users" style="color:#28a745"></i> View Students
                                </div>
                                <div onclick="openSectionModal('${grade}', '${section.docId}')">
                                    <i class="fas fa-edit" style="color:#007bff"></i> Edit Name
                                </div>
                                <div onclick="deleteSection('${section.docId}')">
                                    <i class="fas fa-trash" style="color:#dc3545"></i> Delete Section
                                </div>
                            </div>
                        </div>
                    </div>
                `;
      });
      sectionsHtml += `</div>`;
    }

    groupDiv.innerHTML = `
            <div class="grade-header">
                <h3>${grade}</h3>
                <button class="btn btn-primary" style="padding: 5px 12px; font-size: 0.8rem;" onclick="openSectionModal('${grade}')">
                    <i class="fas fa-plus"></i> Add Section
                </button>
            </div>
            ${sectionsHtml}
        `;
    container.appendChild(groupDiv);
  });
}

// --- 3. SAVE SECTION (WITH ERROR HANDLER FOR DUPLICATES) ---
function saveSection() {
  const docId = document.getElementById("edit-doc-id").value;
  const grade = document.getElementById("sec-grade-value").value;
  const rawName = document.getElementById("sec-name").value;

  // 1. Basic Validation
  if (!rawName || rawName.trim() === "") {
    alert("Please enter a Section Name");
    return;
  }

  const name = rawName.trim(); // Remove leading/trailing spaces

  // 2. Duplicate Check Logic
  // We look through the 'allSections' array loaded in step 1
  const duplicateExists = allSections.some((section) => {
    // Only check against sections in the SAME Grade Level
    if (section.gradeLevel !== grade) return false;

    // Check if name matches (Case Insensitive: "Rizal" == "rizal")
    if (section.sectionName.toLowerCase() === name.toLowerCase()) {
      // Exception: If we are editing, allow the name if it belongs to the current ID
      if (docId && section.docId === docId) {
        return false;
      }
      return true; // Found a duplicate!
    }
    return false;
  });

  if (duplicateExists) {
    alert(`Error: The section "${name}" already exists in ${grade}.`);
    return; // STOP execution here. Do not save to DB.
  }

  // 3. Prepare to Save
  const btn = document.querySelector("#section-modal .btn-primary");
  const originalText = btn.innerText;
  btn.innerText = "Saving...";
  btn.disabled = true;

  const sectionData = {
    gradeLevel: grade,
    sectionName: name,
    updatedAt: new Date(),
  };

  let promise;
  if (docId) {
    // Update existing
    promise = window.db.collection("sections").doc(docId).update(sectionData);
  } else {
    // Add new
    sectionData.createdAt = new Date();
    promise = window.db.collection("sections").add(sectionData);
  }

  promise
    .then(() => {
      alert(docId ? "Section updated!" : "Section added!");
      closeModal("section-modal");
      loadSectionsFromDB(); // Reload list to update UI and Duplicate Checker
    })
    .catch((err) => {
      console.error(err);
      alert("Error: " + err.message);
    })
    .finally(() => {
      btn.innerText = originalText;
      btn.disabled = false;
    });
}

// --- 4. DELETE SECTION ---
function deleteSection(docId) {
  if (confirm("Delete this section? This action cannot be undone.")) {
    window.db
      .collection("sections")
      .doc(docId)
      .delete()
      .then(() => loadSectionsFromDB());
  }
}

// --- 5. MODAL HELPERS ---
function openSectionModal(gradeLevel, docId = null) {
  const modal = document.getElementById("section-modal");
  const title = document.getElementById("modal-title");
  const form = document.getElementById("section-form");
  
  // Set hidden inputs
  document.getElementById("sec-grade-display").value = gradeLevel;
  document.getElementById("sec-grade-value").value = gradeLevel;

  if (docId) {
    // Edit Mode
    const section = allSections.find((s) => s.docId === docId);
    if (section) {
      document.getElementById("edit-doc-id").value = docId;
      document.getElementById("sec-name").value = section.sectionName;
      title.innerText = "Edit Section";
    }
  } else {
    // Add Mode
    form.reset();
    document.getElementById("sec-grade-display").value = gradeLevel; // Reset display
    document.getElementById("sec-grade-value").value = gradeLevel;   // Reset value
    document.getElementById("edit-doc-id").value = "";
    title.innerText = "Add Section to " + gradeLevel;
  }
  modal.style.display = "block";
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = "none";
}

function toggleActionMenu(menuId) {
  const dropdowns = document.getElementsByClassName("action-dropdown");
  for (let i = 0; i < dropdowns.length; i++) {
    if (dropdowns[i].id !== menuId) dropdowns[i].classList.remove("show");
  }
  document.getElementById(menuId).classList.toggle("show");
}

// --- 6. STUDENT LIST LOGIC ---
function viewClassList(grade, sectionName) {
  currentGradeContext = grade;
  currentSectionContext = sectionName;

  const modal = document.getElementById("class-list-modal");
  document.getElementById("class-list-title").innerText = `${grade} - ${sectionName}`;

  document.getElementById("search-class-list").value = "";
  document.getElementById("class-loader").style.display = "block";
  document.getElementById("class-content").style.display = "none";
  modal.style.display = "block";

  refreshClassListTable();
}

function refreshClassListTable() {
  const tbody = document.getElementById("class-list-body");
  const countLabel = document.getElementById("class-count");

  window.db
    .collection("users")
    .where("role", "==", "student")
    .where("gradeLevel", "==", currentGradeContext)
    .where("section", "==", currentSectionContext)
    .get()
    .then((snapshot) => {
      document.getElementById("class-loader").style.display = "none";
      document.getElementById("class-content").style.display = "block";
      countLabel.innerText = `${snapshot.size} Students Enrolled`;

      tbody.innerHTML = "";
      currentClassList = [];

      if (snapshot.empty) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No students enrolled yet.</td></tr>';
        return;
      }

      snapshot.forEach((doc) => {
        const s = doc.data();
        const fullName = `${s.lastName}, ${s.firstName}`;
        currentClassList.push({ ...s, fullName });

        tbody.innerHTML += `
            <tr>
                <td>${s.lrn || "-"}</td>
                <td><strong>${fullName}</strong></td>
                <td>${s.gender || "-"}</td>
                <td>
                    <button class="btn-icon" style="color:#dc3545;" title="Remove" onclick="removeStudentFromSection('${doc.id}')">
                        <i class="fas fa-times"></i>
                    </button>
                </td>
            </tr>
        `;
      });
    })
    .catch((err) => console.error(err));
}

function filterClassListTable() {
  const input = document.getElementById("search-class-list").value.toLowerCase();
  const rows = document.querySelectorAll("#class-list-body tr");
  rows.forEach((row) => {
    const text = row.innerText.toLowerCase();
    row.style.display = text.includes(input) ? "" : "none";
  });
}

function removeStudentFromSection(studentId) {
  if (confirm("Remove this student from the section?")) {
    window.db
      .collection("users")
      .doc(studentId)
      .update({ gradeLevel: "Unassigned", section: "Unassigned" })
      .then(() => {
        refreshClassListTable();
      });
  }
}

// --- 7. EXPORT & BATCH LOGIC ---
function downloadClassListCSV() {
  if (!currentClassList || currentClassList.length === 0) {
    alert("No students to export.");
    return;
  }
  let csvContent = "data:text/csv;charset=utf-8,LRN,Last Name,First Name,Middle Name,Gender,Grade Level,Section\n";
  currentClassList.forEach((student) => {
    const row = [
      `"${student.lrn || ""}"`,
      `"${student.lastName || ""}"`,
      `"${student.firstName || ""}"`,
      `"${student.middleName || ""}"`,
      `"${student.gender || ""}"`,
      `"${student.gradeLevel || ""}"`,
      `"${student.section || ""}"`,
    ].join(",");
    csvContent += row + "\n";
  });
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `ClassList_${currentGradeContext}_${currentSectionContext}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function openAssignModal() {
  document.getElementById("assign-target-section").innerText = `${currentGradeContext} - ${currentSectionContext}`;
  batchStudents = [];
  document.getElementById("search-student-dropdown").value = "";
  renderBatchList();
  loadStudentsForDropdown();
  document.getElementById("assign-student-modal").style.display = "block";
}

async function loadStudentsForDropdown() {
  const datalist = document.getElementById("students-datalist");
  datalist.innerHTML = "";
  if (allStudentsCache.length === 0) {
    const snap = await window.db.collection("users").where("role", "==", "student").get();
    snap.forEach((doc) => {
      const data = doc.data();
      allStudentsCache.push({
        docId: doc.id,
        fullName: `${data.firstName} ${data.lastName}`,
        lrn: data.lrn || "N/A",
      });
    });
  }
  allStudentsCache.forEach((s) => {
    const option = document.createElement("option");
    option.value = `${s.fullName} (${s.lrn})`;
    option.setAttribute("data-id", s.docId);
    datalist.appendChild(option);
  });
}

function addStudentToBatchList() {
  const input = document.getElementById("search-student-dropdown");
  const val = input.value;
  if (!val) return;
  const student = allStudentsCache.find((s) => `${s.fullName} (${s.lrn})` === val);
  if (!student) {
    alert("Please select a valid student from the dropdown list.");
    return;
  }
  if (batchStudents.find((b) => b.docId === student.docId)) {
    alert("Student already in the list.");
    input.value = "";
    return;
  }
  batchStudents.push(student);
  input.value = "";
  renderBatchList();
}

function renderBatchList() {
  const container = document.getElementById("batch-list-body");
  const countSpan = document.getElementById("batch-count");
  const confirmBtn = document.getElementById("btn-confirm-assign");
  countSpan.innerText = batchStudents.length;
  confirmBtn.disabled = batchStudents.length === 0;
  if (batchStudents.length === 0) {
    container.innerHTML = '<div style="padding:15px; text-align:center; color:#999; font-style:italic;">No students added yet.</div>';
    return;
  }
  let html = "";
  batchStudents.forEach((s, index) => {
    html += `<div class="batch-item"><span>${s.fullName} <small style="color:#666;">(${s.lrn})</small></span><button class="remove-batch-btn" onclick="removeFromBatch(${index})"><i class="fas fa-times"></i></button></div>`;
  });
  container.innerHTML = html;
}

function removeFromBatch(index) {
  batchStudents.splice(index, 1);
  renderBatchList();
}

async function confirmBatchAssignment() {
  if (batchStudents.length === 0) return;
  const btn = document.getElementById("btn-confirm-assign");
  btn.innerText = "Saving...";
  btn.disabled = true;
  try {
    const updatePromises = batchStudents.map((student) => {
      return window.db.collection("users").doc(student.docId).update({
        gradeLevel: currentGradeContext,
        section: currentSectionContext,
      });
    });
    await Promise.all(updatePromises);
    alert(`Successfully assigned ${batchStudents.length} student(s)!`);
    closeModal("assign-student-modal");
    refreshClassListTable();
  } catch (e) {
    console.error(e);
    alert("Error saving: " + e.message);
  } finally {
    btn.innerText = "Confirm Assignment";
    btn.disabled = false;
  }
}

function filterGroups() {
  renderGradeGroups();
}