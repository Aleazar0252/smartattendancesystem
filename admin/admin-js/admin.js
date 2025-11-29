// Global variables
let currentData = {
    teachers: [],
    students: [],
    parents: [],
    guidance: [],
    admins: []
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing ZSNHS Admin Dashboard...');
    initializeApp();
});

// Initialize application
async function initializeApp() {
    try {
        console.log('Starting app initialization...');
        
        // Check if Firebase is initialized
        if (!window.db) {
            console.warn('Firebase not initialized yet, waiting...');
            setTimeout(initializeApp, 500);
            return;
        }
        
        console.log('Firebase is ready, setting up application...');
        
        // Setup mobile menu
        setupMobileMenu();
        
        // Setup modal close functionality
        setupModals();
        
        // Setup navigation
        setupNavigation();
        
        // Load all data from Firestore
        await loadAllData();
        
        // Update notification count
        updateNotificationCount();
        
        // Set database status to connected
        const dbStatus = document.getElementById('db-status');
        if (dbStatus) {
            dbStatus.value = 'Connected ✓';
        }
        
        console.log('Application initialized successfully');
        
    } catch (error) {
        console.error('Error initializing application:', error);
        showError('Failed to initialize application: ' + error.message);
        const dbStatus = document.getElementById('db-status');
        if (dbStatus) {
            dbStatus.value = 'Connection failed ✗';
        }
    }
}

// Setup mobile menu functionality
function setupMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    } else {
        console.warn('Mobile menu elements not found');
    }
}

// Setup modal close functionality
function setupModals() {
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Close modal with escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                modal.style.display = 'none';
            });
        }
    });
}

// Setup navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const sectionId = this.getAttribute('data-section');
            if (sectionId) {
                showSection(sectionId);
            }
        });
    });
}

// Load all data from Firestore
async function loadAllData() {
    try {
        console.log('Loading all data from Firestore...');
        
        // Load dashboard overview data from users collection
        await loadDashboardData();
        
        // Load all user data by type
        await loadUsersByType();
        
        // Update reports section
        updateReportsSection();
        
    } catch (error) {
        console.error('Error loading data:', error);
        showError('Failed to load data from Firestore: ' + error.message);
    }
}

