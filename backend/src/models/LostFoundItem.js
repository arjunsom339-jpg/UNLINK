'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * LOST & FOUND ITEM MODEL
 * Represents belongings reported lost or found across campus.
 * Enforces college-level multi-tenancy isolation.
 */
const LostFoundItem = sequelize.define('LostFoundItem', {
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
  reporterId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  type: {
    type: DataTypes.ENUM('LOST', 'FOUND'),
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM(
      'ID_CARD',
      'DOCUMENT',
      'PHONE',
      'LAPTOP',
      'BAG',
      'WALLET',
      'KEYS',
      'BOOK',
      'ELECTRONICS',
      'CLOTHING',
      'VEHICLE_ITEM',
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
  location: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Safe campus-based location description, e.g. Central Library, CSE 3rd Floor',
  },
  itemDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  status: {
    type: DataTypes.ENUM('OPEN', 'MATCHED', 'CLAIMED', 'RESOLVED', 'EXPIRED', 'ARCHIVED'),
    allowNull: false,
    defaultValue: 'OPEN',
  },
  imageUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  contactPreference: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'IN_APP',
  },
  verificationQuestion: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Security question to verify ownership without exposing sensitive details',
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  resolvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'lost_found_items',
  indexes: [
    { fields: ['college_id', 'status'] },
    { fields: ['college_id', 'type'] },
    { fields: ['category'] },
    { fields: ['reporter_id'] },
    { fields: ['item_date'] },
    { fields: ['status'] },
  ],
});

module.exports = LostFoundItem;
