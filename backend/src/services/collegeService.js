'use strict';

const { College, Department } = require('../models');

const DEFAULT_COLLEGE_CONFIG = {
  name: process.env.COLLEGE_NAME || 'National Institute of Engineering',
  code: process.env.COLLEGE_CODE || 'NIE',
  domain: process.env.COLLEGE_DOMAIN || 'nie.ac.in',
  city: 'Mysuru',
  state: 'Karnataka',
  studentVerificationMode: 'admin_approval',
  teacherVerificationMode: 'admin_approval',
};

const DEFAULT_DEPARTMENTS = [
  { name: 'Computer Science & Engineering', code: 'CSE' },
  { name: 'Information Science & Engineering', code: 'ISE' },
  { name: 'Artificial Intelligence & Machine Learning', code: 'AIML' },
  { name: 'Electronics & Communication Engineering', code: 'ECE' },
  { name: 'Electrical & Electronics Engineering', code: 'EEE' },
  { name: 'Mechanical Engineering', code: 'MECH' },
  { name: 'Civil Engineering', code: 'CIVIL' },
];

/**
 * Ensures the default college and its departments exist in the database.
 * Returns the default college instance.
 */
const getDefaultCollege = async () => {
  let [college] = await College.findOrCreate({
    where: { code: DEFAULT_COLLEGE_CONFIG.code },
    defaults: DEFAULT_COLLEGE_CONFIG,
  });

  // Ensure default departments are populated for this college
  for (const dept of DEFAULT_DEPARTMENTS) {
    await Department.findOrCreate({
      where: { collegeId: college.id, code: dept.code },
      defaults: { collegeId: college.id, name: dept.name, code: dept.code },
    });
  }

  return college;
};

/**
 * Resolves a college by ID, code, or falls back to the default institution.
 */
const resolveCollege = async (collegeIdOrCode) => {
  if (!collegeIdOrCode) {
    return getDefaultCollege();
  }

  let college = await College.findByPk(collegeIdOrCode);
  if (!college) {
    college = await College.findOne({ where: { code: collegeIdOrCode } });
  }

  return college || getDefaultCollege();
};

module.exports = {
  getDefaultCollege,
  resolveCollege,
  DEFAULT_COLLEGE_CONFIG,
};
