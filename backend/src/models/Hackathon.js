'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * HACKATHON TEAM FORMATION MODEL
 * Represents student hackathon team recruiting listings.
 */
const Hackathon = sequelize.define('Hackathon', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  creatorId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  collegeId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'colleges', key: 'id' },
    onDelete: 'SET NULL',
  },
  title: {
    type: DataTypes.STRING(150),
    allowNull: false,
    comment: 'Hackathon or Team Name (e.g. Smart India Hackathon 2026 - Team NeuralByte)',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  requiredSkills: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  teamSize: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 4,
  },
  currentMembersCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  lookingFor: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'e.g. Frontend Specialist, ML Engineer, Pitch Presenter',
  },
  eventDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  registrationDeadline: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'open',
    comment: 'open, filled, completed',
  },
}, {
  tableName: 'hackathons',
  indexes: [
    { fields: ['creator_id'] },
    { fields: ['college_id'] },
    { fields: ['status'] },
  ],
});

module.exports = Hackathon;
