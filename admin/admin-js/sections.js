/**
 * sections.js
 * Logic for Grade Level & Sections Management
 */

let allSections = []; 

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
    const tableBody = document.getElementById('sections-list-body');
    
    window.db.collection('sections').orderBy('gradeLevel').get()
        .then((querySnapshot) => {
            allSections = [];
            
            if (querySnapshot.empty) {
                renderTable([]); 
                return;
            }

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                allSections.push({ docId: doc.id, ...data });
            });
            
            renderTable(allSections);
        })
        .catch((error) => {
            console.error("Error:", error);
            tableBody.innerHTML = `<tr><td colspan="3" style="color:red; text-align:center;">Error: ${error.message}</td></tr>`;
        });
}

// 2. RENDER TABLE
function renderTable(data) {
    const tableBody = document.getElementById('sections-list-body');
    tableBody.innerHTML = '';

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No sections found.</td></tr>';
        return;
    }

    // Sort: Grade Level first, then Section Name
    data.sort((a, b) => {
        const gradeA = String(a.gradeLevel || '');
        const gradeB = String(b.gradeLevel || '');
        
        if(gradeA === gradeB) {
            return String(a.sectionName).localeCompare(String(b.sectionName));
        }
        return gradeA.localeCompare(gradeB);
    });

    data.forEach(section => {
        const row = document.createElement('tr');
        const gradeStr = String(section.gradeLevel || ''); 

        // Color coding badges for Grades
        let badgeColor = "#e3f2fd"; 
        let textColor = "#0d47a1";
        
        if(gradeStr.includes('7')) { badgeColor = "#e8f5e9"; textColor = "#1b5e20"; } 
        if(gradeStr.includes('8')) { badgeColor = "#fff3e0"; textColor = "#e65100"; }
        if(gradeStr.includes('9')) { badgeColor = "#f3e5f5"; textColor = "#4a148c"; }
        if(gradeStr.includes('10')) { badgeColor = "#ffebee"; textColor = "#b71c1c"; }
        if(gradeStr.includes('11') || gradeStr.includes('12')) { badgeColor = "#fff8e1"; textColor = "#ff6f00"; }

        row.innerHTML = `
            <td><span class="badge-success" style="background:${badgeColor}; color:${textColor}; border:none;">${gradeStr}</span></td>
            <td><strong>${section.sectionName}</strong></td>
            <td style="text-align: right;">
                <div class="action-menu-container">
                    <button class="btn-icon" onclick="toggleActionMenu('menu-${section.docId}')">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div id="menu-${section.docId}" class="action-dropdown">
                        <div onclick="openSectionModal('${section.docId}')">
                            <i class="fas fa-edit" style="color:#007bff"></i> Edit
                        </div>
                        <div onclick="deleteSection('${section.docId}')">
                            <i class="fas fa-trash" style="color:#dc3545"></i> Delete
                        </div>
                    </div>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// 3. FILTER FUNCTION
function filterSections() {
    const gradeFilter = document.getElementById('filter-grade').value; 
    const searchInput = document.getElementById('search-input').value.toLowerCase();
    
    const filtered = allSections.filter(section => {
        const dbGrade = String(section.gradeLevel || ''); 
        
        // Matches Grade?
        const matchesGrade = (gradeFilter === 'All') || (dbGrade === gradeFilter);
        
        // Matches Name?
        const secName = String(section.sectionName || '').toLowerCase();
        const matchesSearch = secName.includes(searchInput);
        
        return matchesGrade && matchesSearch;
    });
    
    renderTable(filtered);
}

// 4. SAVE
function saveSection() {
    const docId = document.getElementById('edit-doc-id').value;
    const grade = document.getElementById('sec-grade').value;
    const name = document.getElementById('sec-name').value;

    if(!grade || !name) {
        alert("Please fill in Grade Level and Section Name");
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
        alert(docId ? "Section updated!" : "Section added!");
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
function openSectionModal(docId = null) {
    const modal = document.getElementById('section-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('section-form');
    
    if (docId) {
        // EDIT
        const section = allSections.find(s => s.docId === docId);
        if(section) {
            document.getElementById('edit-doc-id').value = docId;
            document.getElementById('sec-grade').value = section.gradeLevel;
            document.getElementById('sec-name').value = section.sectionName;
            title.innerText = "Edit Section";
        }
    } else {
        // ADD
        form.reset();
        document.getElementById('edit-doc-id').value = "";
        title.innerText = "Add New Section";
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