const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGODB_URI = process.env.MONGODB_URI;

if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set.');
  process.exit(1);
}

if (!MONGODB_URI) {
  console.error('FATAL: MONGODB_URI environment variable is not set.');
  process.exit(1);
}

app.use(cors({
  origin: [
    'https://safespace-hub.onrender.com',
    'https://safespace-hub.vercel.app'
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

/* ─────────────────────────────────────────────
   MONGODB CONNECTION
───────────────────────────────────────────── */
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

/* ─────────────────────────────────────────────
   SCHEMAS AND MODELS
   (Each schema mirrors your original SQLite table)
───────────────────────────────────────────── */

// ── Users ──────────────────────────────────────
const userSchema = new mongoose.Schema({
  user_id:          { type: String, required: true, unique: true },
  username:         { type: String, required: true, unique: true },
  password:         { type: String, required: true },
  role:             String,
  first_name:       String,
  last_name:        String,
  email:            { type: String, unique: true, sparse: true },
  phone:            String,
  avatar_initials:  String,
  avatar_color:     String,
  date_joined:      String,
  last_login:       String,
  status:           { type: String, default: 'active' },
  institution:      String
});
const User = mongoose.model('User', userSchema);

// ── Assessments (meta) ─────────────────────────
const assessmentSchema = new mongoose.Schema({
  assessment_id:      { type: String, required: true, unique: true },
  tool_code:          { type: String, required: true, unique: true },
  tool_name:          String,
  protocol:           String,
  condition_target:   String,
  question_count:     Number,
  max_score:          Number,
  estimated_minutes:  Number,
  validated_by:       String,
  dsm_version:        String,
  is_active:          { type: Boolean, default: true }
});
const Assessment = mongoose.model('Assessment', assessmentSchema);

// ── Assessment Results ─────────────────────────
const assessmentResultSchema = new mongoose.Schema({
  result_id:              { type: String, required: true, unique: true },
  user_id:                { type: String, required: true },
  assessment_id:          String,
  tool_code:              String,
  score:                  Number,
  max_score:              Number,
  severity_label:         String,
  severity_level:         Number,
  crisis_flag:            { type: Boolean, default: false },
  date_taken:             String,
  time_taken:             String,
  recommendations_given:  { type: Boolean, default: false }
});
const AssessmentResult = mongoose.model('AssessmentResult', assessmentResultSchema);

// ── Crisis Contacts ────────────────────────────
const crisisContactSchema = new mongoose.Schema({
  contact_id:   { type: String, required: true, unique: true },
  name:         String,
  number:       String,
  type:         String,
  keyword:      String,
  region:       String,
  available:    String,
  description:  String,
  url:          String
});
const CrisisContact = mongoose.model('CrisisContact', crisisContactSchema);

// ── LMS Courses ────────────────────────────────
const lmsCourseSchema = new mongoose.Schema({
  course_id:        { type: String, required: true, unique: true },
  title:            String,
  category:         String,
  description:      String,
  module_count:     Number,
  duration_minutes: Number,
  level:            String,
  icon:             String,
  color_start:      String,
  color_end:        String,
  tags:             [String],
  enrolled_count:   Number,
  rating:           Number,
  is_active:        { type: Boolean, default: true }
});
const LmsCourse = mongoose.model('LmsCourse', lmsCourseSchema);

// ── Resources ──────────────────────────────────
const resourceSchema = new mongoose.Schema({
  resource_id:    { type: String, required: true, unique: true },
  title:          String,
  category:       String,
  type:           String,
  read_time_min:  Number,
  tags:           [String],
  is_active:      { type: Boolean, default: true }
});
const Resource = mongoose.model('Resource', resourceSchema);

// ── Wellness Tips ──────────────────────────────
const wellnessTipSchema = new mongoose.Schema({
  tip_id:     { type: String, required: true, unique: true },
  tip:        String,
  category:   String,
  is_active:  { type: Boolean, default: true }
});
const WellnessTip = mongoose.model('WellnessTip', wellnessTipSchema);

// ── Platform Stats ─────────────────────────────
const platformStatsSchema = new mongoose.Schema({
  stats_id:                 { type: String, default: 'main' },
  total_users:              Number,
  assessments_completed:    Number,
  satisfaction_rate_pct:    Number,
  last_updated:             String
});
const PlatformStats = mongoose.model('PlatformStats', platformStatsSchema);

/* ─────────────────────────────────────────────
   SEED FROM data.json
   (Same logic as your original migrateFromJSON)
───────────────────────────────────────────── */
async function seedFromJSON() {
  const dataPath = path.join(__dirname, 'data.json');
  if (!fs.existsSync(dataPath)) {
    console.log('data.json not found — skipping seed');
    return;
  }

  // Only seed if database is empty
  const existingUsers = await User.countDocuments();
  if (existingUsers > 0) {
    console.log('Database already seeded.');
    return;
  }

  console.log('Seeding from data.json ...');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  // Users
  if (data.tbl_users) {
    await User.insertMany(data.tbl_users.map(u => ({
      user_id:         u.user_id,
      username:        u.username,
      password:        u.password,
      role:            u.role,
      first_name:      u.first_name,
      last_name:       u.last_name,
      email:           u.email,
      phone:           u.phone,
      avatar_initials: u.avatar_initials,
      avatar_color:    u.avatar_color,
      date_joined:     u.date_joined,
      last_login:      u.last_login,
      status:          u.status || 'active',
      institution:     u.institution
    })));
    console.log(`Seeded ${data.tbl_users.length} users.`);
  }

  // Assessments
  if (data.tbl_assessments) {
    await Assessment.insertMany(data.tbl_assessments.map(a => ({
      assessment_id:     a.assessment_id,
      tool_code:         a.tool_code,
      tool_name:         a.tool_name,
      protocol:          a.protocol,
      condition_target:  a.condition_target,
      question_count:    a.question_count,
      max_score:         a.max_score,
      estimated_minutes: a.estimated_minutes,
      validated_by:      a.validated_by,
      dsm_version:       a.dsm_version,
      is_active:         a.is_active !== false
    })));
    console.log(`Seeded ${data.tbl_assessments.length} assessments.`);
  }

  // Assessment Results
  if (data.tbl_assessment_results) {
    await AssessmentResult.insertMany(data.tbl_assessment_results.map(r => ({
      result_id:             r.result_id,
      user_id:               r.user_id,
      assessment_id:         r.assessment_id,
      tool_code:             r.tool_code,
      score:                 r.score,
      max_score:             r.max_score,
      severity_label:        r.severity_label,
      severity_level:        r.severity_level,
      crisis_flag:           !!r.crisis_flag,
      date_taken:            r.date_taken,
      time_taken:            r.time_taken,
      recommendations_given: !!r.recommendations_given
    })));
    console.log(`Seeded ${data.tbl_assessment_results.length} results.`);
  }

  // Crisis Contacts
  if (data.tbl_crisis_contacts) {
    await CrisisContact.insertMany(data.tbl_crisis_contacts.map(c => ({
      contact_id:  c.contact_id,
      name:        c.name,
      number:      c.number,
      type:        c.type,
      keyword:     c.keyword,
      region:      c.region,
      available:   c.available,
      description: c.description,
      url:         c.url
    })));
    console.log(`Seeded ${data.tbl_crisis_contacts.length} crisis contacts.`);
  }

  // LMS Courses
  if (data.tbl_lms_courses) {
    await LmsCourse.insertMany(data.tbl_lms_courses.map(c => ({
      course_id:        c.course_id,
      title:            c.title,
      category:         c.category,
      description:      c.description,
      module_count:     c.module_count,
      duration_minutes: c.duration_minutes,
      level:            c.level,
      icon:             c.icon,
      color_start:      c.color_start,
      color_end:        c.color_end,
      tags:             Array.isArray(c.tags) ? c.tags : [],
      enrolled_count:   c.enrolled_count,
      rating:           c.rating,
      is_active:        c.is_active !== false
    })));
    console.log(`Seeded ${data.tbl_lms_courses.length} courses.`);
  }

  // Resources
  if (data.tbl_resources) {
    await Resource.insertMany(data.tbl_resources.map(r => ({
      resource_id:   r.resource_id,
      title:         r.title,
      category:      r.category,
      type:          r.type,
      read_time_min: r.read_time_min,
      tags:          Array.isArray(r.tags) ? r.tags : [],
      is_active:     r.is_active !== false
    })));
    console.log(`Seeded ${data.tbl_resources.length} resources.`);
  }

  // Wellness Tips
  if (data.tbl_wellness_tips) {
    await WellnessTip.insertMany(data.tbl_wellness_tips.map(t => ({
      tip_id:    t.tip_id,
      tip:       t.tip,
      category:  t.category,
      is_active: t.is_active !== false
    })));
    console.log(`Seeded ${data.tbl_wellness_tips.length} tips.`);
  }

  // Platform Stats
  if (data.tbl_platform_stats) {
    const s = data.tbl_platform_stats;
    await PlatformStats.create({
      stats_id:              'main',
      total_users:           s.total_users,
      assessments_completed: s.assessments_completed,
      satisfaction_rate_pct: s.satisfaction_rate_pct,
      last_updated:          s.last_updated
    });
    console.log('Seeded platform stats.');
  }

  console.log('Seed complete.');
}

/* ─────────────────────────────────────────────
   AUTH MIDDLEWARE
   (Identical to your original)
───────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────
   ROUTES
   (All endpoints are identical to your original —
    only the database calls have changed)
───────────────────────────────────────────── */

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: 'MongoDB Atlas' });
});

