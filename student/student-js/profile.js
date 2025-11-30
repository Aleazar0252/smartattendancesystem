document.addEventListener('DOMContentLoaded', () => {
    if(window.currentUser) {
        document.getElementById('header-user-name').innerText = window.currentUser.name;
        
        // Populate fields
        document.getElementById('prof-lrn').value = window.currentUser.lrn;
        document.getElementById('prof-name').value = window.currentUser.name;
        document.getElementById('prof-grade').value = window.currentUser.gradeLevel;
        document.getElementById('prof-section').value = window.currentUser.section;
    }
});