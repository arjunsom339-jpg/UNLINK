'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * POLLVOTE MODEL
 * Tracks which user voted for which option in a poll.
 * Enforces one-vote-per-user-per-poll at the database level.
 */
const PollVote = sequelize.define('PollVote', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  pollId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'polls', key: 'id' },
    onDelete: 'CASCADE',
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  optionIndex: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Index of the selected option in Poll.options array',
  },
}, {
  tableName: 'poll_votes',
  indexes: [
    // Composite unique: one vote per user per poll (DB-level enforcement)
    { unique: true, fields: ['poll_id', 'user_id'], name: 'unique_poll_user_vote' },
    { fields: ['poll_id'] },
    { fields: ['user_id'] },
  ],
});

module.exports = PollVote;
