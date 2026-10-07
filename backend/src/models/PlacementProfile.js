'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PLACED_STATUSES = ['NOT_PLACED', 'PLACED', 'OPTED_OUT'];

/**
 * PLACEMENT PROFILE MODEL
 * Stores career-specific information (CGPA, backlogs, graduation year, resume, job preferences)
 * without corrupting the core StudentProfile identity.
 */
const PlacementProfile = sequelize.define('PlacementProfile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  collegeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'colleges', key: 'id' },
    onDelete: 'CASCADE',
  },
  resumeUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  resumeFilename: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  resumeUploadedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  cgpa: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: true,
    validate: {
      min: 0.0,
      max: 10.0,
    },
  },
  activeBacklogs: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
    },
  },
  totalBacklogs: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
    },
  },
  graduationYear: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  preferredRoles: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  preferredLocations: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  preferredWorkMode: {
    type: DataTypes.STRING(20),
    defaultValue: 'FLEXIBLE',
  },
  linkedinUrl: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  githubUrl: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  portfolioUrl: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  isWillingToRelocate: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  placedStatus: {
    type: DataTypes.STRING(20),
    defaultValue: 'NOT_PLACED',
    validate: {
      isIn: [PLACED_STATUSES],
    },
  },
  optedOutReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'placement_profiles',
  timestamps: true,
  indexes: [
    { fields: ['user_id'], unique: true },
    { fields: ['college_id'] },
    { fields: ['placed_status'] },
    { fields: ['graduation_year'] },
  ],
});

module.exports = PlacementProfile;
