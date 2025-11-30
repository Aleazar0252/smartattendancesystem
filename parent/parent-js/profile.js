document.addEventListener('DOMContentLoaded', () => {
    if(window.currentUser) {
        document.getElementById('header-user-name').innerText = window.currentUser.name;
        
        // Populate fields
        document.getElementById('prof-name').value = window.currentUser.name;
        document.getElementById('prof-child').value = window.currentUser.childName;
        document.getElementById('prof-section').value = window.currentUser.childSection;
    }
});