// ── Login ───────────────────────────────────────
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find by username OR email — same as before
    const user = await User.findOne({
      $or: [{ username }, { email: username }]
    });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      // Fallback plain text compare for demo data (same as your original)
      if (user.password !== password) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    }

    const token = jwt.sign(
      { user_id: user.user_id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        user_id:         user.user_id,
        username:        user.username,
        first_name:      user.first_name,
        last_name:       user.last_name,
        role:            user.role,
        email:           user.email,
        avatar_initials: user.avatar_initials,
        avatar_color:    user.avatar_color,
        institution:     user.institution
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── Register ────────────────────────────────────
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, first_name, last_name, email, role } = req.body;

    const existing = await User.findOne({
      $or: [{ username }, { email }]
    });
    if (existing) return res.status(409).json({ error: 'Username or email taken' });

    const hash = await bcrypt.hash(password, 10);
    const user_id = 'USR' + String(Date.now()).slice(-5);
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    await User.create({
      user_id,
      username,
      password:   hash,
      first_name,
      last_name,
      email,
      role:       role || 'Patient',
      status:     'active',
      date_joined: today
    });

    res.json({ user_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Users list (admin/therapist) ────────────────
app.get('/api/users', auth, async (req, res) => {
  try {
    const users = await User.find(
      {},
      'user_id username first_name last_name email role status institution last_login'
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Current user ────────────────────────────────
app.get('/api/me', auth, async (req, res) => {
  try {
    const user = await User.findOne(
      { user_id: req.user.user_id },
      'user_id username first_name last_name email role avatar_initials avatar_color institution'
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Assessments meta ────────────────────────────
app.get('/api/assessments', async (req, res) => {
  try {
    const assessments = await Assessment.find({ is_active: true });
    res.json(assessments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Submit assessment result ────────────────────
app.post('/api/assessments/:tool_code/results', auth, async (req, res) => {
  try {
    const {
      score, max_score, severity_label, severity_level,
      crisis_flag, date_taken, time_taken, recommendations_given
    } = req.body;

    const tool_code = req.params.tool_code.toUpperCase();
    const assessment = await Assessment.findOne({ tool_code });
    const assessment_id = assessment ? assessment.assessment_id : null;
    const result_id = 'RES' + String(Date.now());

    await AssessmentResult.create({
      result_id,
      user_id:               req.user.user_id,
      assessment_id,
      tool_code,
      score,
      max_score,
      severity_label,
      severity_level,
      crisis_flag:            !!crisis_flag,
      date_taken,
      time_taken,
      recommendations_given:  !!recommendations_given
    });

    res.json({ result_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get results for current user ────────────────
app.get('/api/my-results', auth, async (req, res) => {
  try {
    // Get results and manually join tool_name from assessments
    const results = await AssessmentResult.find(
      { user_id: req.user.user_id }
    ).sort({ date_taken: -1 });

    // Enrich each result with tool_name
    const enriched = await Promise.all(results.map(async r => {
      const assessment = await Assessment.findOne(
        { assessment_id: r.assessment_id },
        'tool_name'
      );
      return {
        ...r.toObject(),
        tool_name: assessment ? assessment.tool_name : null
      };
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Crisis contacts ─────────────────────────────
app.get('/api/crisis-contacts', async (req, res) => {
  try {
    const contacts = await CrisisContact.find();
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Courses ─────────────────────────────────────
app.get('/api/courses', async (req, res) => {
  try {
    const courses = await LmsCourse.find({ is_active: true });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Resources ───────────────────────────────────
app.get('/api/resources', async (req, res) => {
  try {
    const resources = await Resource.find({ is_active: true });
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Random wellness tip ──────────────────────────
app.get('/api/tips', async (req, res) => {
  try {
    // MongoDB random document fetch
    const count = await WellnessTip.countDocuments({ is_active: true });
    const random = Math.floor(Math.random() * count);
    const tip = await WellnessTip.findOne({ is_active: true }).skip(random);
    res.json(tip ? [tip] : []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Platform stats ──────────────────────────────
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await PlatformStats.findOne({ stats_id: 'main' });
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────
   START SERVER
───────────────────────────────────────────── */

mongoose.connection.once('connected', async () => {
  try {
    await seedFromJSON();
    app.listen(PORT, () => {
      console.log('Safe Space Hub API running on port ' + PORT);
    });
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
});