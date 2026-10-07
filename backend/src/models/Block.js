'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * BLOCK MODEL
 * Allows a student to block another student.
 * When blocked: cannot send connection requests, cannot message,
 * profile information is not exposed, excluded from discovery.
 */
const Block = sequelize.define('Block', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  blockerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  blockedId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  reason: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Optional reason for blocking',
  },
}, {
  tableName: 'blocks',
  indexes: [
    { fields: ['blocker_id', 'blocked_id'], unique: true },
    { fields: ['blocker_id'] },
    { fields: ['blocked_id'] },
  ],
});

module.exports = Block;