// Load dashboard data from users collection
async function loadDashboardData() {
    try {
        const statsGrid = document.getElementById('stats-grid');
        if (!statsGrid) {
            console.error('Stats grid element not found');
            return;
        }
        
        // Show loading state
        statsGrid.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>Loading users data from Firestore...</p>
            </div>
        `;

        console.log('Fetching users data from Firestore...');
        
        // Get all users from the users collection
        const usersSnapshot = await db.collection('users').get();
        
        if (usersSnapshot.empty) {
            updateDashboardStats({
                totalUsers: 0,
                teachers: 0,
                students: 0,
                parents: 0,
                guidance: 0,
                admins: 0
            });
            return;
        }
        
        // Count users by type
        let teachersCount = 0;
        let studentsCount = 0;
        let parentsCount = 0;
        let guidanceCount = 0;
        let adminsCount = 0;

        usersSnapshot.forEach(doc => {
            const user = doc.data();
            const userType = getUserType(user);
            
            switch (userType) {
                case 'teacher':
                    teachersCount++;
                    break;
                case 'student':
                    studentsCount++;
                    break;
                case 'parent':
                    parentsCount++;
                    break;
                case 'guidance':
                    guidanceCount++;
                    break;
                case 'admin':
                    adminsCount++;
                    break;
                default:
                    studentsCount++;
            }
        });

        const totalUsers = teachersCount + studentsCount + parentsCount + guidanceCount + adminsCount;

        console.log('Users data loaded from users collection:', {
            totalUsers: totalUsers,
            teachers: teachersCount,
            students: studentsCount,
            parents: parentsCount,
            guidance: guidanceCount,
            admins: adminsCount
        });

        // Update dashboard with real user data
        updateDashboardStats({
            totalUsers: totalUsers,
            teachers: teachersCount,
            students: studentsCount,
            parents: parentsCount,
            guidance: guidanceCount,
            admins: adminsCount
        });

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('Failed to load users data: ' + error.message);
        
        // Show error state
        updateDashboardStats({
            totalUsers: 0,
            teachers: 0,
            students: 0,
            parents: 0,
            guidance: 0,
            admins: 0
        });
    }
}

// Helper function to determine user type
function getUserType(user) {
    // Check multiple possible field names for user type
    const userType = user.userType || user.role || user.type || user.user_role;
    
    if (!userType) return 'student';
    
    const type = userType.toString().toLowerCase().trim();
    
    if (type.includes('teacher') || type.includes('faculty')) return 'teacher';
    if (type.includes('student') || type.includes('learner')) return 'student';
    if (type.includes('parent') || type.includes('guardian')) return 'parent';
    if (type.includes('guidance') || type.includes('counselor')) return 'guidance';
    if (type.includes('admin') || type.includes('administrator')) return 'admin';
    
    return type;
}

// Load all users data by type from users collection
async function loadUsersByType() {
    try {
        console.log('Loading users by type from users collection...');
        
        const usersSnapshot = await db.collection('users').get();
        
        if (usersSnapshot.empty) {
            console.log('No users found in the database');
            return;
        }
        
        // Reset current data
        currentData.teachers = [];
        currentData.students = [];
        currentData.parents = [];
        currentData.guidance = [];
        currentData.admins = [];

        usersSnapshot.forEach(doc => {
            const user = doc.data();
            const userData = { 
                id: doc.id,
                userId: user.userId || doc.id,
                ...user 
            };
            
            const userType = getUserType(user);

            switch (userType) {
                case 'teacher':
                    currentData.teachers.push(userData);
                    break;
                case 'student':
                    currentData.students.push(userData);
                    break;
                case 'parent':
                    currentData.parents.push(userData);
                    break;
                case 'guidance':
                    currentData.guidance.push(userData);
                    break;
                case 'admin':
                    currentData.admins.push(userData);
                    break;
                default:
                    currentData.students.push(userData);
            }
        });

        console.log('Users loaded by type:', {
            teachers: currentData.teachers.length,
            students: currentData.students.length,
            parents: currentData.parents.length,
            guidance: currentData.guidance.length,
            admins: currentData.admins.length
        });

        // Update the UI with the loaded data
        await updateUsersUI();

    } catch (error) {
        console.error('Error loading users by type:', error);
        showError('Failed to load users by type: ' + error.message);
    }
}

// Update UI with loaded user data
async function updateUsersUI() {
    try {
        // Update teachers list
        await updateTeachersList();
        
        // Update students list
        await updateStudentsList();
        
        // Update parents list
        await updateParentsList();
        
        // Update guidance list
        await updateGuidanceList();
        
        // Update recent activity
        await updateRecentActivity();
        
    } catch (error) {
        console.error('Error updating UI:', error);
    }
}

// Update teachers list
async function updateTeachersList() {
    const teachersList = document.getElementById('teachers-list');
    if (!teachersList) return;

    if (currentData.teachers.length === 0) {
        teachersList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chalkboard-teacher"></i>
                <h3>No Teachers Found</h3>
                <p>No teacher users found in the users collection.</p>
                <p>Add users with type "teacher" to see them here.</p>
            </div>
        `;
    } else {
        let teachersHTML = '';
        currentData.teachers.forEach(teacher => {
            teachersHTML += `
                <div class="list-card">
                    <h3>${formatName(teacher)}</h3>
                    <p><strong>User ID:</strong> ${teacher.userId || teacher.id}</p>
                    ${teacher.email ? `<p><strong>Email:</strong> ${teacher.email}</p>` : ''}
                    ${teacher.department ? `<p><strong>Department:</strong> ${teacher.department}</p>` : ''}
                    ${teacher.subject ? `<p><strong>Subject:</strong> ${teacher.subject}</p>` : ''}
                    ${teacher.employeeId ? `<p><strong>Employee ID:</strong> ${teacher.employeeId}</p>` : ''}
                    <p><strong>User Type:</strong> ${getUserType(teacher)}</p>
                    <div class="document-info">
                        <small><strong>Document ID:</strong> ${teacher.id}</small>
                        <small><strong>Last Updated:</strong> ${formatTimestamp(teacher.updatedAt || teacher.createdAt)}</small>
                    </div>
                </div>
            `;
        });
        teachersList.innerHTML = teachersHTML;
    }
}

