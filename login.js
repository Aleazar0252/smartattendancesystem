/**
 * login.js
 * Connects Login Form to Firestore
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Login page loaded');
    
    // Check if DB is ready (it should be if firebase-config.js is loaded)
    if (window.db) {
        initializeLoginPage();
    } else {
        // Fallback wait
        setTimeout(() => {
            if(window.db) initializeLoginPage();
            else console.error("Database failed to load.");
        }, 1000);
    }
});

function initializeLoginPage() {
    // Check if already logged in
    if (window.sessionManager && window.sessionManager.isLoggedIn()) {
        const session = window.sessionManager.getSession();
        console.log('User already logged in. Redirecting...');
        window.location.href = window.sessionManager.getDashboardUrl(session.role);
        return;
    }

    const loginForm = document.getElementById('loginForm');
    const togglePassword = document.getElementById('togglePassword');

    // Toggle Password Visibility
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const passwordInput = document.getElementById('password');
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    createParticles();
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const loginBtn = document.getElementById('loginBtn');

    // Basic Validation
    if (!email || !password) {
        showMessage('Please fill in all fields', 'error');
        return;
    }

    setButtonLoading(loginBtn, true);

    try {
        if (!window.db) throw new Error('Database not connected.');

        console.log('🔍 Searching user:', email);

        // QUERY FIRESTORE
        const querySnapshot = await window.db.collection("users")
            .where("email", "==", email)
            .where("password", "==", password) // Direct password check (matches Admin manual entry)
            .get();

        if (querySnapshot.empty) {
            showMessage('Invalid email or password.', 'error');
            setButtonLoading(loginBtn, false);
            return;
        }

        // USER FOUND
        const doc = querySnapshot.docs[0];
        const userData = { id: doc.id, ...doc.data() };

        // Check Status
        if (userData.status === 'Archived' || userData.status === 'Inactive') {
            showMessage('This account is inactive. Contact Admin.', 'error');
            setButtonLoading(loginBtn, false);
            return;
        }

        // Create Session
        window.sessionManager.createSession(userData);

        // Redirect
        const dashboardUrl = window.sessionManager.getDashboardUrl(userData.role);
        showMessage(`Welcome, ${userData.firstName}! Redirecting...`, 'success');

        setTimeout(() => {
            window.location.href = dashboardUrl;
        }, 1000);

    } catch (error) {
        console.error('Login Error:', error);
        showMessage('System Error: ' + error.message, 'error');
        setButtonLoading(loginBtn, false);
    }
}

// --- HELPER FUNCTIONS ---

function setButtonLoading(button, isLoading) {
    const text = button.querySelector('.btn-text');
    const loader = button.querySelector('.btn-loader');
    
    if (isLoading) {
        button.disabled = true;
        if(text) text.style.display = 'none';
        if(loader) loader.style.display = 'inline-block';
    } else {
        button.disabled = false;
        if(text) text.style.display = 'inline-block';
        if(loader) loader.style.display = 'none';
    }
}

function showMessage(message, type) {
    const errorEl = document.getElementById('errorMessage');
    // Using alert for success to keep it simple, or reuse your error div
    if(type === 'error') {
        errorEl.textContent = message;
        errorEl.classList.add('show');
    } else {
        // Success
        errorEl.style.backgroundColor = '#28a745';
        errorEl.textContent = message;
        errorEl.classList.add('show');
    }
}

function createParticles() {
    const container = document.getElementById('particles');
    if(!container) return;
    
    for (let i = 0; i < 15; i++) {
        const p = document.createElement('div');
        p.classList.add('particle');
        p.style.left = Math.random() * 100 + '%';
        p.style.top = Math.random() * 100 + '%';
        p.style.animationDelay = Math.random() * 5 + 's';
        container.appendChild(p);
    }
}