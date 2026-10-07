'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const VERIFICATION_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'];

/**
 * COMPANY MODEL
 * Represents prospective employers and internship providers associated with a college.
 */
const Company = sequelize.define('Company', {
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
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Company name cannot be empty.' },
    },
  },
  logo: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  website: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  industry: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  headquarters: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  verificationStatus: {
    type: DataTypes.STRING(20),
    defaultValue: 'PENDING',
    validate: {
      isIn: [VERIFICATION_STATUSES],
    },
  },
  verifiedById: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
  },
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  verificationNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'companies',
  timestamps: true,
  indexes: [
    { fields: ['college_id'] },
    { fields: ['name'] },
    { fields: ['verification_status'] },
  ],
});

module.exports = Company;