// Update students list
async function updateStudentsList() {
    const studentsList = document.getElementById('students-list');
    if (!studentsList) return;

    if (currentData.students.length === 0) {
        studentsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-graduate"></i>
                <h3>No Students Found</h3>
                <p>No student users found in the users collection.</p>
                <p>Add users with type "student" to see them here.</p>
            </div>
        `;
    } else {
        let studentsHTML = '';
        currentData.students.forEach(student => {
            studentsHTML += `
                <div class="list-card">
                    <h3>${formatName(student)}</h3>
                    <p><strong>User ID:</strong> ${student.userId || student.id}</p>
                    ${student.email ? `<p><strong>Email:</strong> ${student.email}</p>` : ''}
                    ${student.gradeLevel ? `<p><strong>Grade Level:</strong> ${student.gradeLevel}</p>` : ''}
                    ${student.section ? `<p><strong>Section:</strong> ${student.section}</p>` : ''}
                    ${student.lrn ? `<p><strong>LRN:</strong> ${student.lrn}</p>` : ''}
                    ${student.strand ? `<p><strong>Strand:</strong> ${student.strand}</p>` : ''}
                    <p><strong>User Type:</strong> ${getUserType(student)}</p>
                    <div class="document-info">
                        <small><strong>Document ID:</strong> ${student.id}</small>
                        <small><strong>Last Updated:</strong> ${formatTimestamp(student.updatedAt || student.createdAt)}</small>
                    </div>
                </div>
            `;
        });
        studentsList.innerHTML = studentsHTML;
    }
}

// Update parents list
async function updateParentsList() {
    const parentsList = document.getElementById('parents-list');
    if (!parentsList) return;

    if (currentData.parents.length === 0) {
        parentsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>No Parents Found</h3>
                <p>No parent users found in the users collection.</p>
                <p>Add users with type "parent" to see them here.</p>
            </div>
        `;
    } else {
        let parentsHTML = '';
        currentData.parents.forEach(parent => {
            parentsHTML += `
                <div class="list-card">
                    <h3>${formatName(parent)}</h3>
                    <p><strong>User ID:</strong> ${parent.userId || parent.id}</p>
                    ${parent.email ? `<p><strong>Email:</strong> ${parent.email}</p>` : ''}
                    ${parent.phone ? `<p><strong>Phone:</strong> ${parent.phone}</p>` : ''}
                    ${parent.studentName ? `<p><strong>Student Name:</strong> ${parent.studentName}</p>` : ''}
                    ${parent.studentId ? `<p><strong>Student ID:</strong> ${parent.studentId}</p>` : ''}
                    ${parent.relationship ? `<p><strong>Relationship:</strong> ${parent.relationship}</p>` : ''}
                    <p><strong>User Type:</strong> ${getUserType(parent)}</p>
                    <div class="document-info">
                        <small><strong>Document ID:</strong> ${parent.id}</small>
                        <small><strong>Last Updated:</strong> ${formatTimestamp(parent.updatedAt || parent.createdAt)}</small>
                    </div>
                </div>
            `;
        });
        parentsList.innerHTML = parentsHTML;
    }
}

