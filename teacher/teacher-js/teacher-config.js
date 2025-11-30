/**
 * teacher-config.js
 * Firebase Config & Session Management for Teachers
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

// --- SIMULATED SESSION ---
// In production, replace this with firebase.auth().onAuthStateChanged()
const currentTeacher = {
    uid: "TEACHER_DEMO_ID", 
    name: "Juan Dela Cruz", // MUST MATCH 'teacher' field in classSessions
    email: "juan@zsnhs.edu.ph",
    role: "teacher"
};

// Make available globally
window.currentUser = currentTeacher;
console.log("Teacher Portal: Config Loaded for", window.currentUser.name);