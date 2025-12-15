/**
 * profile.js (Student) - UPDATED
 * Features: Fetches full profile including Parent Info & Handles Updates.
 */

document.addEventListener('DOMContentLoaded', () => {
    if (window.sessionManager && window.sessionManager.isLoggedIn()) {
        const user = window.sessionManager.getSession();
        const userId = user.userId || user.uid || user.id;

        if(!userId) {
            console.error("User ID missing");
            return;
        }

        // 1. Fetch Latest Data from Firestore
        // We fetch fresh data instead of relying on the session, 
        // because the session might be missing parent info or phone numbers.
        loadUserProfile(userId);

        // 2. Attach Update Listener
        const updateBtn = document.getElementById('update-btn');
        if(updateBtn) {
            updateBtn.addEventListener('click', (e) => {
                e.preventDefault();
                updateStudentProfile(userId);
            });
        }

    } else {
        window.location.href = '../index.html';
    }
});

async function loadUserProfile(userId) {
    try {
        const doc = await window.db.collection('users').doc(userId).get();
        
        if (!doc.exists) {
            console.error("User document not found.");
            return;
        }

        const data = doc.data();

        // --- Header Info ---
        const fullName = `${data.firstName || ''} ${data.lastName || ''}`;
        document.getElementById('header-user-name').innerText = data.firstName || "Student";
        document.getElementById('profile-fullname').innerText = fullName;
        document.getElementById('profile-id').innerText = `ID: ${data.lrn || userId}`;
        
        // --- Personal Info ---
        document.getElementById('prof-grade').value = data.gradeLevel || "";
        document.getElementById('prof-section').value = data.section || "";
        document.getElementById('prof-lrn').value = data.lrn || "";
        document.getElementById('prof-email').value = data.email || "";
        document.getElementById('prof-phone').value = data.phone || "";
        
        // --- Parent Info ---
        // Combine parent name fields
        const parentFirst = data.parentFirstName || "";
        const parentLast = data.parentLastName || "";
        document.getElementById('prof-parent-name').value = `${parentFirst} ${parentLast}`.trim();
        document.getElementById('prof-parent-contact').value = data.parentContact || "";
        document.getElementById('prof-parent-email').value = data.parentEmail || "";

    } catch (error) {
        console.error("Error loading profile:", error);
        alert("Failed to load profile data.");
    }
}

async function updateStudentProfile(userId) {
    const updateBtn = document.getElementById('update-btn');
    const originalText = updateBtn.innerText;
    
    // Get Editable Fields
    const phone = document.getElementById('prof-phone').value.trim();
    const parentContact = document.getElementById('prof-parent-contact').value.trim();
    // We usually don't let students edit their Grade/Section/LRN directly
    
    // UI Loading
    updateBtn.disabled = true;
    updateBtn.innerText = "Saving...";

    try {
        await window.db.collection('users').doc(userId).update({
            phone: phone,
            parentContact: parentContact,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert("Profile updated successfully!");

    } catch (error) {
        console.error("Error updating profile:", error);
        alert("Failed to update profile. Please try again.");
    } finally {
        updateBtn.disabled = false;
        updateBtn.innerText = originalText;
    }
}