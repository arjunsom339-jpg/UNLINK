'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * ANNOUNCEMENT MODEL
 * Published by teachers or admins.
 */
const Announcement = sequelize.define('Announcement', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  authorId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  title: {
    type: DataTypes.STRING(300),
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM('academic', 'event', 'general', 'urgent', 'placement', 'workshop'),
    defaultValue: 'general',
  },
  targetAudience: {
    type: DataTypes.ENUM('all', 'students', 'teachers', 'department', 'semester'),
    defaultValue: 'all',
  },
  targetDepartment: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  targetSemester: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  isPinned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isPublished: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  publishedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  attachments: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of file URLs',
  },
  viewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: 'announcements',
  indexes: [
    { fields: ['author_id'] },
    { fields: ['category'] },
    { fields: ['is_pinned'] },
    { fields: ['published_at'] },
    { fields: ['target_audience'] },
  ],
});

module.exports = Announcement;
