'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * OPPORTUNITY BOOKMARK MODEL
 * Allows students to bookmark/save placement opportunities for later review.
 */
const OpportunityBookmark = sequelize.define('OpportunityBookmark', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  opportunityId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'opportunities', key: 'id' },
    onDelete: 'CASCADE',
  },
  studentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
}, {
  tableName: 'opportunity_bookmarks',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['opportunity_id', 'student_id'],
      name: 'unique_opportunity_bookmark',
    },
    { fields: ['student_id'] },
    { fields: ['opportunity_id'] },
  ],
});

module.exports = OpportunityBookmark;
