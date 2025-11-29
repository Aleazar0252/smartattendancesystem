/**
 * subjects.js
 * Logic for Subject Management (Only Subject Name + Timestamp)
 */

let allSubjects = []; 

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.db) {
            console.log("Database connected. Fetching subjects...");
            loadSubjectsFromDB();
        } else {
            console.error("Firebase DB not initialized.");
        }
    }, 500);

    // Close modals & dropdowns
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
function loadSubjectsFromDB() {
    const tableBody = document.getElementById('subjects-list-body');
    
    // Sort by timestamp descending (newest first)
    // If you haven't created an index yet, remove .orderBy('timestamp', 'desc') temporarily
    window.db.collection('subjects').orderBy('timestamp', 'desc').get()
        .then((querySnapshot) => {
            allSubjects = [];
            tableBody.innerHTML = '';

            if (querySnapshot.empty) {
                tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No subjects found.</td></tr>';
                return;
            }

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                allSubjects.push({ docId: doc.id, ...data });
                
                // Format timestamp
                let dateStr = "N/A";
                if(data.timestamp) {
                    // Check if it's a Firestore Timestamp or JS Date
                    const dateObj = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
                    dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString();
                }
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${data.subjectName}</strong></td>
                    <td style="color:#6c757d; font-size:0.9rem;">${dateStr}</td>
                    <td style="text-align: right;">
                        <div class="action-menu-container">
                            <button class="btn-icon" onclick="toggleActionMenu('menu-${doc.id}')">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div id="menu-${doc.id}" class="action-dropdown">
                                <div onclick="openSubjectModal('${doc.id}')">
                                    <i class="fas fa-edit" style="color:#007bff"></i> Edit
                                </div>
                                <div onclick="deleteSubject('${doc.id}')">
                                    <i class="fas fa-trash" style="color:#dc3545"></i> Delete
                                </div>
                            </div>
                        </div>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        })
        .catch((error) => {
            console.error("Error:", error);
            // If the error is about missing index, alert user or log it clearly
            if(error.message.includes('index')) {
                console.warn("You might need to create a Firestore index for 'timestamp' descending.");
            }
            tableBody.innerHTML = `<tr><td colspan="3" style="color:red; text-align:center;">Error: ${error.message}</td></tr>`;
        });
}

// 2. SAVE (ADD or UPDATE)
function saveSubject() {
    const docId = document.getElementById('edit-doc-id').value;
    const name = document.getElementById('sub-name').value;

    if(!name) {
        alert("Please enter the subject name");
        return;
    }

    const btn = document.querySelector('#subject-modal .btn-primary');
    const originalText = btn.innerText;
    btn.innerText = "Saving...";
    btn.disabled = true;

    const subjectData = {
        subjectName: name,
        timestamp: new Date() // Updates timestamp on edit too
    };

    let promise;

    if (docId) {
        // UPDATE
        promise = window.db.collection('subjects').doc(docId).update(subjectData);
    } else {
        // ADD
        promise = window.db.collection('subjects').add(subjectData);
    }

    promise.then(() => {
        alert(docId ? "Subject updated!" : "Subject added!");
        closeModal('subject-modal');
        loadSubjectsFromDB();
    }).catch((err) => {
        alert("Error: " + err.message);
    }).finally(() => {
        btn.innerText = originalText;
        btn.disabled = false;
    });
}

// 3. DELETE
function deleteSubject(docId) {
    if(confirm("Are you sure you want to delete this subject?")) {
        window.db.collection('subjects').doc(docId).delete()
            .then(() => loadSubjectsFromDB())
            .catch(err => alert("Error: " + err.message));
    }
}

// 4. UI HELPERS
function openSubjectModal(docId = null) {
    const modal = document.getElementById('subject-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('subject-form');
    
    if (docId) {
        // EDIT
        const subject = allSubjects.find(s => s.docId === docId);
        if(subject) {
            document.getElementById('edit-doc-id').value = docId;
            document.getElementById('sub-name').value = subject.subjectName;
            title.innerText = "Edit Subject";
        }
    } else {
        // ADD
        form.reset();
        document.getElementById('edit-doc-id').value = "";
        title.innerText = "Add New Subject";
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

function searchSubjects() {
    const input = document.getElementById('search-input').value.toLowerCase();
    const rows = document.querySelectorAll('#subjects-list-body tr');
    
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(input) ? '' : 'none';
    });
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}