'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * EVENT BOOKMARK MODEL
 * Allows students to save and bookmark events for later review.
 */
const EventBookmark = sequelize.define('EventBookmark', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  eventId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'events', key: 'id' },
    onDelete: 'CASCADE',
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
}, {
  tableName: 'event_bookmarks',
  indexes: [
    { fields: ['event_id', 'user_id'], unique: true },
    { fields: ['user_id'] },
  ],
});

module.exports = EventBookmark;
