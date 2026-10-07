'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * CLUB OFFICER MODEL
 * Records appointed leadership positions and terms for students in a club.
 */
const ClubOfficer = sequelize.define('ClubOfficer', {
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
  studentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  position: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  appointedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
  },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'INACTIVE'),
    allowNull: false,
    defaultValue: 'ACTIVE',
  },
}, {
  tableName: 'club_officers',
  indexes: [
    { fields: ['club_id', 'status'] },
    { fields: ['student_id'] },
  ],
});

module.exports = ClubOfficer;
