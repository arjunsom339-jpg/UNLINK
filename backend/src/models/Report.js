'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * REPORT MODEL
 * Allows students to report inappropriate profiles or behavior.
 * Reports are stored for Admin moderation.
 */
const Report = sequelize.define('Report', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  reporterId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  reportedUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  resourceId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'resources', key: 'id' },
    onDelete: 'CASCADE',
  },
  opportunityId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'opportunities', key: 'id' },
    onDelete: 'CASCADE',
  },
  clubId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'clubs', key: 'id' },
    onDelete: 'CASCADE',
  },
  marketplaceListingId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'marketplace_listings', key: 'id' },
    onDelete: 'CASCADE',
  },
  lostFoundItemId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'lost_found_items', key: 'id' },
    onDelete: 'CASCADE',
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'spam, harassment, fake_profile, inappropriate_content, misuse, fake_opportunity, scam, club_violation, exchange_violation, other',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Detailed description of the reported behavior',
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'pending',
    comment: 'pending, reviewed, resolved, dismissed',
  },
  reviewedById: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
  },
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  adminNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'reports',
  indexes: [
    { fields: ['reporter_id'] },
    { fields: ['reported_user_id'] },
    { fields: ['opportunity_id'] },
    { fields: ['club_id'] },
    { fields: ['marketplace_listing_id'] },
    { fields: ['lost_found_item_id'] },
    { fields: ['status'] },
    { fields: ['category'] },
  ],
});

module.exports = Report;
