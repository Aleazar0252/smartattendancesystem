// js/firebase-config.js

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

// Initialize Services
const auth = firebase.auth();
const db = firebase.firestore();

// Make them available globally
window.auth = auth;
window.db = db;

console.log("✅ Firebase Initialized");