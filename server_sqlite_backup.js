const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DB_FILE = 'db.sqlite';
const JWT_SECRET = process.env.JWT_SECRET || 'safe-space-hub-secret-2025';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // serve frontend files

/* ───────────── DATABASE ───────────── */
const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) console.error('DB open error:', err.message);
  else console.log('Connected to SQLite:', DB_FILE);
});

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function initDatabase() {
  // Users
  await run(`CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT,
    first_name TEXT,
    last_name TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    avatar_initials TEXT,
    avatar_color TEXT,
    date_joined TEXT,
    last_login TEXT,
    status TEXT DEFAULT 'active',
    institution TEXT
  )`);

  // Assessments meta
  await run(`CREATE TABLE IF NOT EXISTS assessments (
    assessment_id TEXT PRIMARY KEY,
    tool_code TEXT UNIQUE NOT NULL,
    tool_name TEXT,
    protocol TEXT,
    condition_target TEXT,
    question_count INTEGER,
    max_score INTEGER,
    estimated_minutes INTEGER,
    validated_by TEXT,
    dsm_version TEXT,
    is_active INTEGER DEFAULT 1
  )`);

  // Assessment results
  await run(`CREATE TABLE IF NOT EXISTS assessment_results (
    result_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    assessment_id TEXT,
    tool_code TEXT,
    score INTEGER,
    max_score INTEGER,
    severity_label TEXT,
    severity_level INTEGER,
    crisis_flag INTEGER DEFAULT 0,
    date_taken TEXT,
    time_taken TEXT,
    recommendations_given INTEGER DEFAULT 0
  )`);

  // Crisis contacts
  await run(`CREATE TABLE IF NOT EXISTS crisis_contacts (
    contact_id TEXT PRIMARY KEY,
    name TEXT,
    number TEXT,
    type TEXT,
    keyword TEXT,
    region TEXT,
    available TEXT,
    description TEXT,
    url TEXT
  )`);

  // LMS courses
  await run(`CREATE TABLE IF NOT EXISTS lms_courses (
    course_id TEXT PRIMARY KEY,
    title TEXT,
    category TEXT,
    description TEXT,
    module_count INTEGER,
    duration_minutes INTEGER,
    level TEXT,
    icon TEXT,
    color_start TEXT,
    color_end TEXT,
    tags TEXT,
    enrolled_count INTEGER,
    rating REAL,
    is_active INTEGER DEFAULT 1
  )`);

  // Resources
  await run(`CREATE TABLE IF NOT EXISTS resources (
    resource_id TEXT PRIMARY KEY,
    title TEXT,
    category TEXT,
    type TEXT,
    read_time_min INTEGER,
    tags TEXT,
    is_active INTEGER DEFAULT 1
  )`);

  // Wellness tips
  await run(`CREATE TABLE IF NOT EXISTS wellness_tips (
    tip_id TEXT PRIMARY KEY,
    tip TEXT,
    category TEXT,
    is_active INTEGER DEFAULT 1
  )`);

  // Platform stats (single row)
  await run(`CREATE TABLE IF NOT EXISTS platform_stats (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    total_users INTEGER,
    assessments_completed INTEGER,
    satisfaction_rate_pct INTEGER,
    last_updated TEXT
  )`);

  console.log('Tables ensured.');
}

