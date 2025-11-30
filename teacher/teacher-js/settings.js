/**
 * settings.js
 * Manages profile display and updates
 */

document.addEventListener('DOMContentLoaded', () => {
    if(window.currentUser) {
        document.getElementById('header-user-name').innerText = window.currentUser.name;
        
        // Populate Form
        document.getElementById('set-name').value = window.currentUser.name;
        document.getElementById('set-email').value = window.currentUser.email;
        
        // Mock phone number since it's not in our simple config
        document.getElementById('set-phone').value = "09123456789";
    }
});

function saveSettings() {
    const phone = document.getElementById('set-phone').value;
    const pass = document.getElementById('set-pass').value;
    
    // In a real app, you would update Firebase here using currentUser.uid
    // For this demo:
    
    alert("Profile Updated Successfully!\n\n(Note: This is a demo. In a real app, this would update the database.)");
    
    if(pass) {
        console.log("Password changed to:", pass);
    }
}