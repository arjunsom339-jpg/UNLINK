'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * CLUB VOTE MODEL
 * Records a vote cast in a club election.
 * Enforces strict one-vote-per-position database unique constraint.
 * Individual voter choices are shielded from club leadership to preserve voter privacy.
 */
const ClubVote = sequelize.define('ClubVote', {
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
  positionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'club_election_positions', key: 'id' },
    onDelete: 'CASCADE',
  },
  voterStudentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  candidateId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'club_candidates', key: 'id' },
    onDelete: 'CASCADE',
  },
}, {
  tableName: 'club_votes',
  indexes: [
    {
      unique: true,
      fields: ['election_id', 'position_id', 'voter_student_id'],
      name: 'unique_election_position_voter',
    },
    { fields: ['election_id'] },
    { fields: ['candidate_id'] },
  ],
});

module.exports = ClubVote;
