'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const INTERVIEW_TYPES = [
  'ONLINE_TEST',
  'OFFLINE_TEST',
  'TECHNICAL_INTERVIEW',
  'HR_INTERVIEW',
  'GROUP_DISCUSSION',
  'OTHER',
];

const INTERVIEW_STATUSES = ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
const INTERVIEW_RESULTS = ['PENDING', 'PASSED', 'FAILED', 'ON_HOLD'];

/**
 * PLACEMENT INTERVIEW / ASSESSMENT MODEL
 * Manages recruitment rounds, online/offline tests, GDs, and technical/HR interviews.
 */
const PlacementInterview = sequelize.define('PlacementInterview', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  applicationId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'opportunity_applications', key: 'id' },
    onDelete: 'CASCADE',
  },
  opportunityId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'opportunities', key: 'id' },
    onDelete: 'CASCADE',
  },
  studentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  collegeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'colleges', key: 'id' },
    onDelete: 'CASCADE',
  },
  type: {
    type: DataTypes.STRING(30),
    defaultValue: 'TECHNICAL_INTERVIEW',
    validate: {
      isIn: [INTERVIEW_TYPES],
    },
  },
  title: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  scheduledAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  durationMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 45,
  },
  venue: {
    type: DataTypes.STRING(200),
    allowNull: true,
  },
  meetingLink: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  instructions: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(30),
    defaultValue: 'SCHEDULED',
    validate: {
      isIn: [INTERVIEW_STATUSES],
    },
  },
  result: {
    type: DataTypes.STRING(30),
    defaultValue: 'PENDING',
    validate: {
      isIn: [INTERVIEW_RESULTS],
    },
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
  },
}, {
  tableName: 'placement_interviews',
  timestamps: true,
  indexes: [
    { fields: ['college_id'] },
    { fields: ['student_id'] },
    { fields: ['application_id'] },
    { fields: ['opportunity_id'] },
    { fields: ['scheduled_at'] },
  ],
});

module.exports = PlacementInterview;
