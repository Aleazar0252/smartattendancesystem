/**
 * guidance-config.js
 * Firebase Config & Guidance Session
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

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
window.db = db;

// --- SIMULATED GUIDANCE SESSION ---
const currentGuidance = {
    uid: "GUIDANCE_DEMO_ID", 
    name: "Ms. Guidance Counselor", 
    role: "guidance",
    email: "guidance@zsnhs.edu.ph"
};

window.currentUser = currentGuidance;
console.log("Guidance Portal: Config Loaded for", window.currentUser.name);