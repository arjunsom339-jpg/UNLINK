'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * CLUB ELECTION MODEL
 * Governs leadership elections within a club.
 * States: DRAFT -> UPCOMING -> OPEN -> CLOSED -> RESULTS_PUBLISHED (or CANCELLED).
 */
const ClubElection = sequelize.define('ClubElection', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  clubId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'clubs', key: 'id' },
    onDelete: 'CASCADE',
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  startAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'UPCOMING', 'OPEN', 'CLOSED', 'CANCELLED', 'RESULTS_PUBLISHED'),
    allowNull: false,
    defaultValue: 'DRAFT',
  },
  eligibleMembershipRule: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'e.g. { minDaysJoined: 0, requiredRole: "MEMBER" }',
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
}, {
  tableName: 'club_elections',
  indexes: [
    { fields: ['club_id', 'status'] },
    { fields: ['start_at', 'end_at'] },
    { fields: ['created_by'] },
  ],
});

module.exports = ClubElection;
