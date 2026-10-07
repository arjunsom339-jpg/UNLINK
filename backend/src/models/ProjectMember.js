'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * PROJECT MEMBER MODEL
 * Tracks membership and join requests for collaborative projects.
 */
const ProjectMember = sequelize.define('ProjectMember', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'projects', key: 'id' },
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
    defaultValue: 'Contributor',
    comment: 'Lead, Contributor, Frontend, Backend, ML Engineer, Designer',
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'pending',
    comment: 'pending, accepted, rejected, left',
  },
  message: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Pitch or note explaining why student wants to join the project',
  },
}, {
  tableName: 'project_members',
  indexes: [
    { fields: ['project_id', 'user_id'], unique: true },
    { fields: ['status'] },
  ],
});

module.exports = ProjectMember;
