'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * STUDENT SKILL MODEL
 * Associates a student profile with a catalog skill, capturing:
 * - Type: 'known' (skills I can do/teach) vs 'wanted' (skills I want to learn)
 * - Proficiency: beginner, intermediate, advanced
 * - Teaching willingness: canTeach
 */
const StudentSkill = sequelize.define('StudentSkill', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  studentProfileId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'student_profiles', key: 'id' },
    onDelete: 'CASCADE',
  },
  skillId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'skills', key: 'id' },
    onDelete: 'CASCADE',
  },
  skillType: {
    type: DataTypes.STRING(16),
    allowNull: false,
    defaultValue: 'known',
    comment: 'known or wanted',
  },
  proficiency: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'intermediate',
    comment: 'beginner, intermediate, advanced',
  },
  canTeach: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether student is willing to help or teach others this skill',
  },
  experienceMonths: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
}, {
  tableName: 'student_skills',
  indexes: [
    { fields: ['student_profile_id', 'skill_id', 'skill_type'], unique: true },
    { fields: ['skill_id'] },
    { fields: ['skill_type'] },
    { fields: ['proficiency'] },
  ],
});

module.exports = StudentSkill;
