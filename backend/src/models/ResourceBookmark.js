'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * RESOURCE BOOKMARK MODEL
 * Records saved/bookmarked academic resources for students.
 */
const ResourceBookmark = sequelize.define('ResourceBookmark', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  resourceId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'resources', key: 'id' },
    onDelete: 'CASCADE',
  },
  studentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
}, {
  tableName: 'resource_bookmarks',
  indexes: [
    {
      fields: ['resource_id', 'student_id'],
      unique: true,
    },
    {
      fields: ['student_id'],
    },
    {
      fields: ['created_at'],
    },
  ],
});

module.exports = ResourceBookmark;
