/**
 * session-manager.js
 * Handles Session Logic and Folder Redirections
 */

class SessionManager {
    constructor() {
        this.sessionKey = 'zsnhs_user'; // Standardized key
    }

    // 1. Create Session
    createSession(userData) {
        try {
            const sessionData = {
                uid: userData.id || userData.userId, // Handle both ID formats
                docId: userData.id,
                name: userData.name || `${userData.firstName} ${userData.lastName}`,
                email: userData.email,
                role: (userData.role || 'student').toLowerCase(),
                section: userData.section || null,
                gradeLevel: userData.gradeLevel || null,
                isLoggedIn: true,
                loginTime: new Date().getTime()
            };
            
            sessionStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
            
            // Set global variable immediately for the current page
            window.currentUser = sessionData;
            
            console.log(`✅ Session created for: ${sessionData.email} (${sessionData.role})`);
            return true;
        } catch (error) {
            console.error('❌ Error creating session:', error);
            return false;
        }
    }

    // 2. Get Session
    getSession() {
        try {
            const data = sessionStorage.getItem(this.sessionKey);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            return null;
        }
    }

    // 3. Check Login Status
    isLoggedIn() {
        return !!this.getSession();
    }

    // 4. Get Correct URL (FIXED FOLDER PATHS)
    getDashboardUrl(role) {
        const r = role.toLowerCase();
        
        // These paths assume you are currently at the root (index.html)
        const dashboards = {
            'admin': 'admin/admin.html',
            'teacher': 'teacher/teacher.html',     // Points to folder/file
            'student': 'student/student.html',     // Points to folder/file
            'parent': 'parent/parent.html',        // Points to folder/file
            'guidance': 'guidance/guidance.html'   // Points to folder/file
        };
        
        return dashboards[r] || 'index.html';
    }

    // 5. Logout
    logout() {
        sessionStorage.removeItem(this.sessionKey);
        localStorage.removeItem(this.sessionKey);
        
        // Check if we are inside a subfolder
        const path = window.location.pathname;
        if (path.includes('/admin/') || path.includes('/teacher/') || 
            path.includes('/student/') || path.includes('/parent/') || 
            path.includes('/guidance/')) {
            window.location.href = '../index.html'; 
        } else {
            window.location.href = 'index.html'; 
        }
    }
}

// Initialize
window.sessionManager = new SessionManager();

// Auto-restore on load
document.addEventListener('DOMContentLoaded', () => {
    const session = window.sessionManager.getSession();
    if(session) {
        window.currentUser = session;
        console.log("Session restored for:", session.name);
    }
});