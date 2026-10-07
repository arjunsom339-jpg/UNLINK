'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * MENTORSHIP MESSAGE MODEL
 * Private end-to-end communication channel strictly between student and mentor.
 */
const MentorshipMessage = sequelize.define('MentorshipMessage', {
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
  senderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  tableName: 'mentorship_messages',
  indexes: [
    { fields: ['mentorship_request_id', 'created_at'] },
    { fields: ['sender_id'] },
  ],
});

module.exports = MentorshipMessage;
