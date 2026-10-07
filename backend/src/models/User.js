'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * USER MODEL
 * Central identity table for all three primary roles (STUDENT, TEACHER, ADMIN).
 * Role-specific data lives in separate profile tables (StudentProfile, TeacherProfile).
 */
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  // ── Identity ────────────────────────────────────────────────────────────
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  passwordHash: {
    type: DataTypes.STRING(255),
    allowNull: true, // null for Google/OTP-only accounts
  },
  firebaseUid: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
    comment: 'Firebase UID — links Google/Phone OTP accounts',
  },

  // ── Role ─────────────────────────────────────────────────────────────────
  role: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'student',
    comment: 'student, teacher, or admin',
  },
  adminRole: {
    type: DataTypes.STRING(30),
    allowNull: true,
    comment: 'SUPER_ADMIN, ADMIN, MODERATOR (for role = admin)',
  },

  // ── Multi-College Association ───────────────────────────────────────────
  collegeId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'colleges', key: 'id' },
    onDelete: 'SET NULL',
  },

  // ── Account State ─────────────────────────────────────────────────────────
  isEmailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isPhoneVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  accountStatus: {
    type: DataTypes.STRING(40),
    defaultValue: 'pending', // PENDING_VERIFICATION
    allowNull: false,
    comment: 'pending (PENDING_VERIFICATION), active (VERIFIED), suspended, banned',
  },
  isAdminVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Admin manually verifies teacher/student accounts',
  },

  // ── Contact ─────────────────────────────────────────────────────────────
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },

  // ── Security & Sessions ──────────────────────────────────────────────────
  refreshTokenHash: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Hashed refresh token for rotation validation',
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  loginAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  lockedUntil: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  // ── Password Reset ────────────────────────────────────────────────────────
  passwordResetToken: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  passwordResetExpires: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  // ── Email Verification ────────────────────────────────────────────────────
  emailVerificationToken: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  emailVerificationExpires: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'users',
  indexes: [
    { fields: ['email'], unique: true },
    { fields: ['role'] },
    { fields: ['admin_role'] },
    { fields: ['college_id'] },
    { fields: ['account_status'] },
    { fields: ['firebase_uid'] },
  ],
});

module.exports = User;
