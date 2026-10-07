'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * REFRESH TOKEN / SESSION MODEL
 * Enforces server-side token rotation, session revocation, and logout invalidation.
 */
const RefreshToken = sequelize.define('RefreshToken', {
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
  tokenHash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'SHA-256 hash of the issued refresh token',
  },
  deviceInfo: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  ipAddress: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  isValid: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  tableName: 'refresh_tokens',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['token_hash'] },
    { fields: ['is_valid'] },
  ],
});

module.exports = RefreshToken;
