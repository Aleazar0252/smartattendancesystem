/**
 * settings.js (Teacher) - UPDATED
 * Features: Fetches latest profile data & Handles "Save Changes" for Phone Number.
 */

document.addEventListener('DOMContentLoaded', () => {
    if (window.sessionManager && window.sessionManager.isLoggedIn()) {
        const user = window.sessionManager.getSession();
        const userId = user.userId || user.uid || user.id;

        if (!userId) {
            console.error("User ID missing from session.");
            return;
        }

        // Display Header Name immediately from session (fast load)
        document.getElementById('header-user-name').innerText = user.name || "Teacher";

        // 1. Fetch Fresh Data (to get latest phone number)
        loadTeacherProfile(userId);

        // 2. Handle Form Submission
        const saveBtn = document.getElementById('save-settings-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                e.preventDefault(); // Stop page reload
                updateTeacherProfile(userId);
            });
        }
    } else {
        window.location.href = '../index.html';
    }
});

async function loadTeacherProfile(userId) {
    try {
        const doc = await window.db.collection('users').doc(userId).get();
        
        if (doc.exists) {
            const data = doc.data();
            
            // Populate Inputs
            // We use names from DB if available, otherwise fall back to session
            const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.name;
            
            document.getElementById('set-name').value = fullName;
            document.getElementById('set-email').value = data.email || "";
            document.getElementById('set-phone').value = data.phone || "";
            
            // Update Header Name just in case DB is newer
            document.getElementById('header-user-name').innerText = data.firstName || "Teacher";
        }
    } catch (e) {
        console.error("Error loading profile:", e);
    }
}

async function updateTeacherProfile(userId) {
    const saveBtn = document.getElementById('save-settings-btn');
    const phoneInput = document.getElementById('set-phone');
    
    const newPhone = phoneInput.value.trim();
    const originalText = saveBtn.innerText;

    // UI Loading State
    saveBtn.disabled = true;
    saveBtn.innerText = "Saving...";

    try {
        // Update Firestore
        await window.db.collection('users').doc(userId).update({
            phone: newPhone,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Update Local Session (Optional but good practice)
        const currentSession = window.sessionManager.getSession();
        currentSession.phone = newPhone;
        // If your session manager supports updating session, do it here.
        // Otherwise, it will just refresh on next login.
        
        alert("Settings saved successfully!");

    } catch (e) {
        console.error("Error saving settings:", e);
        alert("Failed to save settings. Please try again.");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = originalText;
    }
}