'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * MARKETPLACE BOOKMARK MODEL
 * Saved / favorited marketplace items for quick access.
 */
const MarketplaceBookmark = sequelize.define('MarketplaceBookmark', {
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
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
}, {
  tableName: 'marketplace_bookmarks',
  indexes: [
    {
      unique: true,
      fields: ['listing_id', 'user_id'],
    },
    {
      fields: ['user_id'],
    },
  ],
});

module.exports = MarketplaceBookmark;
