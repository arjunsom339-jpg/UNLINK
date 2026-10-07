'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * REPUTATION LOG MODEL
 * Tamper-proof event log tracking reputation points earned through legitimate
 * academic interactions: helpful answers, verified mentorship, skill exchanges,
 * and community assistance.
 */
const ReputationLog = sequelize.define('ReputationLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  points: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10,
  },
  reason: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  actionType: {
    type: DataTypes.STRING(40),
    allowNull: false,
    comment: 'helpful_answer, mentorship_completed, skill_exchange, peer_endorsed, community_help',
  },
  sourceId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Reference to question, help request, or connection session',
  },
  actorId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    comment: 'User who endorsed or benefited from the action (prevents self-awarding)',
  },
}, {
  tableName: 'reputation_logs',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['action_type'] },
    { fields: ['created_at'] },
  ],
});

module.exports = ReputationLog;
