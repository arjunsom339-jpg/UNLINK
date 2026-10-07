'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * CLUB MODEL
 * Represents student clubs, professional chapters, cultural groups, and academic societies.
 * Strictly scoped by College, with optional Department association.
 */
const Club = sequelize.define('Club', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  collegeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'colleges', key: 'id' },
    onDelete: 'CASCADE',
  },
  departmentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'departments', key: 'id' },
    onDelete: 'SET NULL',
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  shortName: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM(
      'TECHNICAL',
      'PROFESSIONAL',
      'CULTURAL',
      'SPORTS',
      'ACADEMIC',
      'SOCIAL_SERVICE',
      'ENTREPRENEURSHIP',
      'HOBBY',
      'DEPARTMENT',
      'OTHER'
    ),
    allowNull: false,
    defaultValue: 'OTHER',
  },
  logo: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  coverImage: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  foundedYear: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  facultyAdvisorId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
  },
  contactEmail: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true,
    },
  },
  contactPhone: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  meetingLocation: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  meetingSchedule: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  website: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  socialLinks: {
    type: DataTypes.JSON,
    defaultValue: {},
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'SUSPENDED', 'ARCHIVED'),
    allowNull: false,
    defaultValue: 'PENDING_REVIEW',
  },
  membershipApprovalRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  electionsEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
}, {
  tableName: 'clubs',
  indexes: [
    { fields: ['college_id', 'status'] },
    { fields: ['category'] },
    { fields: ['department_id'] },
    { fields: ['created_by'] },
    { fields: ['name'] },
  ],
});

module.exports = Club;
