'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * HELP FEEDBACK MODEL
 * Post-resolution rating and reputation award.
 * Prevents duplicate ratings or score manipulation.
 */
const HelpFeedback = sequelize.define('HelpFeedback', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  helpRequestId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: { model: 'help_requests', key: 'id' },
    onDelete: 'CASCADE',
  },
  reviewerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
    comment: 'The student reviewing the assistance (usually requester)',
  },
  helperId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
    comment: 'The helper student being reviewed',
  },
  wasHelpful: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5,
    validate: { min: 1, max: 5 },
  },
  comments: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'help_feedbacks',
  indexes: [
    { fields: ['help_request_id'], unique: true },
    { fields: ['helper_id'] },
    { fields: ['reviewer_id'] },
  ],
});

module.exports = HelpFeedback;
