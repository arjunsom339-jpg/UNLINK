'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * CLUB ACTIVITY MODEL
 * Represents internal club sessions, workshops, project meetups, and practices.
 * Supports CLUB_ONLY vs COLLEGE visibility.
 */
const ClubActivity = sequelize.define('ClubActivity', {
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
  activityType: {
    type: DataTypes.ENUM(
      'MEETING',
      'WORKSHOP',
      'COMPETITION',
      'PROJECT',
      'OUTREACH',
      'PRACTICE',
      'OTHER'
    ),
    allowNull: false,
    defaultValue: 'MEETING',
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  startAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  registrationRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  status: {
    type: DataTypes.ENUM('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'),
    allowNull: false,
    defaultValue: 'UPCOMING',
  },
  visibility: {
    type: DataTypes.ENUM('CLUB_ONLY', 'COLLEGE'),
    allowNull: false,
    defaultValue: 'CLUB_ONLY',
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
}, {
  tableName: 'club_activities',
  indexes: [
    { fields: ['club_id', 'status'] },
    { fields: ['start_at'] },
    { fields: ['visibility'] },
    { fields: ['created_by'] },
  ],
});

module.exports = ClubActivity;
