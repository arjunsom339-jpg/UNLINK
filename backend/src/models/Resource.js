'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RESOURCE_TYPES = [
  'NOTES',
  'STUDY_MATERIAL',
  'PYQ',
  'LAB_MANUAL',
  'LAB_PROGRAM',
  'ASSIGNMENT',
  'QUESTION_BANK',
  'SYLLABUS',
  'PRESENTATION',
  'REFERENCE',
  'EBOOK',
  'OTHER',
];

const RESOURCE_VISIBILITIES = [
  'COLLEGE',
  'DEPARTMENT',
  'SEMESTER',
  'PRIVATE',
];

const RESOURCE_STATUSES = [
  'DRAFT',
  'PENDING_REVIEW',
  'PUBLISHED',
  'REJECTED',
  'ARCHIVED',
];

/**
 * RESOURCE MODEL
 * Centralized repository for academic documents, PYQs, notes, lab manuals.
 */
const Resource = sequelize.define('Resource', {
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
  uploadedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Resource title is required.' },
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  resourceType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      isIn: {
        args: [RESOURCE_TYPES],
        msg: `Invalid resource type. Supported: ${RESOURCE_TYPES.join(', ')}`,
      },
    },
  },
  subject: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Subject is required.' },
    },
  },
  subjectCode: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Subject code is required.' },
    },
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
    validate: {
      min: 1,
      max: 10,
    },
  },
  academicYear: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  university: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  fileUrl: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  fileName: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  fileType: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  thumbnailUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  visibility: {
    type: DataTypes.STRING(30),
    defaultValue: 'COLLEGE',
    validate: {
      isIn: {
        args: [RESOURCE_VISIBILITIES],
        msg: `Invalid visibility. Supported: ${RESOURCE_VISIBILITIES.join(', ')}`,
      },
    },
  },
  status: {
    type: DataTypes.STRING(30),
    defaultValue: 'PENDING_REVIEW',
    validate: {
      isIn: {
        args: [RESOURCE_STATUSES],
        msg: `Invalid status. Supported: ${RESOURCE_STATUSES.join(', ')}`,
      },
    },
  },
  moderationReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  moderatedById: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
  },
  moderatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  downloadCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  viewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: 'resources',
  indexes: [
    { fields: ['college_id'] },
    { fields: ['department_id'] },
    { fields: ['semester'] },
    { fields: ['resource_type'] },
    { fields: ['subject'] },
    { fields: ['subject_code'] },
    { fields: ['status'] },
    { fields: ['uploaded_by'] },
    { fields: ['created_at'] },
    // Composite indexes
    { fields: ['college_id', 'status'] },
    { fields: ['college_id', 'department_id', 'semester'] },
    { fields: ['college_id', 'resource_type'] },
    { fields: ['subject_code', 'semester'] },
    { fields: ['uploaded_by', 'status'] },
  ],
});

module.exports = Resource;
module.exports.RESOURCE_TYPES = RESOURCE_TYPES;
module.exports.RESOURCE_VISIBILITIES = RESOURCE_VISIBILITIES;
module.exports.RESOURCE_STATUSES = RESOURCE_STATUSES;
