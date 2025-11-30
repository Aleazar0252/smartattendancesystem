/**
 * student-config.js
 * Firebase Config & Student Session
 */

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
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
window.db = db;

// --- SIMULATED STUDENT SESSION ---
// This mocks a student logged in.
const currentStudent = {
    uid: "STUDENT_DEMO_ID", 
    name: "Maria Clara", 
    lrn: "123456789012",
    section: "Pearl",   // IMPORTANT: Used to fetch schedule
    gradeLevel: "10",   // IMPORTANT: Used to fetch schedule
    role: "student"
};

// Make available globally
window.currentUser = currentStudent;
console.log("Student Portal: Config Loaded for", window.currentUser.name);