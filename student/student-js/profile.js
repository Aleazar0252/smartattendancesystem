document.addEventListener('DOMContentLoaded', () => {
    if (window.sessionManager && window.sessionManager.isLoggedIn()) {
        const user = window.sessionManager.getSession();
        document.getElementById('header-user-name').innerText = user.name;
        
        document.getElementById('profile-fullname').innerText = user.name;
        document.getElementById('profile-id').innerText = `ID: ${user.uid}`;
        document.getElementById('prof-grade').value = user.gradeLevel || "N/A";
        document.getElementById('prof-section').value = user.section || "N/A";
        document.getElementById('prof-lrn').value = user.lrn || "N/A";
        document.getElementById('prof-email').value = user.email || "N/A";
    }
});