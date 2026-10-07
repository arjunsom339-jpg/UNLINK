'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * AUDIT LOG MODEL
 * Records all significant security and administrative actions:
 * - Registrations and logins
 * - Account approvals, suspensions, bans, reactivations
 * - Role modifications and password resets
 */
const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  actorId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
    comment: 'Admin or user performing the action (null if anonymous/system)',
  },
  targetUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
    comment: 'User affected by the action',
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'e.g. USER_REGISTERED, TEACHER_VERIFIED, ACCOUNT_SUSPENDED, LOGIN_SUCCESS',
  },
  category: {
    type: DataTypes.STRING(50),
    defaultValue: 'AUTH',
    comment: 'AUTH, ADMIN_MODERATION, SECURITY',
  },
  ipAddress: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  details: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Contextual metadata (e.g. reason, previous status, changes)',
  },
}, {
  tableName: 'audit_logs',
  indexes: [
    { fields: ['actor_id'] },
    { fields: ['target_user_id'] },
    { fields: ['action'] },
    { fields: ['category'] },
    { fields: ['created_at'] },
  ],
});

module.exports = AuditLog;
