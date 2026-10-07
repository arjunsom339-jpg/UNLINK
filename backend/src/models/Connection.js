'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * CONNECTION MODEL
 * Student-to-student connections (friend/network requests).
 */
const Connection = sequelize.define('Connection', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  requesterId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  receiverId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'pending',
    comment: 'pending, accepted, rejected, cancelled, removed, blocked',
  },
  connectionType: {
    type: DataTypes.STRING(30),
    defaultValue: 'peer',
    comment: 'peer, mentor_mentee, teammate, study_buddy',
  },
  message: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Optional message with connection request',
  },
  respondedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'connections',
  indexes: [
    { fields: ['requester_id', 'receiver_id'], unique: true },
    { fields: ['status'] },
    { fields: ['receiver_id'] },
  ],
});

module.exports = Connection;
