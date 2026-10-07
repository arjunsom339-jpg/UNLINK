'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * ALUMNI BOOKMARK MODEL
 * Allows students to save alumni profiles for quick access and mentorship planning.
 */
const AlumniBookmark = sequelize.define('AlumniBookmark', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  studentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  alumniProfileId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'alumni_profiles', key: 'id' },
    onDelete: 'CASCADE',
  },
}, {
  tableName: 'alumni_bookmarks',
  indexes: [
    { fields: ['student_id', 'alumni_profile_id'], unique: true },
    { fields: ['student_id'] },
    { fields: ['alumni_profile_id'] },
  ],
});

module.exports = AlumniBookmark;
