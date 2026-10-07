'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * HELP REQUEST MODEL
 * Core of the emergency/help system.
 * Tracks the full lifecycle of peer-to-peer help requests.
 */
const HelpRequest = sequelize.define('HelpRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  requesterId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
    comment: 'Student who created the request',
  },
  helperId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
    comment: 'Primary assigned helper student',
  },

  // ── Request Details ────────────────────────────────────────────────────────
  category: {
    type: DataTypes.ENUM(
      'medical',
      'blood_requirement',
      'vehicle_breakdown',
      'lost_item',
      'campus_assistance',
      'academic_emergency',
      'safety',
      'travel',
      'other'
    ),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  urgencyLevel: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium',
  },
  contactPreference: {
    type: DataTypes.STRING(50),
    defaultValue: 'chat',
    comment: 'chat, phone, in_person',
  },
  attachmentUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },

  // ── Location & Privacy ─────────────────────────────────────────────────────
  latitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true,
  },
  longitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true,
  },
  locationLabel: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Human-readable location label (e.g. Main Library, CS Block 2nd Floor)',
  },
  locationConsented: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether requester explicitly consented to capture GPS location',
  },
  requesterLocationShared: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Live exact location sharing enabled by requester during active request',
  },
  helperLocationShared: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Live exact location sharing enabled by helper during active request',
  },
  helperLatitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true,
  },
  helperLongitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true,
  },
  helperLocationUpdate: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  // ── Lifecycle State Machine ────────────────────────────────────────────────
  status: {
    type: DataTypes.ENUM('pending', 'notified', 'accepted', 'active', 'resolved', 'cancelled', 'expired'),
    defaultValue: 'pending',
    allowNull: false,
  },
  cancellationReason: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  resolvedById: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },
  durationMinutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },

  // ── Visibility & Radius ────────────────────────────────────────────────────
  isAnonymous: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  radiusKm: {
    type: DataTypes.FLOAT,
    defaultValue: 5.0,
    comment: 'Radius within which to find nearby helpers',
  },
}, {
  tableName: 'help_requests',
  indexes: [
    { fields: ['requester_id'] },
    { fields: ['helper_id'] },
    { fields: ['status'] },
    { fields: ['category'] },
    { fields: ['urgency_level'] },
    { fields: ['created_at'] },
  ],
});

module.exports = HelpRequest;
