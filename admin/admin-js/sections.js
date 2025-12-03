/**
 * sections.js
 * Logic for Grade Level & Sections Management
 * Displays Grade Levels 7-12 explicitly and allows adding sections to them.
 */

let allSections = []; 
// Define standard Grade Levels
const STANDARD_GRADES = ["Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.db) {
            console.log("Database connected. Fetching sections...");
            loadSectionsFromDB();
        } else {
            console.error("Firebase DB not initialized.");
        }
    }, 500);

    // Global Click to close modals
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
function loadSectionsFromDB() {
    const container = document.getElementById('grade-levels-container');
    
    window.db.collection('sections').get()
        .then((querySnapshot) => {
            allSections = [];
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                allSections.push({ docId: doc.id, ...data });
            });
            
            renderGradeGroups();
        })
        .catch((error) => {
            console.error("Error:", error);
            container.innerHTML = `<p style="color:red;">Error loading sections: ${error.message}</p>`;
        });
}

// 2. RENDER GROUPS (Grade 7 - 12)
function renderGradeGroups() {
    const container = document.getElementById('grade-levels-container');
    const searchInput = document.getElementById('search-input').value.toLowerCase();
    
    container.innerHTML = '';

    STANDARD_GRADES.forEach(grade => {
        // Filter sections that belong to this grade AND match search
        const gradeSections = allSections.filter(s => {
            const matchesGrade = s.gradeLevel === grade;
            const matchesSearch = s.sectionName.toLowerCase().includes(searchInput);
            return matchesGrade && matchesSearch;
        });

        // Sort sections alphabetically
        gradeSections.sort((a, b) => a.sectionName.localeCompare(b.sectionName));

        // Build HTML for the Grade Group
        const groupDiv = document.createElement('div');
        groupDiv.className = 'grade-group-card';
        
        let sectionsHtml = '';

        if (gradeSections.length === 0) {
            sectionsHtml = `<div class="empty-message">No sections added yet.</div>`;
        } else {
            sectionsHtml = `<div class="grade-body">`;
            gradeSections.forEach(section => {
                sectionsHtml += `
                    <div class="section-item">
                        <span>${section.sectionName}</span>
                        <div class="action-menu-container" style="display:inline-block;">
                            <button class="btn-icon" onclick="toggleActionMenu('menu-${section.docId}')">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div id="menu-${section.docId}" class="action-dropdown">
                                <div onclick="openSectionModal('${grade}', '${section.docId}')">
                                    <i class="fas fa-edit" style="color:#007bff"></i> Edit
                                </div>
                                <div onclick="deleteSection('${section.docId}')">
                                    <i class="fas fa-trash" style="color:#dc3545"></i> Delete
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

// 3. FILTER WRAPPER
function filterGroups() {
    renderGradeGroups();
}

// 4. SAVE (Add/Edit)
function saveSection() {
    const docId = document.getElementById('edit-doc-id').value;
    const grade = document.getElementById('sec-grade-value').value;
    const name = document.getElementById('sec-name').value;

    if(!name) {
        alert("Please enter a Section Name");
        return;
    }

    const btn = document.querySelector('#section-modal .btn-primary');
    const originalText = btn.innerText;
    btn.innerText = "Saving...";
    btn.disabled = true;

    const sectionData = {
        gradeLevel: grade,
        sectionName: name,
        updatedAt: new Date()
    };

    let promise;
    if (docId) {
        promise = window.db.collection('sections').doc(docId).update(sectionData);
    } else {
        sectionData.createdAt = new Date();
        promise = window.db.collection('sections').add(sectionData);
    }

    promise.then(() => {
        alert(docId ? "Section updated!" : "Section added to " + grade + "!");
        closeModal('section-modal');
        loadSectionsFromDB();
    }).catch((err) => {
        alert("Error: " + err.message);
    }).finally(() => {
        btn.innerText = originalText;
        btn.disabled = false;
    });
}

// 5. DELETE
function deleteSection(docId) {
    if(confirm("Are you sure you want to delete this section?")) {
        window.db.collection('sections').doc(docId).delete()
            .then(() => loadSectionsFromDB())
            .catch(err => alert("Error: " + err.message));
    }
}

// 6. UI HELPERS
function openSectionModal(gradeLevel, docId = null) {
    const modal = document.getElementById('section-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('section-form');
    
    // Set the Grade Level (Fixed for this modal session)
    document.getElementById('sec-grade-display').value = gradeLevel;
    document.getElementById('sec-grade-value').value = gradeLevel;

    if (docId) {
        // EDIT MODE
        const section = allSections.find(s => s.docId === docId);
        if(section) {
            document.getElementById('edit-doc-id').value = docId;
            document.getElementById('sec-name').value = section.sectionName;
            title.innerText = "Edit Section";
        }
    } else {
        // ADD MODE
        form.reset();
        // Resetting form clears hidden inputs, so re-set the grade
        document.getElementById('sec-grade-display').value = gradeLevel;
        document.getElementById('sec-grade-value').value = gradeLevel;
        
        document.getElementById('edit-doc-id').value = "";
        title.innerText = "Add Section to " + gradeLevel;
    }
    
    modal.style.display = 'block';
}

function toggleActionMenu(menuId) {
    const dropdowns = document.getElementsByClassName("action-dropdown");
    for (let i = 0; i < dropdowns.length; i++) {
        if (dropdowns[i].id !== menuId) {
            dropdowns[i].classList.remove('show');
        }
    }
    document.getElementById(menuId).classList.toggle('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}