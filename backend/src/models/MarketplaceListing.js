'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * MARKETPLACE LISTING MODEL
 * Represents a peer-to-peer campus classifieds listing within an institution.
 */
const MarketplaceListing = sequelize.define('MarketplaceListing', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  collegeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'colleges', key: 'id' },
    onDelete: 'CASCADE',
  },
  sellerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  category: {
    type: DataTypes.ENUM(
      'BOOKS',
      'ELECTRONICS',
      'COMPUTERS',
      'MOBILE_ACCESSORIES',
      'FURNITURE',
      'BICYCLE',
      'COLLEGE_SUPPLIES',
      'PROJECT_MATERIAL',
      'CLOTHING',
      'SPORTS',
      'OTHER'
    ),
    allowNull: false,
    defaultValue: 'OTHER',
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: '0 represents FREE item',
  },
  isNegotiable: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  condition: {
    type: DataTypes.ENUM('NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'USED'),
    allowNull: false,
    defaultValue: 'GOOD',
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'General campus pickup point, e.g. Hostel 3, Campus Gate 2',
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'ACTIVE', 'RESERVED', 'SOLD', 'EXPIRED', 'REMOVED'),
    allowNull: false,
    defaultValue: 'ACTIVE',
  },
  visibility: {
    type: DataTypes.ENUM('COLLEGE_ONLY', 'DEPARTMENT_ONLY'),
    allowNull: false,
    defaultValue: 'COLLEGE_ONLY',
  },
  images: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'marketplace_listings',
  indexes: [
    { fields: ['college_id', 'status'] },
    { fields: ['seller_id'] },
    { fields: ['category'] },
    { fields: ['price'] },
    { fields: ['created_at'] },
    { fields: ['status'] },
  ],
});

module.exports = MarketplaceListing;
