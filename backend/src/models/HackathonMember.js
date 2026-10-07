'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * HACKATHON MEMBER MODEL
 * Tracks membership and team join requests for hackathons.
 */
const HackathonMember = sequelize.define('HackathonMember', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  hackathonId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'hackathons', key: 'id' },
    onDelete: 'CASCADE',
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  role: {
    type: DataTypes.STRING(64),
    defaultValue: 'Teammate',
    comment: 'Lead, Teammate, Specialist',
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'pending',
    comment: 'pending, accepted, rejected, left',
  },
  message: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Note detailing skills, relevant experience or portfolio links',
  },
}, {
  tableName: 'hackathon_members',
  indexes: [
    { fields: ['hackathon_id', 'user_id'], unique: true },
    { fields: ['status'] },
  ],
});

module.exports = HackathonMember;
