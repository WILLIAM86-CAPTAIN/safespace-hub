// PWA Service Worker Registration (graceful fallback since sw.js missing)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Silently attempt to register, don't bother user with confirmation
        navigator.serviceWorker.register('sw.js')
            .catch(err => console.log('SW registration skipped'));
    });
}

// Demo users database (localStorage simulation of HIPAA-compliant storage)
const demoUsers = {
    'demo': { password: 'demo123', name: 'Demo User', email: 'demo@safehub.com', phone: '+0000000000', district: 'Demo District' },
    'user': { password: 'pass123', name: 'Safe Space User', email: 'user@safehub.com', phone: '+0000000000', district: 'Demo District' },
    'demo@safehub.com': { password: 'demo123', name: 'Demo User', email: 'demo@safehub.com', phone: '+0000000000', district: 'Demo District' },
    'user@safehub.com': { password: 'pass123', name: 'Safe Space User', email: 'user@safehub.com', phone: '+0000000000', district: 'Demo District' }
};

// Registered users saved locally in browser
let registeredUsers = {};

// Initialize app state
let currentUser = null;
let userData = { moods: [], assessments: [], sessions: 0 };

// Load user data from localStorage
function loadUserData() {
    const saved = localStorage.getItem('safehub_data');
    if (saved) userData = JSON.parse(saved);
}

// Save user data
function saveUserData() {
    localStorage.setItem('safehub_data', JSON.stringify(userData));
}

// Login handling
function initApp() {
    loadUserData();

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', registerUser);
    }
    const showSignupBtn = document.getElementById('showSignupBtn');
    const showLoginBtn = document.getElementById('showLoginBtn');
    const backToLoginBtn = document.getElementById('backToLoginBtn');
    if (showSignupBtn) showSignupBtn.addEventListener('click', showSignupPanel);
    if (showLoginBtn) showLoginBtn.addEventListener('click', showLoginPanel);
    if (backToLoginBtn) backToLoginBtn.addEventListener('click', showLoginPanel);

    // Modal handling
    document.querySelectorAll('.modal-trigger').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const modalId = trigger.dataset.modal;
            document.getElementById(modalId)?.classList.add('active');
        });
    });

    document.querySelectorAll('.modal-close').forEach(close => {
        close.addEventListener('click', () => {
            close.closest('.modal')?.classList.remove('active');
        });
    });

    // Assessment forms (shared)
    document.querySelectorAll('.assessment-form').forEach(form => {
        form.addEventListener('submit', handleAssessment);
    });

    // Load registered users from storage
    loadRegisteredUsers();

    // If already logged in, hide login overlay and show main content
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        const loginPage = document.getElementById('login-page');
        if (loginPage) loginPage.style.display = 'none';
        const main = document.getElementById('main-content');
        if (main) main.style.display = 'block';
        const welcomeUserEl = document.getElementById('welcomeUser');
        if (welcomeUserEl) {
            welcomeUserEl.textContent = `Welcome, ${currentUser.name}`;
            welcomeUserEl.style.display = 'inline';
        }
        document.getElementById('logoutBtn') && (document.getElementById('logoutBtn').style.display = 'inline-flex');
        updateProgress();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Demo login function
function showDemoLogin() {
    const uname = document.getElementById('uname-in');
    const pw = document.getElementById('pw-in');
    if (uname && pw) {
        uname.value = 'demo';
        pw.value = 'demo123';
        pw.focus();
    }
    return false;
}

function loadRegisteredUsers() {
    const saved = localStorage.getItem('safehub_users');
    if (saved) {
        try {
            registeredUsers = JSON.parse(saved);
        } catch {
            registeredUsers = {};
        }
    }
}

function saveRegisteredUsers() {
    localStorage.setItem('safehub_users', JSON.stringify(registeredUsers));
}

function findUser(login) {
    const lower = login.trim().toLowerCase();
    const demo = demoUsers[lower] || Object.values(demoUsers).find(user => user.email.toLowerCase() === lower);
    if (demo && demo.password) return demo;
    const registered = Object.entries(registeredUsers).find(([key, user]) => key.toLowerCase() === lower);
    if (registered) return registered[1];
    return Object.values(registeredUsers).find(user => user.email.toLowerCase() === lower) || null;
}

