'use strict';

const path       = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');

const { connectDB }              = require('./src/config/database');
const { initializeFirebase }     = require('./src/config/firebase');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');
const logger                     = require('./src/utils/logger');

// Import models (initializes associations)
require('./src/models');

// ── Route imports ──────────────────────────────────────────────────────────
const authRoutes       = require('./src/routes/authRoutes');
const studentRoutes    = require('./src/routes/student/studentRoutes');
const teacherRoutes    = require('./src/routes/teacher/teacherRoutes');
const adminRoutes      = require('./src/routes/admin/adminRoutes');
const skillRoutes      = require('./src/routes/skillRoutes');
const connectionRoutes = require('./src/routes/connectionRoutes');
const communityRoutes  = require('./src/routes/communityRoutes');
const helpRoutes       = require('./src/routes/helpRoutes');
const eventRoutes      = require('./src/routes/eventRoutes');
const resourceRoutes   = require('./src/routes/resourceRoutes');
const alumniRoutes     = require('./src/routes/alumniRoutes');
const mentorshipRoutes = require('./src/routes/mentorshipRoutes');
const placementRoutes  = require('./src/routes/placementRoutes');
const clubRoutes       = require('./src/routes/clubRoutes');
const campusExchangeRoutes = require('./src/routes/campusExchangeRoutes');
const aiRoutes             = require('./src/routes/aiRoutes');
const skillService     = require('./src/services/skillService');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Security Middleware ────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      !process.env.CLIENT_URL ||
      origin === process.env.CLIENT_URL ||
      origin === 'http://localhost:5173' ||
      origin.endsWith('.vercel.app')
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── General Rate Limiting ──────────────────────────────────────────────────
app.use(rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders:   false,
}));

// ── Request Parsing ────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Request Logging ────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
}

// ── Static files (uploaded assets) ────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Health Check ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'UniLink API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/student',     studentRoutes);
app.use('/api/teacher',     teacherRoutes);
app.use('/api/admin',       adminRoutes);
app.use('/api/skills',      skillRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/community',   communityRoutes);
app.use('/api/help',        helpRoutes);
app.use('/api/events',      eventRoutes);
app.use('/api/resources',   resourceRoutes);
app.use('/api/alumni',      alumniRoutes);
app.use('/api/mentorship',  mentorshipRoutes);
app.use('/api/placements',  placementRoutes);
app.use('/api/clubs',       clubRoutes);
app.use('/api/campus-exchange', campusExchangeRoutes);
app.use('/api/ai',              aiRoutes);

// ── 404 & Error Handlers ───────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Bootstrap ──────────────────────────────────────────────────────────────
const start = async () => {
  await connectDB();
  initializeFirebase();

  const { sequelize } = require('./src/config/database');
  try {
    await sequelize.query('ALTER TABLE reports ADD COLUMN opportunity_id UUID;');
  } catch (_) {
    // column already exists
  }
  try {
    await sequelize.query('ALTER TABLE reports ADD COLUMN club_id UUID;');
  } catch (_) {
    // column already exists
  }
  try {
    await sequelize.query('ALTER TABLE events ADD COLUMN club_id UUID;');
  } catch (_) {
    // column already exists
  }
  try {
    await sequelize.query('ALTER TABLE reports ADD COLUMN marketplace_listing_id UUID;');
  } catch (_) {
    // column already exists
  }
  try {
    await sequelize.query('ALTER TABLE reports ADD COLUMN lost_found_item_id UUID;');
  } catch (_) {
    // column already exists
  }
  await sequelize.sync();

  logger.info('Database synchronized');

  // Auto-bootstrap skills catalog, default institution and admin
  try {
    await skillService.seedDefaultSkills();
    const { bootstrapAdmin } = require('./src/scripts/bootstrapAdmin');
    await bootstrapAdmin();
  } catch (seedErr) {
    logger.warn('Bootstrap notice: ' + seedErr.message);
  }

  const server = app.listen(PORT, () => {
    logger.info(`UniLink API server running on http://localhost:${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
  });

  return server;
};

if (require.main === module) {
  start().catch((err) => {
    logger.error('Failed to start server:', err);
    process.exit(1);
  });
}

module.exports = app;
module.exports.start = start;
