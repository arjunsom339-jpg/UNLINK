'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * CLUB ANNOUNCEMENT MODEL
 * Official notices broadcasted to club members.
 */
const ClubAnnouncement = sequelize.define('ClubAnnouncement', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  clubId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'clubs', key: 'id' },
    onDelete: 'CASCADE',
  },
  authorId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  pinned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  publishedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  status: {
    type: DataTypes.ENUM('PUBLISHED', 'ARCHIVED', 'DRAFT'),
    allowNull: false,
    defaultValue: 'PUBLISHED',
  },
}, {
  tableName: 'club_announcements',
  indexes: [
    { fields: ['club_id', 'status'] },
    { fields: ['club_id', 'pinned'] },
    { fields: ['published_at'] },
  ],
});

module.exports = ClubAnnouncement;
