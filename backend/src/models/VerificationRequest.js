'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * VERIFICATION REQUEST MODEL
 * Tracks student (USN + Email) and teacher (Teacher ID + Email) verification lifecycle.
 * Administrators review and approve/reject these requests.
 */
const VerificationRequest = sequelize.define('VerificationRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  collegeId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'colleges', key: 'id' },
    onDelete: 'SET NULL',
  },
  role: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'student or teacher',
  },
  identifier: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'USN for student, Teacher ID for faculty',
  },
  collegeEmail: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  fullName: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  department: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(30),
    defaultValue: 'pending',
    comment: 'pending, approved, rejected',
  },
  submittedDetails: {
    type: DataTypes.JSON,
    defaultValue: {},
  },
  reviewedById: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  reviewNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'verification_requests',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['status'] },
    { fields: ['role'] },
    { fields: ['identifier'] },
    { fields: ['college_email'] },
  ],
});

module.exports = VerificationRequest;
