/**
 * parent-config.js
 * Firebase Config & Parent Session
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

// --- SIMULATED PARENT SESSION ---
// This mocks a parent logged in who has a child enrolled.
// We store the child's details here so we can fetch their specific data.
const currentParent = {
    uid: "PARENT_DEMO_ID", 
    name: "Don Crisostomo Ibarra", 
    role: "parent",
    // Child Details (In a real app, you'd fetch this linking logic)
    childName: "Maria Clara",
    childSection: "Pearl",   // Used to fetch the schedule
    childGrade: "10"
};

// Make available globally
window.currentUser = currentParent;
console.log("Parent Portal: Config Loaded for", window.currentUser.name);