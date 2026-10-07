'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const APPLICATION_STATUSES = [
  'APPLIED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'TEST',
  'INTERVIEW',
  'SELECTED',
  'REJECTED',
  'WITHDRAWN',
  'OFFER_ACCEPTED',
  'OFFER_DECLINED',
];

/**
 * OPPORTUNITY APPLICATION MODEL
 * Records a student application to a job, internship, or campus recruitment drive.
 */
const OpportunityApplication = sequelize.define('OpportunityApplication', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
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
  status: {
    type: DataTypes.STRING(30),
    defaultValue: 'APPLIED',
    validate: {
      isIn: [APPLICATION_STATUSES],
    },
  },
  currentStage: {
    type: DataTypes.STRING(100),
    defaultValue: 'Application Submitted',
  },
  appliedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  withdrawnAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  eligibilitySnapshot: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Snapshot of student department, semester, CGPA, backlogs, and skills at application time',
  },
  resumeUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  resumeFilename: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  coverLetter: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Internal notes added by TPC/recruiter during review',
  },
  finalResult: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
}, {
  tableName: 'opportunity_applications',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['opportunity_id', 'student_id'],
      name: 'unique_opportunity_student_application',
    },
    { fields: ['college_id', 'status'] },
    { fields: ['student_id'] },
    { fields: ['opportunity_id'] },
  ],
});

module.exports = OpportunityApplication;
