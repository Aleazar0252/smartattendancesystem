document.addEventListener('DOMContentLoaded', () => {
    if(window.currentUser) {
        document.getElementById('header-user-name').innerText = window.currentUser.name;
        document.getElementById('grade-student-name').innerText = window.currentUser.childName;
    }
    // Future: Fetch grades from Firestore based on student ID
});