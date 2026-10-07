'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * HELP RESPONDER MODEL
 * Tracks students who volunteer ("I Can Help") for a pending help request.
 * The requester can review multiple responders and select the primary helper.
 */
const HelpResponder = sequelize.define('HelpResponder', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  helpRequestId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'help_requests', key: 'id' },
    onDelete: 'CASCADE',
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
    comment: 'The student offering help',
  },
  status: {
    type: DataTypes.ENUM('offered', 'selected', 'declined', 'withdrawn'),
    defaultValue: 'offered',
    allowNull: false,
  },
  message: {
    type: DataTypes.STRING(300),
    allowNull: true,
    comment: 'Note from helper (e.g. "I have a spare tire inflator in Block B")',
  },
  distanceMeters: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Calculated distance in meters at the time of response',
  },
  respondedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'help_responders',
  indexes: [
    { fields: ['help_request_id', 'user_id'], unique: true },
    { fields: ['help_request_id'] },
    { fields: ['user_id'] },
    { fields: ['status'] },
  ],
});

module.exports = HelpResponder;
