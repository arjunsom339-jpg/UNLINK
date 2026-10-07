'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OPPORTUNITY_TYPES = [
  'INTERNSHIP',
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'APPRENTICESHIP',
  'CAMPUS_DRIVE',
  'OFF_CAMPUS',
  'OTHER',
];

const CATEGORIES = [
  'SOFTWARE',
  'AI_ML',
  'DATA',
  'CLOUD',
  'DEVOPS',
  'WEB',
  'MOBILE',
  'FINANCE',
  'CORE_ENGINEERING',
  'PRODUCT',
  'DESIGN',
  'SALES',
  'MARKETING',
  'HR',
  'OTHER',
];

const WORK_MODES = ['ONSITE', 'REMOTE', 'HYBRID'];

const OPPORTUNITY_STATUSES = [
  'DRAFT',
  'PUBLISHED',
  'APPLICATION_OPEN',
  'APPLICATION_CLOSED',
  'SHORTLISTING',
  'INTERVIEWING',
  'SELECTED',
  'COMPLETED',
  'CANCELLED',
];

const VISIBILITY_OPTIONS = ['COLLEGE_ONLY', 'PUBLIC_WITHIN_UNILINK'];
const APPLICATION_METHODS = ['DIRECT', 'EXTERNAL'];
const SOURCE_TYPES = ['TPC', 'COMPANY', 'ALUMNI', 'ADMIN'];

/**
 * OPPORTUNITY MODEL
 * Job, internship, or campus recruitment drive listing created by TPC / Admin.
 */
const Opportunity = sequelize.define('Opportunity', {
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
  companyId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'companies', key: 'id' },
    onDelete: 'SET NULL',
  },
  companyName: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Company name is required.' },
    },
  },
  companyLogo: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  title: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Opportunity title is required.' },
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  opportunityType: {
    type: DataTypes.STRING(30),
    defaultValue: 'INTERNSHIP',
    validate: {
      isIn: [OPPORTUNITY_TYPES],
    },
  },
  category: {
    type: DataTypes.STRING(50),
    defaultValue: 'SOFTWARE',
    validate: {
      isIn: [CATEGORIES],
    },
  },
  location: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  workMode: {
    type: DataTypes.STRING(20),
    defaultValue: 'ONSITE',
    validate: {
      isIn: [WORK_MODES],
    },
  },
  stipend: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  salaryMin: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  salaryMax: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  currency: {
    type: DataTypes.STRING(10),
    defaultValue: 'INR',
  },
  duration: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  applicationDeadline: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  driveDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  venue: {
    type: DataTypes.STRING(200),
    allowNull: true,
  },
  applicationMethod: {
    type: DataTypes.STRING(20),
    defaultValue: 'DIRECT',
    validate: {
      isIn: [APPLICATION_METHODS],
    },
  },
  applicationUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  contactEmail: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  eligibility: {
    type: DataTypes.JSON,
    defaultValue: {
      eligibleDepartments: [],
      eligibleSemesters: [],
      eligibleGraduationYears: [],
      minimumCgpa: null,
      maxActiveBacklogs: null,
      maxTotalBacklogs: null,
      requiredSkills: [],
    },
  },
  status: {
    type: DataTypes.STRING(30),
    defaultValue: 'DRAFT',
    validate: {
      isIn: [OPPORTUNITY_STATUSES],
    },
  },
  visibility: {
    type: DataTypes.STRING(30),
    defaultValue: 'COLLEGE_ONLY',
    validate: {
      isIn: [VISIBILITY_OPTIONS],
    },
  },
  sourceType: {
    type: DataTypes.STRING(30),
    defaultValue: 'TPC',
    validate: {
      isIn: [SOURCE_TYPES],
    },
  },
  viewsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  applicationsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: 'opportunities',
  timestamps: true,
  indexes: [
    { fields: ['college_id', 'status'] },
    { fields: ['company_id'] },
    { fields: ['application_deadline'] },
    { fields: ['opportunity_type'] },
    { fields: ['category'] },
  ],
});

module.exports = Opportunity;
