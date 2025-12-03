/**
 * settings.js
 * Teacher Profile Settings
 */

document.addEventListener('DOMContentLoaded', () => {
    if (window.sessionManager && window.sessionManager.isLoggedIn()) {
        const user = window.sessionManager.getSession();
        document.getElementById('header-user-name').innerText = user.name;
        
        // Populate Form
        document.getElementById('set-name').value = user.name;
        document.getElementById('set-email').value = user.email;
        document.getElementById('set-phone').value = user.phone || "";
    }
});