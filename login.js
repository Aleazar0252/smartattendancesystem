// login.js

document.addEventListener('DOMContentLoaded', () => {
    
    // Check if already logged in (Auto-Redirect)
    if (window.sessionManager && window.sessionManager.isLoggedIn()) {
        const user = window.sessionManager.getSession();
        const url = window.sessionManager.getRedirectUrl(user.role);
        window.location.href = url;
        return;
    }

    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const btnText = loginBtn ? loginBtn.querySelector('.btn-text') : null;
    const btnLoader = loginBtn ? loginBtn.querySelector('.btn-loader') : null;
    const errorMsg = document.getElementById('errorMessage');
    
    createParticles(); // Create background particles

    // 2. Handle Form Submit
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            // UI Loading State (Start)
            setLoading(true);
            showError(''); // Clear previous errors

            try {
                // Call Session Manager (FIXED in session-manager.js)
                const user = await window.sessionManager.login(email, password);
                
                // Success! Redirect
                const redirectUrl = window.sessionManager.getRedirectUrl(user.role);
                window.location.href = redirectUrl;

            } catch (error) {
                // Failure! (This block will now execute correctly)
                setLoading(false); // Stop loading animation
                showError(error.message); // Display the user-friendly error
            }
        });
    }

    // Helper: Button Loading State (FIXED)
    function setLoading(isLoading) {
        if (!loginBtn || !btnText || !btnLoader) return;

        if (isLoading) {
            loginBtn.disabled = true;
            btnText.style.display = 'none';
            btnLoader.style.display = 'inline';
        } else {
            loginBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
        }
    }

    // Helper: Show Error Message
    function showError(msg) {
        if (errorMsg) {
            errorMsg.textContent = msg;
            errorMsg.classList.toggle('show', !!msg);
        }
    }
    
    // Helper: Particle Creation
    function createParticles() {
        const particlesContainer = document.getElementById('particles');
        if (!particlesContainer) return;

        const particleCount = 20;
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');

            const size = Math.random() * 8 + 4;
            const posX = Math.random() * 100;
            const delay = Math.random() * 5;
            const duration = Math.random() * 10 + 10;

            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${posX}%`;
            particle.style.animationDelay = `${delay}s`;
            particle.style.animationDuration = `${duration}s`;
            
            particlesContainer.appendChild(particle);
        }
    }
    
    // Toggle Password Visibility
    const togglePass = document.getElementById('togglePassword');
    const passInput = document.getElementById('password');
    if(togglePass && passInput) {
        togglePass.addEventListener('click', () => {
            const type = passInput.type === 'password' ? 'text' : 'password';
            passInput.type = type;
            togglePass.classList.toggle('fa-eye');
            togglePass.classList.toggle('fa-eye-slash');
        });
    }
});