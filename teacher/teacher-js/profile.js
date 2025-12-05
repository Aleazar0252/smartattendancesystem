/**
 * profile.js
 * Guidance Profile Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    if (window.sessionManager && window.sessionManager.isLoggedIn()) {
        const user = window.sessionManager.getSession();
        
        // Security Check
        if(user.role !== 'guidance') {
            window.location.href = '../index.html';
            return;
        }

        // Populate Header
        document.getElementById('header-user-name').innerText = user.name;
        
        // Populate Form
        document.getElementById('profile-fullname').innerText = user.name;
        document.getElementById('prof-name').value = user.name;
        document.getElementById('prof-email').value = user.email;
        document.getElementById('prof-phone').value = user.phone || ""; // Load if exists
    } else {
        window.location.href = '../index.html';
    }
});

function saveProfile() {
    const phone = document.getElementById('prof-phone').value;
    const pass = document.getElementById('prof-pass').value;
    const user = window.sessionManager.getSession();

    const btn = document.querySelector('.btn-primary');
    btn.innerText = "Saving...";
    btn.disabled = true;

    // Build update object
    let updates = { phone: phone };
    if(pass) updates.password = pass;

    // Update Firestore
    window.db.collection('users').doc(user.docId).update(updates)
    .then(() => {
        alert("Profile Updated Successfully!");
        
        // Update Local Session with new Phone
        user.phone = phone;
        window.sessionManager.setSession(user);
    })
    .catch(err => {
        console.error(err);
        alert("Error updating profile: " + err.message);
    })
    .finally(() => {
        btn.innerText = "Save Changes";
        btn.disabled = false;
    });
}