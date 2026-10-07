'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * MARKETPLACE INQUIRY MODEL
 * Represents a buyer interest / query on a campus marketplace listing.
 */
const MarketplaceInquiry = sequelize.define('MarketplaceInquiry', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  listingId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'marketplace_listings', key: 'id' },
    onDelete: 'CASCADE',
  },
  buyerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('OPEN', 'ACCEPTED', 'DECLINED', 'CLOSED'),
    allowNull: false,
    defaultValue: 'OPEN',
  },
}, {
  tableName: 'marketplace_inquiries',
  indexes: [
    { fields: ['listing_id', 'status'] },
    { fields: ['buyer_id'] },
    { fields: ['created_at'] },
  ],
});

module.exports = MarketplaceInquiry;
