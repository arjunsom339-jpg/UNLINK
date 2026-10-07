'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * EVENT REGISTRATION MODEL
 * Tracks student registrations, waitlists, and attendance for campus events.
 */
const EventRegistration = sequelize.define('EventRegistration', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  eventId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'events', key: 'id' },
    onDelete: 'CASCADE',
  },
  studentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  status: {
    type: DataTypes.ENUM('REGISTERED', 'CANCELLED', 'WAITLISTED', 'ATTENDED', 'NO_SHOW'),
    allowNull: false,
    defaultValue: 'REGISTERED',
  },
  registeredAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  attendanceStatus: {
    type: DataTypes.ENUM('PENDING', 'ATTENDED', 'NO_SHOW'),
    allowNull: false,
    defaultValue: 'PENDING',
  },
  attendedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  notes: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
}, {
  tableName: 'event_registrations',
  indexes: [
    { fields: ['event_id', 'student_id'], unique: true },
    { fields: ['event_id', 'status'] },
    { fields: ['student_id', 'status'] },
    { fields: ['event_id', 'attendance_status'] },
  ],
});

module.exports = EventRegistration;
