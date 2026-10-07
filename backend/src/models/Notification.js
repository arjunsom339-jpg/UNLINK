'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * NOTIFICATION MODEL
 * Stores in-app alerts and notifications for events, registrations, and campus updates.
 * Ready for future FCM / WebSocket delivery.
 */
const Notification = sequelize.define('Notification', {
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
  type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'EVENT_REGISTRATION, EVENT_CANCELLATION, REGISTRATION_CANCELLED, EVENT_REMINDER, EVENT_UPDATE, WAITLIST_PROMOTED',
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  data: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'notifications',
  indexes: [
    { fields: ['user_id', 'is_read'] },
    { fields: ['user_id', 'created_at'] },
  ],
});

module.exports = Notification;
