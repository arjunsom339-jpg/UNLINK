'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * COLLEGE MODEL
 * Enables multi-college scaling while restricting MVP deployment to configured college.
 */
const College = sequelize.define('College', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Short institutional code (e.g. NIE, RVCE, BMSCE)',
  },
  domain: {
    type: DataTypes.STRING(150),
    allowNull: true,
    comment: 'Institutional email domain (e.g. nie.ac.in)',
  },
  address: {
    type: DataTypes.STRING(300),
    allowNull: true,
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  state: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  studentVerificationMode: {
    type: DataTypes.STRING(30),
    defaultValue: 'admin_approval',
    comment: 'admin_approval, email_domain, or hybrid',
  },
  teacherVerificationMode: {
    type: DataTypes.STRING(30),
    defaultValue: 'admin_approval',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'colleges',
  indexes: [
    { fields: ['code'], unique: true },
    { fields: ['domain'] },
    { fields: ['is_active'] },
  ],
});

module.exports = College;
