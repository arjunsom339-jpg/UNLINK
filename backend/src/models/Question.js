'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * QUESTION MODEL
 * Academic Q&A system — students ask, students and teachers answer.
 */
const Question = sequelize.define('Question', {
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
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  subject: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  semester: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  isResolved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  acceptedAnswerId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  viewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  voteCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  answerCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: 'questions',
  indexes: [
    { fields: ['author_id'] },
    { fields: ['is_resolved'] },
    { fields: ['created_at'] },
    { fields: ['vote_count'] },
  ],
});

module.exports = Question;
