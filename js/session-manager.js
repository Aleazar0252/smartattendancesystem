// js/session-manager.js

class SessionManager {
    constructor() {
        this.sessionKey = "zsnhs_session_user";
        this.sessionDurations = {
            admin: 24 * 60 * 60 * 1000,
            teacher: 12 * 60 * 60 * 1000,
            student: 8 * 60 * 60 * 1000
        };
    }

    /**
     * CUSTOM LOGIN: CHECKS FIRESTORE COLLECTION DIRECTLY
     */
    async login(email, password) {
        try {
            console.log(`Searching in 'users' collection for: ${email}`);

            // 1. QUERY THE COLLECTION DIRECTLY
            // We look for a document where BOTH email and password match
            const querySnapshot = await firebase.firestore()
                .collection("users")
                .where("email", "==", email)
                .where("password", "==", password) // checking the stored password
                .get();

            // 2. CHECK IF FOUND
            if (querySnapshot.empty) {
                console.warn("No matching user found in collection.");
                throw new Error("Incorrect email or password.");
            }

            // 3. GET USER DATA
            // Since emails are unique, we take the first match
            const userDoc = querySnapshot.docs[0]; 
            const userData = userDoc.data();
            const userId = userDoc.id;

            console.log("User found!", userData);

            // 4. PREPARE SESSION DATA
            const rawRole = userData.role || "student";
            const userRole = rawRole.toLowerCase().trim();

            const sessionPayload = {
                uid: userId, // The Firestore Document ID
                email: userData.email,
                role: userRole,
                firstName: userData.firstName || "User",
                lastName: userData.lastName || "",
                isLoggedIn: true,
                sessionCreated: Date.now(),
                sessionExpires: Date.now() + (this.sessionDurations[userRole] || 8 * 60 * 60 * 1000)
            };

            // 5. SAVE SESSION
            this.saveSession(sessionPayload);
            return sessionPayload;

        } catch (error) {
            console.error("Login Error:", error);
            throw error;
        }
    }

    // --- KEEP THESE UTILITIES THE SAME ---

    saveSession(sessionData) {
        sessionStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
        localStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
    }

    getSession() {
        const data = sessionStorage.getItem(this.sessionKey) || localStorage.getItem(this.sessionKey);
        return data ? JSON.parse(data) : null;
    }

    isLoggedIn() {
        const session = this.getSession();
        if (!session || !session.isLoggedIn) return false;
        if (Date.now() > session.sessionExpires) {
            this.logout();
            return false;
        }
        return true;
    }

    logout() {
        // We don't need firebase.auth().signOut() anymore
        sessionStorage.removeItem(this.sessionKey);
        localStorage.removeItem(this.sessionKey);
        window.location.href = "../login.html"; 
    }

    getRedirectUrl(role) {
        const r = role ? role.toLowerCase() : "";
        switch (r) {
            case "admin": return "admin/admin.html";
            case "teacher": return "teacher/teacher.html";
            case "student": return "student/student.html";
            case "parent": return "parent/parent.html";
            case "guidance": return "guidance/guidance.html";
            default: return "index.html";
        }
    }
}

// Initialize
window.sessionManager = new SessionManager();