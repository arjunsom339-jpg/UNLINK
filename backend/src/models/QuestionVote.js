'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * QUESTIONVOTE MODEL
 * Tracks upvotes on Questions.
 * One upvote per user per question, enforced at the DB level.
 */
const QuestionVote = sequelize.define('QuestionVote', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  questionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'questions', key: 'id' },
    onDelete: 'CASCADE',
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
}, {
  tableName: 'question_votes',
  indexes: [
    { unique: true, fields: ['question_id', 'user_id'], name: 'unique_question_user_vote' },
    { fields: ['question_id'] },
  ],
});

module.exports = QuestionVote;
