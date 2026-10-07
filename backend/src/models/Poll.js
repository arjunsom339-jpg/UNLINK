'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * POLL MODEL
 * Campus polls posted by students, teachers, or admins.
 * Options are stored as a JSON array with embedded vote counts.
 */
const Poll = sequelize.define('Poll', {
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
  question: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  options: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: 'Array of { text: string, votes: number }',
  },
  totalVotes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  targetAudience: {
    type: DataTypes.ENUM('all', 'students', 'department', 'semester'),
    defaultValue: 'all',
  },
  targetDepartment: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
}, {
  tableName: 'polls',
  indexes: [
    { fields: ['author_id'] },
    { fields: ['is_active'] },
    { fields: ['created_at'] },
  ],
});

module.exports = Poll;
