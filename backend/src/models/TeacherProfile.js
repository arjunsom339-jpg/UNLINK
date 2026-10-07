'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * TEACHER PROFILE MODEL
 * Extended data for faculty/teacher users.
 * One-to-one with User (where role = 'teacher').
 */
const TeacherProfile = sequelize.define('TeacherProfile', {
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

  // ── Professional Identity ─────────────────────────────────────────────────
  teacherId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Institutional Teacher ID',
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
  designation: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'e.g. Professor, Associate Professor, Assistant Professor, HOD',
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
  cabinLocation: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  officeHours: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },

  // ── JSON Arrays (cross-dialect compatibility) ─────────────────────────────
  subjects: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  qualifications: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  specializations: {
    type: DataTypes.JSON,
    defaultValue: [],
  },

  // ── Metrics ───────────────────────────────────────────────────────────────
  totalAnnouncements: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  totalResourcesShared: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: 'teacher_profiles',
  indexes: [
    { fields: ['user_id'], unique: true },
    { fields: ['teacher_id'] },
    { fields: ['college_id'] },
    { fields: ['department_id'] },
  ],
});

module.exports = TeacherProfile;
