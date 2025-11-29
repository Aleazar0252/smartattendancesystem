// login-script.js - FIREBASE FIRESTORE ONLY VERSION
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Login page loaded - Firestore Only');
    
    // Wait for Firebase Firestore to be ready
    if (window.firestoreDb) {
        initializeApp();
    } else {
        window.onFirebaseReady = initializeApp;
        console.log('⏳ Waiting for Firestore to initialize...');
    }
});

function initializeApp() {
    console.log('✅ Firestore is ready, initializing login page...');
    
    // Check for redirect messages
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    if (message) {
        showMessage(decodeURIComponent(message), 'success');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Check if already logged in with Firestore session
    if (window.sessionManager && window.sessionManager.isLoggedIn()) {
        const session = window.sessionManager.getSession();
        console.log('✅ User already logged in via Firestore:', session);
        
        if (session.mustChangePassword) {
            window.location.href = 'change-password.html';
            return;
        }
        
        const displayName = session.name || session.email || 'User';
        showMessage(`Welcome back ${displayName}! Redirecting...`, 'success');
        
        setTimeout(() => {
            const dashboardUrl = window.sessionManager.getDashboardUrl(session.role);
            window.location.href = dashboardUrl;
        }, 1500);
        return;
    }
    
    console.log('🔐 No existing Firestore session, showing login form');
    initializeLoginPage();
}

function initializeLoginPage() {
    console.log("🔄 Initializing Firestore login page components...");
    
    const loginForm = document.getElementById('loginForm');
    const togglePassword = document.getElementById('togglePassword');

    if (!loginForm) {
        console.error('❌ Login form not found');
        return;
    }

    // Password toggle functionality
    if (togglePassword) {
        const passwordInput = document.getElementById('password');
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }

    loginForm.addEventListener('submit', handleLogin);
    
    createParticles();
    console.log('✅ Firestore login page initialized');
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const loginBtn = document.getElementById('loginBtn');

    console.log('🔐 Firestore login attempt for email:', email);

    // Clear previous messages
    clearMessages();

    // Validation
    if (!email || !password) {
        showMessage('Please fill in all fields', 'error');
        return;
    }

    if (!isValidEmail(email)) {
        showMessage('Please enter a valid email address', 'error');
        return;
    }

    // Show loading state
    setButtonLoading(loginBtn, true);

    try {
        if (!window.firestoreDb) {
            throw new Error('Firestore database not connected. Please refresh the page.');
        }

        // Use Firestore authentication only
        console.log('📚 Attempting Firestore authentication...');
        const userData = await authenticateWithFirestore(email, password);

        if (!userData) {
            showMessage('Invalid email or password', 'error');
            await handleFailedLoginAttempt(email);
            return;
        }

        // Check account status from Firestore
        if (userData.status === 'inactive') {
            showMessage('This account has been deactivated. Please contact administrator.', 'error');
            return;
        }

        // Check if account is locked in Firestore
        if (userData.lockedUntil) {
            const lockTime = userData.lockedUntil.toDate();
            const now = new Date();
            if (now < lockTime) {
                const remainingMinutes = Math.ceil((lockTime - now) / (1000 * 60));
                showMessage(`Account temporarily locked. Try again in ${remainingMinutes} minutes.`, 'error');
                return;
            }
        }

        // Reset login attempts on successful login in Firestore
        if (userData.id) {
            await resetLoginAttempts(userData.id);
        }

        // Update last login in Firestore
        if (userData.id) {
            await updateLastLogin(userData.id);
        }

        // DEBUG: Log all user data from Firestore
        console.log('🔍 COMPLETE USER DATA FROM FIRESTORE:', userData);
        console.log('🔍 User role from Firestore:', userData.role);
        console.log('🔍 User role type:', typeof userData.role);
        console.log('🔍 All user keys:', Object.keys(userData));

        console.log('💾 Creating Firestore session with data:', userData);

        // Create session with Firestore data
        const sessionCreated = window.sessionManager.createSession(userData);
        
        if (sessionCreated) {
            const displayName = userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email.split('@')[0];
            
            if (userData.mustChangePassword) {
                console.log('🔐 Redirecting to password change page from Firestore data');
                showMessage(`Welcome ${displayName}! Please set your new password.`, 'success');
                
                setTimeout(() => {
                    window.location.href = 'change-password.html';
                }, 1500);
            } else {
                console.log('✅ Firestore login successful, preparing redirect...');
                
                // DEBUG: Check what dashboard URL we're getting
                const dashboardUrl = window.sessionManager.getDashboardUrl(userData.role);
                console.log('🎯 Final dashboard URL to redirect to:', dashboardUrl);
                console.log('🔍 Current page:', window.location.href);
                
                showMessage(`Welcome ${displayName}! Redirecting to dashboard...`, 'success');
                
                setTimeout(() => {
                    console.log('🚀 Executing redirect to:', dashboardUrl);
                    window.location.href = dashboardUrl;
                }, 1500);
            }
        } else {
            throw new Error('Failed to create Firestore session');
        }

    } catch (error) {
        console.error('❌ Firestore login error:', error);
        showMessage('Login failed: ' + error.message, 'error');
    } finally {
        // Reset button state
        setButtonLoading(loginBtn, false);
    }
}

// Firestore authentication only - NO STATIC DATA
async function authenticateWithFirestore(email, password) {
    try {
        console.log('📚 Querying Firestore for user:', email);

        const querySnapshot = await window.firestoreDb.collection("users")
            .where("email", "==", email.toLowerCase())
            .get();

        console.log('📊 Found', querySnapshot.size, 'users in Firestore');

        if (querySnapshot.empty) {
            console.log('❌ User not found in Firestore');
            return null;
        }

        let userData = null;
        let userId = null;
        let passwordMatch = false;

        querySnapshot.forEach((doc) => {
            const user = doc.data();
            userId = doc.id;
            
            console.log('👤 Firestore user data:', { 
                id: userId,
                email: user.email, 
                hasPassword: !!user.password,
                role: user.role,
                status: user.status,
                mustChangePassword: user.mustChangePassword,
                loginAttempts: user.loginAttempts
            });
            
            // Check password against Firestore - direct comparison
            if (user.password === password) {
                userData = user;
                passwordMatch = true;
                console.log('✅ Firestore password matched');
            } else {
                console.log('❌ Firestore password does not match');
                console.log('🔑 Firestore stored:', user.password);
                console.log('🔑 User entered:', password);
            }
        });

        if (passwordMatch && userData) {
            return {
                id: userId,
                ...userData
            };
        } else {
            console.log('❌ Firestore authentication failed');
            return null;
        }

    } catch (error) {
        console.error('❌ Firestore authentication error:', error);
        throw new Error('Database error: ' + error.message);
    }
}

async function handleFailedLoginAttempt(email) {
    try {
        console.log('⚠️ Handling failed login attempt for:', email);
        
        const querySnapshot = await window.firestoreDb.collection("users")
            .where("email", "==", email.toLowerCase())
            .get();

        if (!querySnapshot.empty) {
            let userId = null;
            let currentAttempts = 0;
            
            querySnapshot.forEach((doc) => {
                userId = doc.id;
                currentAttempts = doc.data().loginAttempts || 0;
                console.log(`📊 Current login attempts in Firestore: ${currentAttempts}`);
            });

            if (userId) {
                await incrementLoginAttempts(userId, currentAttempts);
            }
        }
    } catch (error) {
        console.warn('⚠️ Could not handle failed login attempt in Firestore:', error);
    }
}

async function resetLoginAttempts(userId) {
    try {
        await window.firestoreDb.collection("users").doc(userId).update({
            loginAttempts: 0,
            lockedUntil: null,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ Firestore login attempts reset');
    } catch (error) {
        console.warn('⚠️ Could not reset login attempts in Firestore:', error);
    }
}

async function incrementLoginAttempts(userId, currentAttempts) {
    try {
        const newAttempts = (currentAttempts || 0) + 1;
        let updateData = {
            loginAttempts: newAttempts,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Lock account in Firestore after 5 failed attempts for 15 minutes
        if (newAttempts >= 5) {
            const lockUntil = new Date();
            lockUntil.setMinutes(lockUntil.getMinutes() + 15);
            updateData.lockedUntil = firebase.firestore.Timestamp.fromDate(lockUntil);
            console.log('🔒 Account locked in Firestore until:', lockUntil);
        }

        await window.firestoreDb.collection("users").doc(userId).update(updateData);
        console.log(`⚠️ Firestore login attempts increased to: ${newAttempts}`);
        
    } catch (error) {
        console.warn('⚠️ Could not increment login attempts in Firestore:', error);
    }
}

async function updateLastLogin(userId) {
    try {
        await window.firestoreDb.collection("users").doc(userId).update({
            lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ Firestore last login updated');
    } catch (error) {
        console.warn('⚠️ Could not update last login in Firestore:', error);
    }
}

function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.classList.add('loading');
    } else {
        button.disabled = false;
        button.classList.remove('loading');
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function clearMessages() {
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    
    if (errorMessage) {
        errorMessage.classList.remove('show');
        errorMessage.textContent = '';
    }
    
    if (successMessage) {
        successMessage.classList.remove('show');
        successMessage.textContent = '';
    }
}

function showMessage(message, type) {
    clearMessages();

    const messageElement = type === 'error' ? 
        document.getElementById('errorMessage') : 
        document.getElementById('successMessage');
    
    if (messageElement) {
        messageElement.textContent = message;
        messageElement.classList.add('show');
        
        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                messageElement.classList.remove('show');
            }, 5000);
        }
    }
}

function createParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;

    const particleCount = 20;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');

        const size = Math.random() * 8 + 4;
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;
        const delay = Math.random() * 5;
        const duration = Math.random() * 10 + 10;

        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${posX}%`;
        particle.style.top = `${posY}%`;
        particle.style.animation = `float ${duration}s ease-in-out ${delay}s infinite`;
        particlesContainer.appendChild(particle);
    }
}