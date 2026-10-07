'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const REQUEST_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'CANCELLED',
  'ACTIVE',
  'COMPLETED',
  'EXPIRED',
];

/**
 * MENTORSHIP REQUEST MODEL
 * Formal mentorship lifecycle between a current student and a verified alumnus.
 */
const MentorshipRequest = sequelize.define('MentorshipRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  studentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  alumniId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  alumniProfileId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'alumni_profiles', key: 'id' },
    onDelete: 'CASCADE',
  },
  collegeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'colleges', key: 'id' },
    onDelete: 'CASCADE',
  },
  topic: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  goals: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  preferredMode: {
    type: DataTypes.STRING(30),
    defaultValue: 'FLEXIBLE',
  },
  preferredFrequency: {
    type: DataTypes.STRING(30),
    defaultValue: 'FLEXIBLE',
  },
  preferredDuration: {
    type: DataTypes.STRING(30),
    defaultValue: '30 mins',
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'PENDING',
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  cancellationReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  respondedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  acceptedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'mentorship_requests',
  indexes: [
    { fields: ['alumni_id', 'status'] },
    { fields: ['student_id', 'status'] },
    { fields: ['college_id'] },
    { fields: ['topic'] },
    { fields: ['created_at'] },
  ],
});

module.exports = MentorshipRequest;
module.exports.REQUEST_STATUSES = REQUEST_STATUSES;
