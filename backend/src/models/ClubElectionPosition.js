'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * CLUB ELECTION POSITION MODEL
 * Contested roles in an election (e.g. President, Vice President, Secretary, Treasurer).
 */
const ClubElectionPosition = sequelize.define('ClubElectionPosition', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  electionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'club_elections', key: 'id' },
    onDelete: 'CASCADE',
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  maxWinners: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'club_election_positions',
  indexes: [
    { fields: ['election_id'] },
  ],
});

module.exports = ClubElectionPosition;
