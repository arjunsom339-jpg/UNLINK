'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * EVENT MODEL
 * Represents official campus activities, hackathons, workshops, and student fests.
 * Multi-college ready, organized by College and Department.
 */
const Event = sequelize.define('Event', {
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
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM(
      'hackathon',
      'workshop',
      'technical_fest',
      'seminar',
      'sports',
      'cultural',
      'competition',
      'club',
      'placement',
      'academic',
      'other'
    ),
    allowNull: false,
    defaultValue: 'other',
  },
  eventType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'in_person', // in_person, virtual, hybrid
  },
  organizerName: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  organizerContact: {
    type: DataTypes.STRING(200),
    allowNull: true,
  },
  venue: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  locationLabel: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  startDateTime: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endDateTime: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  registrationStart: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  registrationEnd: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  maxParticipants: {
    type: DataTypes.INTEGER,
    allowNull: true, // null represents unlimited seats
  },
  registrationRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  registrationLink: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  bannerImage: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'CANCELLED'),
    allowNull: false,
    defaultValue: 'DRAFT',
  },
  visibility: {
    type: DataTypes.ENUM('COLLEGE', 'DEPARTMENT', 'SEMESTER', 'PRIVATE_INVITE'),
    allowNull: false,
    defaultValue: 'COLLEGE',
  },
  departmentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'departments', key: 'id' },
    onDelete: 'SET NULL',
  },
  semester: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  registrationCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  cancellationReason: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  clubId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'clubs', key: 'id' },
    onDelete: 'SET NULL',
  },
}, {
  tableName: 'events',
  indexes: [
    { fields: ['college_id', 'status'] },
    { fields: ['college_id', 'start_date_time'] },
    { fields: ['created_by', 'status'] },
    { fields: ['category', 'start_date_time'] },
    { fields: ['department_id'] },
    { fields: ['visibility'] },
    { fields: ['club_id'] },
  ],
});

module.exports = Event;
