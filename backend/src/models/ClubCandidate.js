'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * CLUB CANDIDATE MODEL
 * Represents a student nominating themselves or approved as a candidate for a position.
 */
const ClubCandidate = sequelize.define('ClubCandidate', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  electionPositionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'club_election_positions', key: 'id' },
    onDelete: 'CASCADE',
  },
  studentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  manifesto: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  approved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  approvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
  },
}, {
  tableName: 'club_candidates',
  indexes: [
    { fields: ['election_position_id'] },
    { fields: ['student_id'] },
  ],
});

module.exports = ClubCandidate;