// Update guidance list
async function updateGuidanceList() {
    const guidanceList = document.getElementById('guidance-list');
    if (!guidanceList) return;

    if (currentData.guidance.length === 0) {
        guidanceList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-hands-helping"></i>
                <h3>No Guidance Counselors Found</h3>
                <p>No guidance counselor users found in the users collection.</p>
                <p>Add users with type "guidance" to see them here.</p>
            </div>
        `;
    } else {
        let guidanceHTML = '';
        currentData.guidance.forEach(counselor => {
            guidanceHTML += `
                <div class="list-card">
                    <h3>${formatName(counselor)}</h3>
                    <p><strong>User ID:</strong> ${counselor.userId || counselor.id}</p>
                    ${counselor.email ? `<p><strong>Email:</strong> ${counselor.email}</p>` : ''}
                    ${counselor.department ? `<p><strong>Department:</strong> ${counselor.department}</p>` : ''}
                    ${counselor.specialization ? `<p><strong>Specialization:</strong> ${counselor.specialization}</p>` : ''}
                    ${counselor.license ? `<p><strong>License Number:</strong> ${counselor.license}</p>` : ''}
                    <p><strong>User Type:</strong> ${getUserType(counselor)}</p>
                    <div class="document-info">
                        <small><strong>Document ID:</strong> ${counselor.id}</small>
                        <small><strong>Last Updated:</strong> ${formatTimestamp(counselor.updatedAt || counselor.createdAt)}</small>
                    </div>
                </div>
            `;
        });
        guidanceList.innerHTML = guidanceHTML;
    }
}

// Update recent activity
async function updateRecentActivity() {
    const recentActivity = document.getElementById('recent-activity');
    if (!recentActivity) return;

    try {
        // Get recent users (last 10 created)
        const recentUsersSnapshot = await db.collection('users')
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();

        if (recentUsersSnapshot.empty) {
            recentActivity.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <h3>No Recent Activity</h3>
                    <p>No user activity found in the database.</p>
                </div>
            `;
            return;
        }

        let activitiesHTML = '';
        recentUsersSnapshot.forEach(doc => {
            const user = doc.data();
            const userType = getUserType(user);
            const action = user.createdAt ? 'Registered' : 'Added';
            const time = formatTimestamp(user.createdAt) || 'Recently';
            
            activitiesHTML += `
                <div class="list-card">
                    <h3>${formatName(user)}</h3>
                    <p><strong>Action:</strong> ${action}</p>
                    <p><strong>Type:</strong> ${userType.charAt(0).toUpperCase() + userType.slice(1)}</p>
                    <p><strong>Time:</strong> ${time}</p>
                    <p><strong>User ID:</strong> ${user.userId || doc.id}</p>
                </div>
            `;
        });
        
        recentActivity.innerHTML = activitiesHTML;

    } catch (error) {
        console.error('Error loading recent activity:', error);
        recentActivity.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error Loading Activity</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Update reports section - THIS WAS THE MISSING FUNCTION
function updateReportsSection() {
    const teachersCount = document.getElementById('teachers-report-count');
    const studentsCount = document.getElementById('students-report-count');
    const parentsCount = document.getElementById('parents-report-count');
    
    if (teachersCount) teachersCount.textContent = currentData.teachers.length;
    if (studentsCount) studentsCount.textContent = currentData.students.length;
    if (parentsCount) parentsCount.textContent = currentData.parents.length;
}

// Update dashboard statistics
function updateDashboardStats(stats) {
    const statsGrid = document.getElementById('stats-grid');
    if (!statsGrid) {
        console.error('Stats grid element not found');
        return;
    }
    
    statsGrid.innerHTML = `
        <div class="stat-card">
            <i class="fas fa-users"></i>
            <h3>Total Users</h3>
            <div class="number">${stats.totalUsers}</div>
        </div>

        <div class="stat-card">
            <i class="fas fa-chalkboard-teacher"></i>
            <h3>Teachers</h3>
            <div class="number">${stats.teachers}</div>
        </div>

        <div class="stat-card">
            <i class="fas fa-user-graduate"></i>
            <h3>Students</h3>
            <div class="number">${stats.students}</div>
        </div>

        <div class="stat-card">
            <i class="fas fa-user-shield"></i>
            <h3>Admins</h3>
            <div class="number">${stats.admins}</div>
        </div>

        <div class="stat-card">
            <i class="fas fa-users"></i>
            <h3>Parents</h3>
            <div class="number">${stats.parents}</div>
        </div>

        <div class="stat-card">
            <i class="fas fa-hands-helping"></i>
            <h3>Guidance</h3>
            <div class="number">${stats.guidance}</div>
        </div>
    `;
    
    // Animate numbers
    animateNumbers();
}

// Show section function
function showSection(sectionId) {
    console.log('Showing section:', sectionId);
    
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Show selected section
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
    } else {
        console.error('Section not found:', sectionId);
    }

    // Activate corresponding nav item
    const activeNavItem = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }

    // Close mobile menu
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
    }
}

