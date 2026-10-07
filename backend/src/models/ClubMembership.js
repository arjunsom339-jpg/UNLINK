'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * CLUB MEMBERSHIP MODEL
 * Represents a student's membership and leadership status within a club.
 * Enforces one membership record per (club, student).
 */
const ClubMembership = sequelize.define('ClubMembership', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  clubId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'clubs', key: 'id' },
    onDelete: 'CASCADE',
  },
  studentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'LEFT'),
    allowNull: false,
    defaultValue: 'PENDING',
  },
  joinedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  approvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
  },
  leftAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  role: {
    type: DataTypes.ENUM('MEMBER', 'OFFICER', 'SECRETARY', 'TREASURER', 'VICE_PRESIDENT', 'PRESIDENT'),
    allowNull: false,
    defaultValue: 'MEMBER',
  },
  isCurrent: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'club_memberships',
  indexes: [
    {
      unique: true,
      fields: ['club_id', 'student_id'],
      name: 'unique_club_student_membership',
    },
    { fields: ['club_id', 'status'] },
    { fields: ['student_id', 'status'] },
    { fields: ['role'] },
  ],
});

module.exports = ClubMembership;
