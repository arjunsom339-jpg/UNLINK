'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * HELP MESSAGE MODEL
 * Secure, private communication channel between requester and helper
 * during an active help request.
 */
const HelpMessage = sequelize.define('HelpMessage', {
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
  tableName: 'help_messages',
  indexes: [
    { fields: ['help_request_id'] },
    { fields: ['sender_id'] },
    { fields: ['created_at'] },
  ],
});

module.exports = HelpMessage;
