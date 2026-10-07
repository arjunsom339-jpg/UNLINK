'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * STUDENT PROFILE MODEL
 * Extended data for student users.
 * One-to-one with User (where role = 'student').
 */
const StudentProfile = sequelize.define('StudentProfile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  collegeId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'colleges', key: 'id' },
    onDelete: 'SET NULL',
  },
  departmentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'departments', key: 'id' },
    onDelete: 'SET NULL',
  },

  // ── Academic Identity ─────────────────────────────────────────────────────
  usn: {
    type: DataTypes.STRING(30),
    allowNull: false,
    comment: 'University Seat Number — primary academic identifier',
  },
  fullName: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  college: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  department: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  semester: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1, max: 10 },
  },
  academicYear: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'e.g. 2024-2025',
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },

  // ── Profile ───────────────────────────────────────────────────────────────
  profilePhoto: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  // ── Skills & Interests (JSON array works across Postgres & SQLite) ─────────
  skillsKnown: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  skillsWanted: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  interests: {
    type: DataTypes.JSON,
    defaultValue: [],
  },

  // ── Location ──────────────────────────────────────────────────────────────
  locationEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  lastLatitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true,
  },
  lastLongitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true,
  },
  lastLocationUpdate: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  // ── Portfolio & Projects (JSON arrays work across Postgres & SQLite) ──────
  projects: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  achievements: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  hackathons: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  certifications: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  preferredLearningAreas: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  availability: {
    type: DataTypes.STRING(50),
    defaultValue: 'flexible',
    comment: 'e.g. flexible, weekends, evenings, busy',
  },

  // ── Gamification ──────────────────────────────────────────────────────────
  reputationScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  helpfulAnswersCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  studentsHelpedCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  connectionsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },

  // ── Privacy & Emergency Availability ─────────────────────────────────────
  profileVisibility: {
    type: DataTypes.STRING(30),
    defaultValue: 'campus',
  },
  showLocation: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  showPhone: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  availableToHelp: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether student is willing to receive nearby emergency help requests',
  },
  helpRadiusKm: {
    type: DataTypes.FLOAT,
    defaultValue: 5.0,
    comment: 'Distance radius within which student is open to assisting peers',
  },
}, {
  tableName: 'student_profiles',
  indexes: [
    { fields: ['user_id'], unique: true },
    { fields: ['usn'] },
    { fields: ['college_id'] },
    { fields: ['department_id'] },
    { fields: ['reputation_score'] },
  ],
});

module.exports = StudentProfile;
