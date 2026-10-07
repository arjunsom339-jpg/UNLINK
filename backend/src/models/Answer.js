'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * ANSWER MODEL
 * Answers posted to academic Q&A questions.
 * Includes vote count and accepted/best-answer tracking.
 */
const Answer = sequelize.define('Answer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  questionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'questions', key: 'id' },
  },
  authorId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  isAccepted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Marked as the accepted/best answer by the question author',
  },
  voteCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: 'answers',
  indexes: [
    { fields: ['question_id'] },
    { fields: ['author_id'] },
    { fields: ['is_accepted'] },
    { fields: ['created_at'] },
  ],
});

module.exports = Answer;
