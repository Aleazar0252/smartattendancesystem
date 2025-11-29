// Session validation and authentication
class SessionValidator {
    constructor() {
        this.isValidating = false;
    }

    // Initialize session validation
    async initialize() {
        try {
            // Check if user is authenticated
            await this.validateAuthentication();
            
            // Set up periodic validation (every 5 mins)
            this.setupPeriodicValidation();
            
            // Set up activity listeners
            this.setupActivityListeners();
            
        } catch (error) {
            console.error('Session validation failed:', error);
            this.handleValidationFailure(error.message);
        }
    }

    // Validate user authentication AND Role
    async validateAuthentication() {
        if (this.isValidating) return;
        this.isValidating = true;
        
        try {
            if (!window.sessionManager) {
                throw new Error('Session manager not available');
            }

            // 1. Check if Logged In
            if (!sessionManager.isLoggedIn()) {
                throw new Error('User not authenticated');
            }

            // 2. Get Session Data
            const session = sessionManager.getSession();
            if (!session) {
                throw new Error('No session data found');
            }

            // 3. CHECK ROLE BASED ON CURRENT PAGE (The Fix)
            // We check the URL to see what folder we are in
            const currentPath = window.location.pathname.toLowerCase();
            const userRole = session.role; // e.g., 'teacher', 'admin'

            // Define rules: If URL contains 'x', User Role must be 'x'
            if (currentPath.includes('/admin/') && userRole !== 'admin') {
                throw new Error('Access Denied: Admins only.');
            }
            else if (currentPath.includes('/teacher/') && userRole !== 'teacher') {
                throw new Error('Access Denied: Teachers only.');
            }
            else if (currentPath.includes('/student/') && userRole !== 'student') {
                throw new Error('Access Denied: Students only.');
            }
            // Add other roles as needed...

            // 4. Update UI
            this.updateUserInterface(session);
            
        } catch (error) {
            console.error('Validation failed:', error);
            this.handleValidationFailure(error.message);
        } finally {
            this.isValidating = false;
        }
    }

    // --- UTILITIES (Kept the same) ---

    setupPeriodicValidation() {
        setInterval(() => this.validateAuthentication(), 5 * 60 * 1000);
    }

    setupActivityListeners() {
        const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        const updateActivity = () => {
            if (sessionManager && sessionManager.extendSession) {
                sessionManager.extendSession();
            }
        };
        activityEvents.forEach(evt => document.addEventListener(evt, updateActivity, { passive: true }));
    }

    updateUserInterface(session) {
        try {
            // Generic updater for Name and Avatar
            const nameEls = document.querySelectorAll('.user-name, #admin-name, #teacher-name, #student-name');
            nameEls.forEach(el => el.textContent = `${session.firstName} ${session.lastName || ''}`);

            const avatarEls = document.querySelectorAll('.avatar-placeholder');
            avatarEls.forEach(el => el.textContent = session.firstName.charAt(0).toUpperCase());

            // Update Page Title
            document.title = `${session.role.charAt(0).toUpperCase() + session.role.slice(1)} Dashboard`;

        } catch (error) {
            console.warn('UI Update minor error:', error);
        }
    }

    handleValidationFailure(message) {
        // Show error and Redirect to login
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; 
            background: #dc3545; color: white; padding: 15px; 
            text-align: center; z-index: 9999; font-weight: bold;
        `;
        errorDiv.textContent = `${message} Redirecting...`;
        document.body.appendChild(errorDiv);

        setTimeout(() => {
            // Go back to root login
            window.location.href = window.location.origin + '/login.html'; 
        }, 2000);
    }
    
    // Start session timer display
    startSessionTimer() {
        const updateTimer = () => {
            if (sessionManager && sessionManager.getRemainingSessionTime) {
                const remaining = sessionManager.getRemainingSessionTime();
                const timerElement = document.getElementById('session-timer');
                if (timerElement) {
                    const hours = Math.floor(remaining / 60);
                    const minutes = remaining % 60;
                    timerElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
                }
            }
        };
        updateTimer();
        setInterval(updateTimer, 60000);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.sessionValidator = new SessionValidator();
    sessionValidator.initialize().then(() => {
        sessionValidator.startSessionTimer();
    });
});