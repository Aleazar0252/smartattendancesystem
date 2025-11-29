// session-manager.js - UPDATED VERSION WITH ROLE-BASED SESSIONS
class SessionManager {
    constructor() {
        this.sessionKey = 'userSession';
        // Role-based session durations (BEST APPROACH)
        this.sessionDurations = {
            'admin': 24 * 60 * 60 * 1000,    // 24 hours - trusted staff
            'teacher': 24 * 60 * 60 * 1000,  // 24 hours - trusted staff  
            'guidance': 24 * 60 * 60 * 1000, // 24 hours - trusted staff
            'student': 8 * 60 * 60 * 1000,   // 8 hours - school computers
            'parent': 4 * 60 * 60 * 1000     // 4 hours - public/home devices
        };
    }

    // Create session with role-based duration
    createSession(userData) {
        try {
            const userRole = userData.role || 'student';
            const sessionDuration = this.sessionDurations[userRole] || this.sessionDurations.student;
            
            const sessionData = {
                ...userData,
                isLoggedIn: true,
                sessionCreated: new Date().getTime(),
                sessionExpires: new Date().getTime() + sessionDuration,
                sessionDuration: sessionDuration // Store for reference
            };
            
            sessionStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
            console.log(`✅ ${userRole.toUpperCase()} session created for:`, userData.email);
            console.log(`⏰ Session duration: ${sessionDuration / (60 * 60 * 1000)} hours`);
            return true;
        } catch (error) {
            console.error('❌ Error creating session:', error);
            return false;
        }
    }

    // Check if user is logged in
    isLoggedIn() {
        try {
            const session = this.getSession();
            if (!session || !session.isLoggedIn) {
                return false;
            }

            // Check if session has expired
            const now = new Date().getTime();
            if (now > session.sessionExpires) {
                this.clearSession();
                return false;
            }

            return true;
        } catch (error) {
            console.error('❌ Error checking session:', error);
            return false;
        }
    }

    // Get current session data
    getSession() {
        try {
            const sessionData = sessionStorage.getItem(this.sessionKey);
            return sessionData ? JSON.parse(sessionData) : null;
        } catch (error) {
            console.error('❌ Error getting session:', error);
            return null;
        }
    }

    // Clear session (logout)
    clearSession(message = '') {
        try {
            sessionStorage.removeItem(this.sessionKey);
            console.log('✅ Session cleared');
            
            if (message) {
                const redirectUrl = `login.html?message=${encodeURIComponent(message)}`;
                window.location.href = redirectUrl;
            }
        } catch (error) {
            console.error('❌ Error clearing session:', error);
        }
    }

    // Check if user has specific role
    hasRole(requiredRole) {
        const session = this.getSession();
        return session && session.role === requiredRole;
    }

    // Check if user has any of the specified roles
    hasAnyRole(requiredRoles) {
        const session = this.getSession();
        return session && requiredRoles.includes(session.role);
    }

    // Check if user must change password (HYBRID feature)
    mustChangePassword() {
        const session = this.getSession();
        return session && session.mustChangePassword === true;
    }

    // Redirect to login with optional message
    redirectToLogin(message = '') {
        const loginUrl = message ? 
            `login.html?message=${encodeURIComponent(message)}` : 
            'login.html';
        window.location.href = loginUrl;
    }

    // Get dashboard URL based on user role
    getDashboardUrl(role) {
        const dashboards = {
            'admin': 'admin/admin.html',
            'teacher': 'teacher/teacher.html', 
            'student': 'student/student.html',
            'guidance': 'guidance/guidance.html',
            'parent': 'parent/parent.html'
        };
        
        return dashboards[role] || 'student.html';
    }

    // Set admin session (for admin pages)
    setAdminSession() {
        const session = this.getSession();
        if (!session || session.role !== 'admin') {
            this.redirectToLogin('Administrator access required');
            return false;
        }
        return true;
    }

    // Protect page - redirect if not logged in or wrong role
    protectPage(allowedRoles = []) {
        if (!this.isLoggedIn()) {
            this.redirectToLogin('Please login to access this page');
            return false;
        }

        const session = this.getSession();
        
        // HYBRID: Check if password change is required
        if (session.mustChangePassword && !window.location.href.includes('change-password.html')) {
            window.location.href = 'change-password.html';
            return false;
        }
        
        // If specific roles are required, check them
        if (allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
            this.redirectToLogin('You do not have permission to access this page');
            return false;
        }

        return true;
    }

    // Extend session (uses role-based duration)
    extendSession() {
        if (this.isLoggedIn()) {
            const session = this.getSession();
            const userRole = session.role || 'student';
            const sessionDuration = this.sessionDurations[userRole] || this.sessionDurations.student;
            
            session.sessionExpires = new Date().getTime() + sessionDuration;
            sessionStorage.setItem(this.sessionKey, JSON.stringify(session));
        }
    }

    // Get remaining session time in minutes
    getRemainingSessionTime() {
        if (!this.isLoggedIn()) return 0;
        
        const session = this.getSession();
        const now = new Date().getTime();
        const remaining = session.sessionExpires - now;
        
        return Math.max(0, Math.floor(remaining / (60 * 1000)));
    }

    // Get session duration in hours for current user
    getSessionDurationHours() {
        if (!this.isLoggedIn()) return 0;
        
        const session = this.getSession();
        const userRole = session.role || 'student';
        const sessionDuration = this.sessionDurations[userRole] || this.sessionDurations.student;
        
        return sessionDuration / (60 * 60 * 1000);
    }

    // Auto-extend session on user activity
    setupAutoExtend() {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        
        const extendSession = () => {
            this.extendSession();
        };

        events.forEach(event => {
            document.addEventListener(event, extendSession, { passive: true });
        });
    }
}

// Initialize global session manager
window.sessionManager = new SessionManager();