// Login handler
function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('uname-in').value.trim();
    const password = document.getElementById('pw-in').value;

    if (!username || !password) {
        alert('Please enter both username/email and password');
        return;
    }

    const user = findUser(username);
    if (!user || user.password !== password) {
        alert('❌ Invalid credentials.\n\nTry using your registered username/email and password.');
        document.getElementById('pw-in').value = '';
        document.getElementById('uname-in').focus();
        return;
    }

    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify({
        username: user.username || user.email,
        name: user.name || user.username,
        email: user.email,
        phone: user.phone || '',
        district: user.district || ''
    }));

    const loginPage = document.getElementById('login-page');
    const main = document.getElementById('main-content');
    if (loginPage) loginPage.style.display = 'none';
    if (main) main.style.display = 'block';
    const welcomeUserEl = document.getElementById('welcomeUser');
    if (welcomeUserEl) {
        welcomeUserEl.textContent = `Welcome, ${currentUser.name}`;
        welcomeUserEl.style.display = 'inline';
    }
    document.getElementById('logoutBtn') && (document.getElementById('logoutBtn').style.display = 'inline-flex');
    updateProgress();
}

// Auto-login check for protected pages (only redirect when login overlay is NOT present)
if ((window.location.pathname.includes('dashboard') || window.location.pathname.includes('assessments')) && !document.getElementById('login-page')) {
    const savedUser = localStorage.getItem('currentUser');
    if (!savedUser) {
        window.location.href = 'index.html';
    } else {
        currentUser = JSON.parse(savedUser);
        const welcomeUserEl = document.getElementById('welcomeUser');
        if (welcomeUserEl) {
            welcomeUserEl.textContent = `Welcome, ${currentUser.name}`;
        }
        updateProgress();
    }
}

// Logout
function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    // Show login overlay again
    const loginPage = document.getElementById('login-page');
    const main = document.getElementById('main-content');
    if (loginPage) loginPage.style.display = 'flex';
    if (main) main.style.display = 'none';
    document.getElementById('welcomeUser') && (document.getElementById('welcomeUser').style.display = 'none');
    document.getElementById('logoutBtn') && (document.getElementById('logoutBtn').style.display = 'none');
}

function registerUser(e) {
    e.preventDefault();
    const username = document.getElementById('signup-username').value.trim();
    const email = document.getElementById('signup-email').value.trim().toLowerCase();
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;
    const phone = document.getElementById('signup-phone').value.trim();
    const district = document.getElementById('signup-district').value.trim();

    if (!username || !email || !password || !confirm || !phone || !district) {
        alert('Please complete all fields before continuing.');
        return;
    }
    if (password !== confirm) {
        alert('Passwords do not match. Please re-enter them.');
        return;
    }
    if (demoUsers[username] || registeredUsers[username] || Object.values(registeredUsers).some(u => u.email === email)) {
        alert('This username or email is already registered. Please choose another.');
        return;
    }

    const newUser = {
        username,
        email,
        password,
        name: username,
        phone,
        district
    };
    registeredUsers[username] = newUser;
    saveRegisteredUsers();

    currentUser = newUser;
    localStorage.setItem('currentUser', JSON.stringify({
        username,
        name: username,
        email,
        phone,
        district
    }));

    const loginPanel = document.getElementById('loginPanel');
    const signupPanel = document.getElementById('signupPanel');
    const loginPage = document.getElementById('login-page');
    const main = document.getElementById('main-content');
    if (loginPanel) loginPanel.style.display = 'none';
    if (signupPanel) signupPanel.style.display = 'none';
    if (loginPage) loginPage.style.display = 'none';
    if (main) main.style.display = 'block';
    document.getElementById('welcomeUser') && (document.getElementById('welcomeUser').textContent = `Welcome, ${currentUser.name}`);
    document.getElementById('welcomeUser') && (document.getElementById('welcomeUser').style.display = 'inline');
    document.getElementById('logoutBtn') && (document.getElementById('logoutBtn').style.display = 'inline-flex');
    updateProgress();
}

function showSignupPanel() {
    const loginPanel = document.getElementById('loginPanel');
    const signupPanel = document.getElementById('signupPanel');
    const loginBtn = document.getElementById('showLoginBtn');
    const signupBtn = document.getElementById('showSignupBtn');
    if (loginPanel) loginPanel.style.display = 'none';
    if (signupPanel) signupPanel.style.display = 'block';
    if (signupBtn) {
        signupBtn.classList.add('btn-primary');
        signupBtn.classList.remove('btn-outline');
    }
    if (loginBtn) {
        loginBtn.classList.remove('btn-primary');
        loginBtn.classList.add('btn-outline');
    }
    document.getElementById('signup-username')?.focus();
}

