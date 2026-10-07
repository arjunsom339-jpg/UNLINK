'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SESSION_STATUSES = ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

/**
 * MENTORSHIP SESSION MODEL
 * Lightweight session scheduler for 1-on-1 mentorship interactions.
 */
const MentorshipSession = sequelize.define('MentorshipSession', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  mentorshipRequestId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'mentorship_requests', key: 'id' },
    onDelete: 'CASCADE',
  },
  scheduledAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  durationMinutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 45,
  },
  mode: {
    type: DataTypes.STRING(30),
    defaultValue: 'CHAT',
  },
  meetingLink: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'SCHEDULED',
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
}, {
  tableName: 'mentorship_sessions',
  indexes: [
    { fields: ['mentorship_request_id'] },
    { fields: ['scheduled_at'] },
    { fields: ['status'] },
  ],
});

module.exports = MentorshipSession;
module.exports.SESSION_STATUSES = SESSION_STATUSES;
