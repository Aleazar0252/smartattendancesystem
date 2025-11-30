document.addEventListener('DOMContentLoaded', () => {
    if(window.currentUser) {
        document.getElementById('header-user-name').innerText = window.currentUser.name;
    }
    // Logic to fetch real grades would go here once a 'grades' collection exists
});