function showLoginPanel() {
    const loginPanel = document.getElementById('loginPanel');
    const signupPanel = document.getElementById('signupPanel');
    const loginBtn = document.getElementById('showLoginBtn');
    const signupBtn = document.getElementById('showSignupBtn');
    if (loginPanel) loginPanel.style.display = 'block';
    if (signupPanel) signupPanel.style.display = 'none';
    if (loginBtn) {
        loginBtn.classList.add('btn-primary');
        loginBtn.classList.remove('btn-outline');
    }
    if (signupBtn) {
        signupBtn.classList.remove('btn-primary');
        signupBtn.classList.add('btn-outline');
    }
    document.getElementById('uname-in')?.focus();
}

function closeRegisterModal() {
    const modal = document.getElementById('registerModal');
    if (modal) modal.classList.remove('open');
    if (modal) modal.style.display = 'none';
}

// Mood tracking
function setMood(mood) {
    const timestamp = new Date().toISOString();
    userData.moods.push({ mood, timestamp });
    saveUserData();
    updateProgress();
    
    // Visual feedback
    alert(`Mood logged: ${mood.toUpperCase()}`);
    
    // Update UI
    const btn = event.target;
    btn.style.transform = 'scale(0.95)';
    setTimeout(() => btn.style.transform = '', 200);
}

// Emergency support
function emergencySupport() {
    const hotlines = [
        'National Suicide Prevention: 988',
        'Crisis Text Line: Text HOME to 741741',
        'NIMH: 1-866-615-6464'
    ];
    alert('🚨 EMERGENCY RESOURCES:\n' + hotlines.join('\\n'));
}

// AI Companion (placeholder)
function showCompanion() {
    alert('🤖 AI Companion: "Remember, you are not alone. Take a deep breath."');
}

// Progress update
function updateProgress() {
    document.getElementById('sessionsCount') && (document.getElementById('sessionsCount').textContent = userData.sessions);
    
    if (userData.moods.length) {
        const avgMood = userData.moods[userData.moods.length - 1].mood;
        document.getElementById('moodAvg') && (document.getElementById('moodAvg').textContent = avgMood.charAt(0).toUpperCase() + avgMood.slice(1));
    }
}

// Assessment scoring (PHQ9, GAD7)
function handleAssessment(e) {
    e.preventDefault();
    const form = e.target;
    const formId = form.id;
    let score = 0;
    
    // Sum radio values
    form.querySelectorAll('input[type="radio"]:checked').forEach(input => {
        score += parseInt(input.value) || 0;
    });
    
    userData.assessments.push({
        type: formId.replace('Form', ''),
        score,
        date: new Date().toISOString()
    });
    userData.sessions++;
    saveUserData();
    updateProgress();
    
    const interpretation = getScoreInterpretation(formId, score);
    alert(`Your ${formId.replace('Form', '')} score: ${score}\\n\\n${interpretation}`);
}

function getScoreInterpretation(formId, score) {
    if (formId === 'phq9Form') {
        if (score <= 4) return 'Minimal depression';
        if (score <= 9) return 'Mild depression';
        if (score <= 14) return 'Moderate depression';
        return 'Severe depression - seek professional help';
    } else if (formId === 'gad7Form') {
        if (score <= 4) return 'Minimal anxiety';
        if (score <= 9) return 'Mild anxiety';
        if (score <= 14) return 'Moderate anxiety';
        return 'Severe anxiety - seek professional help';
    }
    return 'Score calculated';
}

// Smooth scrolling for assessment anchors (dashboard links)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// Keyboard accessibility for modals/moods
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});

// Resources, LMS, Results modals (since files missing)
function showResources() {
    alert('📚 EDUCATIONAL RESOURCES:\\n• NIMH Mental Health Info: nimh.nih.gov\\n• Psychology Today: psychologytoday.com\\n• Mental Health America: mhanational.org');
}

function showLMS() {
    alert('🎓 LEARNING MODULES:\\n• Mindfulness Basics\\n• CBT Introduction\\n• Stress Management\\n(Coming soon - demo mode)');
}

function showResults() {
    const data = JSON.parse(localStorage.getItem('safehub_data') || '{}');
    if (data.assessments && data.assessments.length) {
        alert('📊 YOUR RESULTS:\\n' + data.assessments.map(a => `${a.type.toUpperCase()}: Score ${a.score}`).join('\\n'));
    } else {
        alert('No results yet. Complete an assessment first!');
    }
}

// Error boundary polyfill
window.onerror = function(msg, url, line) {
    console.error('App Error:', msg, `at ${line}`);
    return true;
};

// Expose handlers for inline HTML event bindings and deployed page scripts
window.showDemoLogin = showDemoLogin;
window.showSignupPanel = showSignupPanel;
window.showLoginPanel = showLoginPanel;
window.logout = logout;
window.handleLogin = handleLogin;
window.registerUser = registerUser;
window.showResources = showResources;
window.showLMS = showLMS;
window.showResults = showResults;

