'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * LOST & FOUND CLAIM MODEL
 * Represents an ownership claim submitted by a student or teacher.
 */
const LostFoundClaim = sequelize.define('LostFoundClaim', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  itemId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'lost_found_items', key: 'id' },
    onDelete: 'CASCADE',
  },
  claimantId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  verificationAnswer: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Private answer to the finder verification question',
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'),
    allowNull: false,
    defaultValue: 'PENDING',
  },
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'lost_found_claims',
  indexes: [
    { fields: ['item_id', 'status'] },
    { fields: ['claimant_id'] },
    { fields: ['status'] },
  ],
});

module.exports = LostFoundClaim;
