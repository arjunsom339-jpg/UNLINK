'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * MENTORSHIP FEEDBACK MODEL
 * 1-to-5 star evaluation after mentorship completion that feeds into Reputation.
 */
const MentorshipFeedback = sequelize.define('MentorshipFeedback', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  mentorshipRequestId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'mentorship_requests', key: 'id' },
    onDelete: 'CASCADE',
  },
  reviewerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  targetUserId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 5 },
  },
  helpfulness: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1, max: 5 },
  },
  communication: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1, max: 5 },
  },
  review: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'mentorship_feedbacks',
  indexes: [
    { fields: ['mentorship_request_id', 'reviewer_id'], unique: true },
    { fields: ['target_user_id'] },
  ],
});

module.exports = MentorshipFeedback;