// Modal functions
function showAddTeacherModal() {
    const modal = document.getElementById('add-teacher-modal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function showAddStudentModal() {
    const modal = document.getElementById('add-student-modal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function showAddParentModal() {
    const modal = document.getElementById('add-parent-modal');
    if (modal) {
        modal.style.display = 'block';
    } else {
        // Fallback to student modal if parent modal doesn't exist
        showAddStudentModal();
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Add new teacher to users collection
async function addNewTeacher() {
    try {
        const teacherId = document.getElementById('teacher-id')?.value;
        const firstName = document.getElementById('teacher-firstname')?.value;
        const lastName = document.getElementById('teacher-lastname')?.value;
        const email = document.getElementById('teacher-email')?.value;
        const department = document.getElementById('teacher-department')?.value;
        const employeeId = document.getElementById('teacher-employeeid')?.value;

        if (!teacherId || !firstName || !lastName || !email) {
            alert('Please fill in all required fields (ID, First Name, Last Name, Email)');
            return;
        }

        const teacherData = {
            userId: teacherId,
            firstName: firstName,
            lastName: lastName,
            email: email,
            department: department || 'General',
            employeeId: employeeId || '',
            userType: 'teacher',
            role: 'teacher',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('users').doc(teacherId).set(teacherData);
        
        showSuccess('Teacher added successfully!');
        closeModal('add-teacher-modal');
        
        // Clear form
        const form = document.getElementById('add-teacher-form');
        if (form) form.reset();
        
        // Reload all data
        await loadAllData();
        
    } catch (error) {
        console.error('Error adding teacher:', error);
        showError('Failed to add teacher: ' + error.message);
    }
}

// Add new student to users collection
async function addNewStudent() {
    try {
        const studentId = document.getElementById('student-id')?.value;
        const firstName = document.getElementById('student-firstname')?.value;
        const lastName = document.getElementById('student-lastname')?.value;
        const gradeLevel = document.getElementById('student-grade')?.value;
        const section = document.getElementById('student-section')?.value;
        const lrn = document.getElementById('student-lrn')?.value;

        if (!studentId || !firstName || !lastName || !gradeLevel || !section) {
            alert('Please fill in all required fields (ID, First Name, Last Name, Grade Level, Section)');
            return;
        }

        const studentData = {
            userId: studentId,
            firstName: firstName,
            lastName: lastName,
            gradeLevel: gradeLevel,
            section: section,
            lrn: lrn || '',
            userType: 'student',
            role: 'student',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('users').doc(studentId).set(studentData);
        
        showSuccess('Student added successfully!');
        closeModal('add-student-modal');
        
        // Clear form
        const form = document.getElementById('add-student-form');
        if (form) form.reset();
        
        // Reload all data
        await loadAllData();
        
    } catch (error) {
        console.error('Error adding student:', error);
        showError('Failed to add student: ' + error.message);
    }
}

// Add new parent to users collection
async function addNewParent() {
    try {
        const parentId = document.getElementById('parent-id')?.value;
        const firstName = document.getElementById('parent-firstname')?.value;
        const lastName = document.getElementById('parent-lastname')?.value;
        const email = document.getElementById('parent-email')?.value;
        const phone = document.getElementById('parent-phone')?.value;
        const studentName = document.getElementById('parent-student')?.value;
        const relationship = document.getElementById('parent-relationship')?.value;

        if (!parentId || !firstName || !lastName) {
            alert('Please fill in all required fields (ID, First Name, Last Name)');
            return;
        }

        const parentData = {
            userId: parentId,
            firstName: firstName,
            lastName: lastName,
            email: email || '',
            phone: phone || '',
            studentName: studentName || '',
            relationship: relationship || 'Parent',
            userType: 'parent',
            role: 'parent',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('users').doc(parentId).set(parentData);
        
        showSuccess('Parent added successfully!');
        closeModal('add-parent-modal');
        
        // Clear form
        const form = document.getElementById('add-parent-form');
        if (form) form.reset();
        
        // Reload all data
        await loadAllData();
        
    } catch (error) {
        console.error('Error adding parent:', error);
        showError('Failed to add parent: ' + error.message);
    }
}

// Search functions
function searchTeachers() {
    const searchTerm = document.getElementById('teacher-search')?.value.toLowerCase() || '';
    const filteredTeachers = currentData.teachers.filter(teacher => 
        formatName(teacher).toLowerCase().includes(searchTerm) ||
        (teacher.email && teacher.email.toLowerCase().includes(searchTerm)) ||
        (teacher.department && teacher.department.toLowerCase().includes(searchTerm)) ||
        (teacher.employeeId && teacher.employeeId.toLowerCase().includes(searchTerm)) ||
        (teacher.userId && teacher.userId.toLowerCase().includes(searchTerm))
    );
    displaySearchResults('teachers-list', filteredTeachers, 'teacher');
}

function searchStudents() {
    const searchTerm = document.getElementById('student-search')?.value.toLowerCase() || '';
    const filteredStudents = currentData.students.filter(student => 
        formatName(student).toLowerCase().includes(searchTerm) ||
        (student.email && student.email.toLowerCase().includes(searchTerm)) ||
        (student.gradeLevel && student.gradeLevel.toLowerCase().includes(searchTerm)) ||
        (student.section && student.section.toLowerCase().includes(searchTerm)) ||
        (student.lrn && student.lrn.toLowerCase().includes(searchTerm)) ||
        (student.userId && student.userId.toLowerCase().includes(searchTerm))
    );
    displaySearchResults('students-list', filteredStudents, 'student');
}

function searchParents() {
    const searchTerm = document.getElementById('parent-search')?.value.toLowerCase() || '';
    const filteredParents = currentData.parents.filter(parent => 
        formatName(parent).toLowerCase().includes(searchTerm) ||
        (parent.email && parent.email.toLowerCase().includes(searchTerm)) ||
        (parent.phone && parent.phone.toLowerCase().includes(searchTerm)) ||
        (parent.studentName && parent.studentName.toLowerCase().includes(searchTerm)) ||
        (parent.relationship && parent.relationship.toLowerCase().includes(searchTerm)) ||
        (parent.userId && parent.userId.toLowerCase().includes(searchTerm))
    );
    displaySearchResults('parents-list', filteredParents, 'parent');
}

// Display search results
function displaySearchResults(containerId, items, type) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>No ${type}s Found</h3>
                <p>No matching ${type}s found for your search criteria.</p>
                <p>Try different search terms or check the users collection.</p>
            </div>
        `;
        return;
    }

    let html = '';
    items.forEach(item => {
        const userType = getUserType(item);
        html += `
            <div class="list-card">
                <h3>${formatName(item)}</h3>
                <p><strong>User ID:</strong> ${item.userId || item.id}</p>
                ${item.email ? `<p><strong>Email:</strong> ${item.email}</p>` : ''}
                ${item.department ? `<p><strong>Department:</strong> ${item.department}</p>` : ''}
                ${item.gradeLevel ? `<p><strong>Grade Level:</strong> ${item.gradeLevel}</p>` : ''}
                ${item.section ? `<p><strong>Section:</strong> ${item.section}</p>` : ''}
                ${item.phone ? `<p><strong>Phone:</strong> ${item.phone}</p>` : ''}
                <p><strong>User Type:</strong> ${userType}</p>
                <div class="document-info">
                    <small><strong>Document ID:</strong> ${item.id}</small>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Report generation functions
function generateTeachersReport() {
    if (currentData.teachers.length === 0) {
        alert('No teacher data available to generate report.');
        return;
    }
    
    const reportData = currentData.teachers.map(teacher => ({
        'User ID': teacher.userId || teacher.id,
        'Name': formatName(teacher),
        'Email': teacher.email || 'N/A',
        'Department': teacher.department || 'N/A',
        'Employee ID': teacher.employeeId || 'N/A',
        'User Type': getUserType(teacher),
        'Document ID': teacher.id
    }));
    
    downloadCSV(reportData, 'teachers_report.csv');
    showSuccess('Teachers report generated successfully!');
}

function generateStudentsReport() {
    if (currentData.students.length === 0) {
        alert('No student data available to generate report.');
        return;
    }
    
    const reportData = currentData.students.map(student => ({
        'User ID': student.userId || student.id,
        'Name': formatName(student),
        'Email': student.email || 'N/A',
        'Grade Level': student.gradeLevel || 'N/A',
        'Section': student.section || 'N/A',
        'LRN': student.lrn || 'N/A',
        'User Type': getUserType(student),
        'Document ID': student.id
    }));
    
    downloadCSV(reportData, 'students_report.csv');
    showSuccess('Students report generated successfully!');
}

function generateParentsReport() {
    if (currentData.parents.length === 0) {
        alert('No parent data available to generate report.');
        return;
    }
    
    const reportData = currentData.parents.map(parent => ({
        'User ID': parent.userId || parent.id,
        'Name': formatName(parent),
        'Email': parent.email || 'N/A',
        'Phone': parent.phone || 'N/A',
        'Student Name': parent.studentName || 'N/A',
        'Relationship': parent.relationship || 'N/A',
        'User Type': getUserType(parent),
        'Document ID': parent.id
    }));
    
    downloadCSV(reportData, 'parents_report.csv');
    showSuccess('Parents report generated successfully!');
}

// Download CSV function
function downloadCSV(data, filename) {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Test database connection
async function testDatabaseConnection() {
    try {
        const dbStatus = document.getElementById('db-status');
        if (dbStatus) {
            dbStatus.value = 'Testing connection...';
        }
        
        // Test connection by trying to read from users collection
        const testSnapshot = await db.collection('users').limit(1).get();
        
        if (dbStatus) {
            dbStatus.value = 'Connected ✓';
        }
        showSuccess(`Database connection successful! Found ${testSnapshot.size} users in collection.`);
        
    } catch (error) {
        const dbStatus = document.getElementById('db-status');
        if (dbStatus) {
            dbStatus.value = 'Connection failed ✗';
        }
        showError('Database connection failed: ' + error.message);
    }
}

// ========== HELPER FUNCTIONS ==========

function formatName(user) {
    if (user.firstName && user.lastName) {
        return `${user.firstName} ${user.lastName}`;
    } else if (user.name) {
        return user.name;
    } else if (user.email) {
        return user.email.split('@')[0];
    } else {
        return 'Unnamed User';
    }
}

function formatTimestamp(timestamp) {
    if (!timestamp) return 'Unknown';
    
    try {
        if (timestamp.toDate) {
            // Firestore timestamp
            const date = timestamp.toDate();
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        } else if (typeof timestamp === 'string') {
            // String timestamp
            return new Date(timestamp).toLocaleString();
        } else if (typeof timestamp === 'number') {
            // Unix timestamp
            return new Date(timestamp).toLocaleString();
        }
    } catch (error) {
        console.error('Error formatting timestamp:', error);
    }
    
    return 'Invalid Date';
}

function animateNumbers() {
    const statNumbers = document.querySelectorAll('.number');
    statNumbers.forEach(number => {
        const target = parseInt(number.textContent);
        if (isNaN(target)) return;
        
        let current = 0;
        const increment = target / 30;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                clearInterval(timer);
                current = target;
            }
            number.textContent = Math.floor(current);
        }, 30);
    });
}

function updateNotificationCount() {
    const totalNotifications = currentData.teachers.length + currentData.students.length + currentData.parents.length;
    const notificationCount = document.getElementById('notification-count');
    if (notificationCount) {
        notificationCount.textContent = totalNotifications > 99 ? '99+' : totalNotifications;
    }
}

function showError(message) {
    console.error('Error:', message);
    // Create a simple error notification
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #dc3545;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 1000;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        max-width: 400px;
    `;
    errorDiv.innerHTML = `
        <strong>Error:</strong> ${message}
    `;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
}

function showSuccess(message) {
    console.log('Success:', message);
    // Create a simple success notification
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 1000;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        max-width: 400px;
    `;
    successDiv.innerHTML = `
        <strong>Success:</strong> ${message}
    `;
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.parentNode.removeChild(successDiv);
        }
    }, 3000);
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // In a real app, you would sign out from Firebase Auth here
        // For now, just reload the page
        window.location.reload();
    }
}

// Refresh data function
async function refreshData() {
    try {
        showSuccess('Refreshing data from Firestore...');
        await loadAllData();
    } catch (error) {
        showError('Failed to refresh data: ' + error.message);
    }
}

// Make functions globally available
window.showSection = showSection;
window.showAddTeacherModal = showAddTeacherModal;
window.showAddStudentModal = showAddStudentModal;
window.showAddParentModal = showAddParentModal;
window.closeModal = closeModal;
window.addNewTeacher = addNewTeacher;
window.addNewStudent = addNewStudent;
window.addNewParent = addNewParent;
window.searchTeachers = searchTeachers;
window.searchStudents = searchStudents;
window.searchParents = searchParents;
window.generateTeachersReport = generateTeachersReport;
window.generateStudentsReport = generateStudentsReport;
window.generateParentsReport = generateParentsReport;
window.testDatabaseConnection = testDatabaseConnection;
window.logout = logout;
window.refreshData = refreshData;