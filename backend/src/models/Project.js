'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * PROJECT COLLABORATION MODEL
 * Represents student project collaboration opportunities.
 */
const Project = sequelize.define('Project', {
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
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  requiredSkills: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  teammatesRequired: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 2,
  },
  currentTeamSize: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  category: {
    type: DataTypes.STRING(64),
    defaultValue: 'Web & Mobile',
    comment: 'Web & Mobile, AI/ML, IoT & Hardware, Blockchain, Research, Open Source',
  },
  deadline: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  githubUrl: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'open',
    comment: 'open, in_progress, completed',
  },
}, {
  tableName: 'projects',
  indexes: [
    { fields: ['creator_id'] },
    { fields: ['college_id'] },
    { fields: ['status'] },
    { fields: ['category'] },
  ],
});

module.exports = Project;
