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

let assessmentState = null;
const assessmentLibrary = {
    phq9: {
        title: 'PHQ-9 Depression Screening',
        questions: [
            'Little interest or pleasure in doing things?',
            'Feeling down, depressed, or hopeless?',
            'Trouble falling or staying asleep, or sleeping too much?',
            'Feeling tired or having little energy?',
            'Poor appetite or overeating?',
            'Feeling bad about yourself — or that you are a failure or have let yourself or your family down?',
            'Trouble concentrating on things, such as reading or watching television?',
            'Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual?',
            'Thoughts that you would be better off dead or of hurting yourself in some way?'
        ],
        labels: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'],
        interpret(score) {
            if (score <= 4) return 'Minimal depression';
            if (score <= 9) return 'Mild depression';
            if (score <= 14) return 'Moderate depression';
            return 'Severe depression - seek professional help';
        }
    },
    gad7: {
        title: 'GAD-7 Anxiety Assessment',
        questions: [
            'Feeling nervous, anxious, or on edge?',
            'Not being able to stop or control worrying?',
            'Worrying too much about different things?',
            'Trouble relaxing?',
            'Being so restless that it is hard to sit still?',
            'Becoming easily annoyed or irritable?',
            'Feeling afraid as if something awful might happen?'
        ],
        labels: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'],
        interpret(score) {
            if (score <= 4) return 'Minimal anxiety';
            if (score <= 9) return 'Mild anxiety';
            if (score <= 14) return 'Moderate anxiety';
            return 'Severe anxiety - seek professional help';
        }
    },
    pcl5: {
        title: 'PCL-5 PTSD Screening',
        questions: [
            'Repeated, disturbing memories of a stressful experience?',
            'Avoiding memories, thoughts, or feelings related to a stressful experience?',
            'Trouble falling or staying asleep?',
            'Feeling irritable or having angry outbursts?',
            'Feeling jumpy or easily startled?'
        ],
        labels: ['Not at all', 'A little bit', 'Moderately', 'Quite a bit'],
        interpret(score) {
            if (score <= 4) return 'Mild symptoms';
            if (score <= 8) return 'Moderate symptoms';
            return 'High distress - consider professional support';
        }
    },
    mdq: {
        title: 'MDQ Bipolar Screening',
        questions: [
            'Feeling more self-confident than usual?',
            'Needing less sleep than usual?',
            'Being more talkative or outgoing than usual?',
            'Being more active or doing more things than usual?',
            'Being more distracted than usual?'
        ],
        labels: ['Not at all', 'A little', 'Moderately', 'A lot'],
        interpret(score) {
            if (score <= 4) return 'Low likelihood of bipolar symptoms';
            if (score <= 8) return 'Possibly moderate symptoms';
            return 'High likelihood - speak with a professional';
        }
    }
};

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
    const signupBottomBtn = document.getElementById('signupCreateBottom');
    if (showSignupBtn) showSignupBtn.addEventListener('click', showSignupPanel);
    if (showLoginBtn) showLoginBtn.addEventListener('click', showLoginPanel);
    if (backToLoginBtn) backToLoginBtn.addEventListener('click', showLoginPanel);
    if (signupBottomBtn) signupBottomBtn.addEventListener('click', () => {
        const signupFormEl = document.getElementById('signupForm');
        if (!signupFormEl) return;
        if (typeof signupFormEl.requestSubmit === 'function') {
            signupFormEl.requestSubmit();
        } else {
            signupFormEl.submit();
        }
    });

    const contrastBtn = document.getElementById('btn-contrast');
    const textBtn = document.getElementById('btn-text');
    const motionBtn = document.getElementById('btn-motion');
    const calmBtn = document.getElementById('btn-calm');
    if (contrastBtn) contrastBtn.addEventListener('click', () => toggleHighContrast(contrastBtn));
    if (textBtn) textBtn.addEventListener('click', () => toggleLargeText(textBtn));
    if (motionBtn) motionBtn.addEventListener('click', () => toggleReduceMotion(motionBtn));
    if (calmBtn) calmBtn.addEventListener('click', () => toggleCalmMode(calmBtn));

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
            const modal = close.closest('.modal');
            modal?.classList.remove('active');
            const overlay = close.closest('.modal-overlay');
            if (overlay) {
                overlay.style.display = 'none';
                overlay.classList.remove('active');
                assessmentState = null;
            }
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
        signupBtn.style.background = '#000';
        signupBtn.style.color = '#fff';
        signupBtn.style.border = '1px solid #000';
    }
    if (loginBtn) {
        loginBtn.classList.remove('btn-primary');
        loginBtn.classList.add('btn-outline');
        loginBtn.style.background = '';
        loginBtn.style.color = '';
        loginBtn.style.border = '';
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
        loginBtn.style.background = '';
        loginBtn.style.color = '';
        loginBtn.style.border = '';
    }
    if (signupBtn) {
        signupBtn.classList.remove('btn-primary');
        signupBtn.classList.add('btn-outline');
        signupBtn.style.background = '#000';
        signupBtn.style.color = '#fff';
        signupBtn.style.border = '1px solid #000';
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

function showToast(message, duration = 3200) {
    const container = document.getElementById('toast-container');
    if (!container) {
        alert(message);
        return;
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
        toast.classList.remove('visible');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, duration);
}

function startBreathing() {
    const phases = ['Breathe in…', 'Hold…', 'Breathe out…', 'Relax…'];
    let step = 0;
    showToast('Guided breathing started. Follow the prompts.');
    const timer = setInterval(() => {
        if (step >= phases.length) {
            clearInterval(timer);
            showToast('Well done. Keep breathing calmly.');
            return;
        }
        showToast(phases[step], 2600);
        step++;
    }, 2800);
}

function toggleHighContrast(button) {
    const enabled = button.getAttribute('aria-pressed') === 'true';
    button.setAttribute('aria-pressed', String(!enabled));
    document.body.classList.toggle('high-contrast', !enabled);
    showToast(`High contrast ${!enabled ? 'enabled' : 'disabled'}`);
}

function toggleLargeText(button) {
    const enabled = button.getAttribute('aria-pressed') === 'true';
    button.setAttribute('aria-pressed', String(!enabled));
    document.documentElement.classList.toggle('large-text', !enabled);
    showToast(`${!enabled ? 'Large text enabled' : 'Normal text restored'}`);
}

function toggleReduceMotion(button) {
    const enabled = button.getAttribute('aria-pressed') === 'true';
    button.setAttribute('aria-pressed', String(!enabled));
    document.body.classList.toggle('reduce-motion', !enabled);
    showToast(`${!enabled ? 'Motion reduced' : 'Motion restored'}`);
}

function toggleCalmMode(button) {
    const enabled = button.getAttribute('aria-pressed') === 'true';
    button.setAttribute('aria-pressed', String(!enabled));
    document.body.classList.toggle('calm-mode', !enabled);
    showToast(`${!enabled ? 'Calm mode enabled' : 'Calm mode disabled'}`);
}

function switchTab(tabId, button) {
    const tabs = document.querySelectorAll('.resources-tabs .tab-btn');
    const panels = document.querySelectorAll('.resources-content');
    tabs.forEach(tab => {
        tab.classList.toggle('active', tab === button);
        tab.setAttribute('aria-selected', tab === button ? 'true' : 'false');
    });
    panels.forEach(panel => {
        panel.classList.toggle('active', panel.id === `tab-${tabId}`);
    });
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

// Section navigation
function showSection(sectionName) {
    // Hide all sections by removing active class
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show the requested section by adding active class
    const targetSection = document.getElementById(`section-${sectionName}`);
    if (targetSection) {
        targetSection.classList.add('active');
        targetSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Open assessment - scroll to section and show modal if it exists
function openAssessment(assessmentType) {
    const assessment = assessmentLibrary[assessmentType];
    if (!assessment) {
        showToast('Assessment currently unavailable.');
        return;
    }

    assessmentState = {
        type: assessmentType,
        currentIndex: 0,
        answers: new Array(assessment.questions.length).fill(0)
    };

    const overlay = document.getElementById('assessment-modal');
    const title = document.getElementById('modal-title');
    const subtitle = document.getElementById('modal-subtitle');
    if (!overlay || !title || !subtitle) {
        showToast('Unable to open assessment.');
        return;
    }

    title.textContent = assessment.title;
    subtitle.textContent = 'Answer each question honestly.';
    overlay.style.display = 'flex';
    overlay.classList.add('active');
    renderAssessmentQuestion();
    showSection('screening');
}

function renderAssessmentQuestion() {
    if (!assessmentState) return;
    const assessment = assessmentLibrary[assessmentState.type];
    const body = document.getElementById('modal-body');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');
    if (!body || !progressFill || !progressText || !prevBtn || !nextBtn) return;

    const question = assessment.questions[assessmentState.currentIndex];
    body.innerHTML = `
        <div class="question-card" style="padding: 20px; background: rgba(255,255,255,.92); border-radius: 18px; box-shadow: 0 12px 28px rgba(0,0,0,.08);">
            <p style="font-size: 1rem; color: #102334; margin-bottom: 18px;">${question}</p>
            ${assessment.labels.map((label, index) => `
                <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; font-size: 0.98rem; color: #1f425f;">
                    <input type="radio" name="assessment-answer" value="${index}" ${assessmentState.answers[assessmentState.currentIndex] === index ? 'checked' : ''}>
                    <span>${label}</span>
                </label>
            `).join('')}
        </div>
    `;

    body.querySelectorAll('input[name="assessment-answer"]').forEach(input => {
        input.addEventListener('change', (event) => {
            assessmentState.answers[assessmentState.currentIndex] = parseInt(event.target.value, 10);
        });
    });

    const progress = Math.round(((assessmentState.currentIndex + 1) / assessment.questions.length) * 100);
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `Question ${assessmentState.currentIndex + 1} of ${assessment.questions.length}`;
    prevBtn.disabled = assessmentState.currentIndex === 0;
    nextBtn.textContent = assessmentState.currentIndex === assessment.questions.length - 1 ? 'Finish' : 'Next →';
}

function prevQuestion() {
    if (!assessmentState || assessmentState.currentIndex === 0) return;
    assessmentState.currentIndex -= 1;
    renderAssessmentQuestion();
}

function nextQuestion() {
    if (!assessmentState) return;
    if (assessmentState.currentIndex === assessmentLibrary[assessmentState.type].questions.length - 1) {
        submitAssessment();
        return;
    }
    assessmentState.currentIndex += 1;
    renderAssessmentQuestion();
}

function submitAssessment() {
    if (!assessmentState) return;
    const assessment = assessmentLibrary[assessmentState.type];
    const score = assessment.answers.reduce((total, answer) => total + (Number.parseInt(answer, 10) || 0), 0);
    userData.assessments.push({ type: assessmentState.type, score, date: new Date().toISOString() });
    userData.sessions += 1;
    saveUserData();
    updateProgress();
    const body = document.getElementById('modal-body');
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');
    if (body) {
        body.innerHTML = `
            <div style="padding: 24px; background: rgba(255,255,255,.96); border-radius: 20px;">
              <h3 style="margin-bottom: 14px; color: #102334;">${assessment.title}</h3>
              <p style="margin-bottom: 10px; color: #2e4d6d; font-weight: 600;">Score: ${score}</p>
              <p style="margin-bottom: 18px; color: #33455f;">${assessment.interpret(score)}</p>
              <p style="color: #475c73;">Your responses are for informational use and may help you decide whether to seek professional support.</p>
            </div>
        `;
    }
    if (prevBtn) {
        prevBtn.disabled = true;
    }
    if (nextBtn) {
        nextBtn.textContent = 'Close';
        nextBtn.onclick = closeAssessmentModal;
    }
    showToast(`${assessment.title} completed.`);
}

function closeAssessmentModal() {
    const overlay = document.getElementById('assessment-modal');
    if (overlay) {
        overlay.style.display = 'none';
        overlay.classList.remove('active');
    }
    assessmentState = null;
}

// Close mobile navigation
function closeMobile() {
    const mobileNav = document.getElementById('mobile-nav');
    const hamburger = document.getElementById('hamburger-btn');
    if (mobileNav) {
        mobileNav.classList.remove('open');
    }
    if (hamburger) {
        hamburger.setAttribute('aria-expanded', 'false');
    }
}

// Mobile menu toggle
document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.getElementById('hamburger-btn');
    const mobileNav = document.getElementById('mobile-nav');
    
    if (hamburger && mobileNav) {
        hamburger.addEventListener('click', () => {
            const isOpen = mobileNav.classList.contains('open');
            if (isOpen) {
                mobileNav.classList.remove('open');
                hamburger.setAttribute('aria-expanded', 'false');
            } else {
                mobileNav.classList.add('open');
                hamburger.setAttribute('aria-expanded', 'true');
            }
        });
    }
});

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
window.showSection = showSection;
window.openAssessment = openAssessment;
window.startBreathing = startBreathing;
window.switchTab = switchTab;
window.prevQuestion = prevQuestion;
window.nextQuestion = nextQuestion;
window.closeAssessmentModal = closeAssessmentModal;
window.closeMobile = closeMobile;

