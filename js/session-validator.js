// Session validation and authentication - COMPATIBLE WITH EXISTING SESSION MANAGER
class SessionValidator {
    constructor() {
        this.isValidating = false;
    }

    // Initialize session validation
    async initialize() {
        try {
            console.log('Initializing session validation...');
            
            // Check if user is authenticated using existing session manager
            await this.validateAuthentication();
            
            // Set up periodic validation
            this.setupPeriodicValidation();
            
            // Set up event listeners for user activity
            this.setupActivityListeners();
            
            console.log('Session validation initialized successfully');
        } catch (error) {
            console.error('Session validation initialization failed:', error);
            this.handleValidationFailure(error.message);
        }
    }

    // Validate user authentication using existing session manager
    async validateAuthentication() {
        if (this.isValidating) return;
        
        this.isValidating = true;
        
        try {
            // Check if session manager is available
            if (!window.sessionManager) {
                throw new Error('Session manager not available');
            }

            // Use existing session manager to check login status
            if (!sessionManager.isLoggedIn()) {
                throw new Error('User not authenticated');
            }

            // Get session data from existing session manager
            const session = sessionManager.getSession();
            if (!session) {
                throw new Error('No session data found');
            }

            // Verify user has admin privileges
            if (session.role !== 'admin') {
                throw new Error('Insufficient privileges. Admin access required.');
            }

            // Update UI with user info
            this.updateUserInterface(session);

            console.log('Authentication validation successful');
            
        } catch (error) {
            console.error('Authentication validation failed:', error);
            this.handleValidationFailure(error.message);
        } finally {
            this.isValidating = false;
        }
    }

    // Set up periodic session validation
    setupPeriodicValidation() {
        // Validate session every 5 minutes
        setInterval(() => {
            this.validateAuthentication();
        }, 5 * 60 * 1000);
    }

    // Set up activity listeners to maintain session
    setupActivityListeners() {
        const activityEvents = [
            'mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'
        ];

        const updateActivity = () => {
            // Use existing session manager's extendSession method if available
            if (sessionManager && sessionManager.extendSession) {
                sessionManager.extendSession();
            }
        };

        activityEvents.forEach(event => {
            document.addEventListener(event, updateActivity, { passive: true });
        });
    }

    // Update UI with user information
    updateUserInterface(session) {
        try {
            // Update admin name in header
            const adminNameElement = document.getElementById('admin-name');
            if (adminNameElement && session.firstName) {
                adminNameElement.textContent = `${session.firstName} ${session.lastName || ''}`.trim();
            }

            // Update avatar placeholder
            const avatarPlaceholder = document.querySelector('.avatar-placeholder');
            if (avatarPlaceholder && session.firstName) {
                avatarPlaceholder.textContent = session.firstName.charAt(0).toUpperCase();
            }

            // Update page title with user info
            document.title = `Admin Dashboard - ${session.firstName} - ZSNHS`;

            // Update session info in settings
            this.updateSessionInfo(session);

        } catch (error) {
            console.error('Error updating user interface:', error);
        }
    }

    // Update session information in settings panel
    updateSessionInfo(session) {
        try {
            const currentUserInfo = document.getElementById('current-user-info');
            const sessionInfo = document.getElementById('session-info');
            
            if (currentUserInfo) {
                currentUserInfo.value = `${session.firstName} ${session.lastName || ''} (${session.role})`;
            }
            
            if (sessionInfo) {
                const remainingTime = sessionManager.getRemainingSessionTime();
                sessionInfo.value = `Active - ${remainingTime} minutes remaining`;
            }
        } catch (error) {
            console.error('Error updating session info:', error);
        }
    }

    // Handle validation failure
    handleValidationFailure(message) {
        console.error('Session validation failure:', message);
        
        // Show error message to user
        this.showErrorMessage(message);
        
        // Redirect to login after delay using existing session manager
        setTimeout(() => {
            if (sessionManager && sessionManager.redirectToLogin) {
                sessionManager.redirectToLogin(message);
            } else {
                window.location.href = '../../index.html';
            }
        }, 3000);
    }

    // Show error message
    showErrorMessage(message) {
        // Remove any existing error messages
        const existingError = document.getElementById('session-error-message');
        if (existingError) {
            existingError.remove();
        }

        // Create error message element
        const errorDiv = document.createElement('div');
        errorDiv.id = 'session-error-message';
        errorDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            background: #dc3545;
            color: white;
            padding: 15px 20px;
            text-align: center;
            z-index: 10000;
            font-weight: bold;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            ${message} - Redirecting to login page...
        `;

        document.body.appendChild(errorDiv);
    }

    // Validate user permissions for specific action
    validatePermissions(requiredRole = 'admin') {
        try {
            if (!sessionManager || !sessionManager.isLoggedIn()) {
                throw new Error('User not authenticated');
            }

            const session = sessionManager.getSession();
            if (!session) {
                throw new Error('No session data found');
            }

            if (session.role !== requiredRole) {
                throw new Error(`Required role: ${requiredRole}. Current role: ${session.role}`);
            }

            return true;
        } catch (error) {
            console.error('Permission validation failed:', error);
            throw error;
        }
    }

    // Get current user info
    getCurrentUserInfo() {
        if (sessionManager && sessionManager.isLoggedIn()) {
            const session = sessionManager.getSession();
            return {
                userId: session.userId || session.id,
                email: session.email,
                firstName: session.firstName,
                lastName: session.lastName,
                userType: session.role,
                role: session.role
            };
        }
        return null;
    }

    // Check if user can perform action
    canPerformAction(action) {
        const user = this.getCurrentUserInfo();
        if (!user) return false;

        // Define action permissions based on user role
        const permissions = {
            'admin': ['manage_users', 'view_reports', 'system_settings', 'manage_all_data', 'add_teacher', 'add_student', 'add_parent', 'generate_reports'],
            'teacher': ['view_students', 'manage_grades', 'view_reports'],
            'guidance': ['view_students', 'manage_counseling', 'view_reports'],
            'student': ['view_profile', 'view_grades'],
            'parent': ['view_student_info', 'view_grades']
        };

        return permissions[user.role] && permissions[user.role].includes(action);
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

        // Update immediately and then every minute
        updateTimer();
        setInterval(updateTimer, 60000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Starting session validation...');
    
    // Create global session validator instance
    window.sessionValidator = new SessionValidator();
    
    // Initialize session validator
    sessionValidator.initialize().then(() => {
        // Start session timer after successful validation
        sessionValidator.startSessionTimer();
        
        // Show session status indicator
        const sessionStatus = document.getElementById('session-status');
        if (sessionStatus) {
            sessionStatus.style.display = 'block';
        }
    }).catch(error => {
        console.error('Failed to initialize session validator:', error);
    });
});