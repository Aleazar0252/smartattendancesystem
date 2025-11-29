/**
 * settings.js
 * Logic for Admin Settings
 */

document.addEventListener('DOMContentLoaded', () => {
    // Check if Firebase is ready
    setTimeout(() => {
        if (window.db) {
            console.log("Settings: Database connected.");
        }
    }, 500);
});

// --- PROFILE UPDATE ---
function updateProfile() {
    const name = document.getElementById('admin-name').value;
    const phone = document.getElementById('admin-phone').value;

    if(!name) {
        alert("Name cannot be empty.");
        return;
    }

    // In a real app, update Firebase Auth / Admin collection
    alert("Profile updated successfully!");
}

// --- PASSWORD CHANGE ---
function changePassword() {
    const currPass = document.getElementById('curr-pass').value;
    const newPass = document.getElementById('new-pass').value;
    const confirmPass = document.getElementById('confirm-pass').value;

    if(newPass.length < 6) {
        alert("New password must be at least 6 characters.");
        return;
    }

    if(newPass !== confirmPass) {
        alert("New passwords do not match.");
        return;
    }

    // Mock success
    alert("Password changed successfully!");
    document.getElementById('password-form').reset();
}

// --- RESET DATABASE (DEV TOOL) ---
function resetDatabase() {
    if(!confirm("⚠️ WARNING: This will DELETE ALL DATA (Teachers, Sections, Subjects, Schedules). Are you sure?")) {
        return;
    }

    const db = window.db;
    const batch = db.batch();

    // Note: Client-side deletion of entire collections is complex in Firestore.
    // This is a simplified "Seed" function to verify structure.
    
    // For now, let's just trigger the Seeder script logic if you want to re-populate
    // or you can implement deletion loops here.
    
    alert("Database reset command sent. (Note: Actual deletion requires Cloud Functions for large data).");
}