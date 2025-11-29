// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDlClfbOSKAhalafAQ4ptMRCHkaG-DxDd8",
    authDomain: "zsnhs-24e44.firebaseapp.com",
    databaseURL: "https://zsnhs-24e44-default-rtdb.firebaseio.com",
    projectId: "zsnhs-24e44",
    storageBucket: "zsnhs-24e44.firebasestorage.app",
    messagingSenderId: "39166648924",
    appId: "1:39166648924:web:d65f2e83e6143a5aff7c99",
    measurementId: "G-C9JMD4C5WB"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();

// Make db available globally
window.db = db;

console.log('Firebase initialized successfully');

document.addEventListener('DOMContentLoaded', function() {
        // 1. Get current page filename (e.g., "teacher.html")
        const currentPage = window.location.pathname.split("/").pop();

        // 2. Find all links in the sidebar
        const navLinks = document.querySelectorAll('.nav-sub-item');

        navLinks.forEach(link => {
            // 3. Check if the link's href matches the current page
            if (link.getAttribute('href') === currentPage) {
                
                // Add 'active' class to the link
                link.classList.add('active');

                // 4. Open the parent dropdown
                const parentDropdown = link.closest('.nav-dropdown');
                if (parentDropdown) {
                    parentDropdown.classList.add('show');
                    
                    // 5. Rotate the arrow icon on the main button
                    const dropdownTrigger = parentDropdown.previousElementSibling;
                    if (dropdownTrigger) {
                        dropdownTrigger.classList.add('dropdown-open');
                    }
                }
            }
        });
    });