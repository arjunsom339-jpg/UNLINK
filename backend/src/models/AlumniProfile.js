'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AVAILABILITY_STATUSES = ['AVAILABLE', 'LIMITED', 'NOT_AVAILABLE'];
const MENTORSHIP_MODES = ['CHAT', 'VIDEO', 'PHONE', 'IN_PERSON', 'FLEXIBLE'];
const MENTORSHIP_FREQUENCIES = ['ONE_TIME', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'FLEXIBLE'];
const VERIFICATION_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'];
const VISIBILITY_OPTIONS = ['COLLEGE_ONLY', 'PUBLIC_WITHIN_UNILINK', 'HIDDEN'];

/**
 * ALUMNI PROFILE MODEL
 * Extended profile for verified former students offering career/technical mentorship.
 */
const AlumniProfile = sequelize.define('AlumniProfile', {
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
    allowNull: false,
    references: { model: 'colleges', key: 'id' },
    onDelete: 'CASCADE',
  },
  departmentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'departments', key: 'id' },
    onDelete: 'SET NULL',
  },
  graduationYear: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  graduationSemester: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  degree: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'Bachelor of Engineering',
  },
  currentJobTitle: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  currentCompany: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  industry: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  experienceYears: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  location: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  skills: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  expertiseAreas: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  mentorshipTopics: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  linkedinUrl: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  portfolioUrl: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  availabilityStatus: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'AVAILABLE',
  },
  mentorshipMode: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'FLEXIBLE',
  },
  preferredFrequency: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'FLEXIBLE',
  },
  verificationStatus: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'PENDING',
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  suspensionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  verifiedById: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
  },
  visibility: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'COLLEGE_ONLY',
  },
  averageRating: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  feedbackCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  completedMentorshipsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: 'alumni_profiles',
  indexes: [
    { fields: ['college_id', 'verification_status'] },
    { fields: ['department_id', 'verification_status'] },
    { fields: ['industry'] },
    { fields: ['availability_status'] },
    { fields: ['graduation_year'] },
    { fields: ['user_id'], unique: true },
  ],
});

module.exports = AlumniProfile;
module.exports.AVAILABILITY_STATUSES = AVAILABILITY_STATUSES;
module.exports.MENTORSHIP_MODES = MENTORSHIP_MODES;
module.exports.MENTORSHIP_FREQUENCIES = MENTORSHIP_FREQUENCIES;
module.exports.VERIFICATION_STATUSES = VERIFICATION_STATUSES;
module.exports.VISIBILITY_OPTIONS = VISIBILITY_OPTIONS;