async function migrateFromJSON() {
  const dataPath = path.join(__dirname, 'data.json');
  if (!fs.existsSync(dataPath)) {
    console.log('data.json not found — skipping migration');
    return;
  }
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  const count = await get('SELECT COUNT(*) AS c FROM users');
  if (count && count.c > 0) {
    console.log('Database already seeded.');
    return;
  }

  console.log('Seeding from data.json ...');

  // Users
  if (data.tbl_users) {
    for (const u of data.tbl_users) {
      await run(
        `INSERT INTO users (user_id, username, password, role, first_name, last_name, email, phone, avatar_initials, avatar_color, date_joined, last_login, status, institution)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [u.user_id, u.username, u.password, u.role, u.first_name, u.last_name, u.email, u.phone, u.avatar_initials, u.avatar_color, u.date_joined, u.last_login, u.status, u.institution]
      );
    }
  }

  // Assessments
  if (data.tbl_assessments) {
    for (const a of data.tbl_assessments) {
      await run(
        `INSERT INTO assessments (assessment_id, tool_code, tool_name, protocol, condition_target, question_count, max_score, estimated_minutes, validated_by, dsm_version, is_active)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [a.assessment_id, a.tool_code, a.tool_name, a.protocol, a.condition_target, a.question_count, a.max_score, a.estimated_minutes, a.validated_by, a.dsm_version, a.is_active ? 1 : 0]
      );
    }
  }

  // Results
  if (data.tbl_assessment_results) {
    for (const r of data.tbl_assessment_results) {
      await run(
        `INSERT INTO assessment_results (result_id, user_id, assessment_id, tool_code, score, max_score, severity_label, severity_level, crisis_flag, date_taken, time_taken, recommendations_given)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [r.result_id, r.user_id, r.assessment_id, r.tool_code, r.score, r.max_score, r.severity_label, r.severity_level, r.crisis_flag ? 1 : 0, r.date_taken, r.time_taken, r.recommendations_given ? 1 : 0]
      );
    }
  }

  // Crisis contacts
  if (data.tbl_crisis_contacts) {
    for (const c of data.tbl_crisis_contacts) {
      await run(
        `INSERT INTO crisis_contacts (contact_id, name, number, type, keyword, region, available, description, url)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [c.contact_id, c.name, c.number, c.type, c.keyword, c.region, c.available, c.description, c.url]
      );
    }
  }

  // Courses
  if (data.tbl_lms_courses) {
    for (const c of data.tbl_lms_courses) {
      await run(
        `INSERT INTO lms_courses (course_id, title, category, description, module_count, duration_minutes, level, icon, color_start, color_end, tags, enrolled_count, rating, is_active)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [c.course_id, c.title, c.category, c.description, c.module_count, c.duration_minutes, c.level, c.icon, c.color_start, c.color_end, JSON.stringify(c.tags || []), c.enrolled_count, c.rating, c.is_active ? 1 : 0]
      );
    }
  }

  // Resources
  if (data.tbl_resources) {
    for (const r of data.tbl_resources) {
      await run(
        `INSERT INTO resources (resource_id, title, category, type, read_time_min, tags, is_active)
         VALUES (?,?,?,?,?,?,?)`,
        [r.resource_id, r.title, r.category, r.type, r.read_time_min, JSON.stringify(r.tags || []), r.is_active ? 1 : 0]
      );
    }
  }

  // Tips
  if (data.tbl_wellness_tips) {
    for (const t of data.tbl_wellness_tips) {
      await run(
        `INSERT INTO wellness_tips (tip_id, tip, category, is_active)
         VALUES (?,?,?,?)`,
        [t.tip_id, t.tip, t.category, t.is_active ? 1 : 0]
      );
    }
  }

  // Stats
  if (data.tbl_platform_stats) {
    const s = data.tbl_platform_stats;
    await run(
      `INSERT INTO platform_stats (id, total_users, assessments_completed, satisfaction_rate_pct, last_updated)
       VALUES (1,?,?,?,?)`,
      [s.total_users, s.assessments_completed, s.satisfaction_rate_pct, s.last_updated]
    );
  }

  console.log('Migration complete.');
}

/* ───────────── AUTH MIDDLEWARE ───────────── */
function auth(req, res, next) {
  const token = req.headers['x-auth-token'];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

/* ───────────── ROUTES ───────────── */

// Health
app.get('/api/health', (req, res) => res.json({ status: 'ok', db: DB_FILE }));

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await get('SELECT * FROM users WHERE username = ? OR email = ?', [username, username]);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      // fallback: plain text compare for demo data before hashing
      if (user.password !== password) return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { user_id: user.user_id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        email: user.email,
        avatar_initials: user.avatar_initials,
        avatar_color: user.avatar_color,
        institution: user.institution
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Register (hash password)
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, first_name, last_name, email, role } = req.body;
    const existing = await get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existing) return res.status(409).json({ error: 'Username or email taken' });

    const hash = await bcrypt.hash(password, 10);
    const user_id = 'USR' + String(Date.now()).slice(-5);
    await run(
      `INSERT INTO users (user_id, username, password, first_name, last_name, email, role, status, date_joined)
       VALUES (?,?,?,?,?,?,?,?,date('now'))`,
      [user_id, username, hash, first_name, last_name, email, role || 'Patient', 'active']
    );
    res.json({ user_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Users list (admin/therapist)
app.get('/api/users', auth, async (req, res) => {
  try {
    const rows = await all('SELECT user_id, username, first_name, last_name, email, role, status, institution, last_login FROM users');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Current user
app.get('/api/me', auth, async (req, res) => {
  try {
    const user = await get('SELECT user_id, username, first_name, last_name, email, role, avatar_initials, avatar_color, institution FROM users WHERE user_id = ?', [req.user.user_id]);
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Assessments meta
app.get('/api/assessments', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM assessments WHERE is_active = 1');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Submit result
app.post('/api/assessments/:tool_code/results', auth, async (req, res) => {
  try {
    const { score, max_score, severity_label, severity_level, crisis_flag, date_taken, time_taken, recommendations_given } = req.body;
    const tool_code = req.params.tool_code.toUpperCase();
    const assessment = await get('SELECT assessment_id FROM assessments WHERE tool_code = ?', [tool_code]);
    const assessment_id = assessment ? assessment.assessment_id : null;
    const result_id = 'RES' + String(Date.now());

    await run(
      `INSERT INTO assessment_results (result_id, user_id, assessment_id, tool_code, score, max_score, severity_label, severity_level, crisis_flag, date_taken, time_taken, recommendations_given)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [result_id, req.user.user_id, assessment_id, tool_code, score, max_score, severity_label, severity_level, crisis_flag ? 1 : 0, date_taken, time_taken, recommendations_given ? 1 : 0]
    );
    res.json({ result_id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get results for user
app.get('/api/my-results', auth, async (req, res) => {
  try {
    const rows = await all(
      `SELECT r.*, a.tool_name FROM assessment_results r LEFT JOIN assessments a ON r.assessment_id = a.assessment_id WHERE r.user_id = ? ORDER BY r.date_taken DESC`,
      [req.user.user_id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Crisis contacts
app.get('/api/crisis-contacts', async (req, res) => {
  try { res.json(await all('SELECT * FROM crisis_contacts')); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Courses
app.get('/api/courses', async (req, res) => {
  try { res.json(await all('SELECT * FROM lms_courses WHERE is_active = 1')); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Resources
app.get('/api/resources', async (req, res) => {
  try { res.json(await all('SELECT * FROM resources WHERE is_active = 1')); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Tips
app.get('/api/tips', async (req, res) => {
  try { res.json(await all('SELECT * FROM wellness_tips WHERE is_active = 1 ORDER BY RANDOM() LIMIT 1')); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Stats
app.get('/api/stats', async (req, res) => {
  try { res.json(await get('SELECT * FROM platform_stats WHERE id = 1')); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

/* ───────────── START ───────────── */
(async () => {
  try {
    await initDatabase();
    await migrateFromJSON();
    app.listen(PORT, () => {
      console.log('Safe Space Hub API running on http://localhost:' + PORT);
    });
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
})();

