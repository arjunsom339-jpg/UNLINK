'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * SKILL MODEL
 * Standardized catalog of technical, academic, and soft skills with categories.
 */
const Skill = sequelize.define('Skill', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  category: {
    type: DataTypes.STRING(64),
    allowNull: false,
    defaultValue: 'General',
    comment: 'Programming, Web Development, AI/ML, Data & Cloud, Design, Soft Skills, Mobile & Systems',
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  isPopular: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'skills',
  indexes: [
    { fields: ['name'], unique: true },
    { fields: ['category'] },
  ],
});

module.exports = Skill;
