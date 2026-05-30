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
    'demo': { password: 'demo123', name: 'Demo User', email: 'demo@safehub.com' },
    'user': { password: 'pass123', name: 'Safe Space User', email: 'user@safehub.com' },
    'demo@safehub.com': { password: 'demo123', name: 'Demo User', email: 'demo@safehub.com' },
    'user@safehub.com': { password: 'pass123', name: 'Safe Space User', email: 'user@safehub.com' }
};

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
document.addEventListener('DOMContentLoaded', function() {
    loadUserData();
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Modal handling
    document.querySelectorAll('.modal-trigger').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const modalId = trigger.dataset.modal;
            document.getElementById(modalId).classList.add('active');
        });
    });
    
    document.querySelectorAll('.modal-close').forEach(close => {
        close.addEventListener('click', () => {
            close.closest('.modal').classList.remove('active');
        });
    });
    
    // Assessment forms (shared)
    document.querySelectorAll('.assessment-form').forEach(form => {
        form.addEventListener('submit', handleAssessment);
    });
});

// Demo login function
function showDemoLogin() {
    document.getElementById('uname-in').value = 'demo';
    document.getElementById('pw-in').value = 'demo123';
    // Focus on password field so user can just hit Enter
    document.getElementById('pw-in').focus();
    return false;
}

// Login handler
function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('uname-in').value.trim();
    const password = document.getElementById('pw-in').value;
    
    // Validate input
    if (!username || !password) {
        alert('Please enter both username and password');
        return;
    }
    
    // Check credentials
    if (demoUsers[username] && demoUsers[username].password === password) {
        currentUser = demoUsers[username];
        localStorage.setItem('currentUser', JSON.stringify({
            username: username,
            name: currentUser.name,
            email: currentUser.email
        }));
        console.log('Login successful, redirecting to dashboard...');
        window.location.href = 'dashboard.html';
    } else {
        alert('❌ Invalid credentials.\n\nTry:\nUsername: demo\nPassword: demo123\n\nor\n\nUsername: user\nPassword: pass123');
        document.getElementById('pw-in').value = '';
        document.getElementById('uname-in').focus();
    }
}

// Auto-login check for protected pages
if (window.location.pathname.includes('dashboard') || window.location.pathname.includes('assessments')) {
    const savedUser = localStorage.getItem('currentUser');
    if (!savedUser) {
        window.location.href = 'index.html';
    } else {
        currentUser = JSON.parse(savedUser);
        document.getElementById('welcomeUser')?.textContent = `Welcome, ${currentUser.name}`;
        updateProgress();
    }
}

// Logout
function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
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

