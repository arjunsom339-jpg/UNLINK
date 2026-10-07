'use strict';

const { sendError } = require('../utils/response');

const ROLES = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  ADMIN: 'admin',
  ALUMNI: 'alumni',
};

const ADMIN_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MODERATOR: 'MODERATOR',
};

/**
 * AUTHORIZE MIDDLEWARE
 * Enforces role-based access control (RBAC) independently on the server side.
 * A client cannot access another role's endpoints by manipulating requests.
 * 
 * @param {...string} allowedRoles - 'student', 'teacher', or 'admin'
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, {
        statusCode: 401,
        message: 'Authentication required before authorization check.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, {
        statusCode: 403,
        code: 'ROLE_FORBIDDEN',
        message: `Access denied. Endpoint restricted to [${allowedRoles.join(', ')}]. Your role is '${req.user.role}'.`,
      });
    }

    next();
  };
};

/**
 * REQUIRE ADMIN SUB-ROLE
 * Checks granular permissions among administrators: SUPER_ADMIN, ADMIN, MODERATOR.
 * 
 * @param {...string} allowedAdminRoles
 */
const requireAdminRole = (...allowedAdminRoles) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
      return sendError(res, {
        statusCode: 403,
        code: 'ADMIN_REQUIRED',
        message: 'Administrative privileges required.',
      });
    }

    // Default to SUPER_ADMIN if adminRole not explicitly stored
    const userAdminRole = req.user.adminRole || 'SUPER_ADMIN';

    if (!allowedAdminRoles.includes(userAdminRole)) {
      return sendError(res, {
        statusCode: 403,
        code: 'INSUFFICIENT_ADMIN_PRIVILEGE',
        message: `Requires one of admin privileges: [${allowedAdminRoles.join(', ')}]. Current: '${userAdminRole}'.`,
      });
    }

    next();
  };
};

// Common RBAC shorthand guards
const studentOnly    = authorize(ROLES.STUDENT);
const teacherOnly    = authorize(ROLES.TEACHER);
const adminOnly      = authorize(ROLES.ADMIN);
const alumniOnly     = authorize(ROLES.ALUMNI);
const staffOnly      = authorize(ROLES.TEACHER, ROLES.ADMIN);
const superAdminOnly = requireAdminRole(ADMIN_ROLES.SUPER_ADMIN);

module.exports = {
  ROLES,
  ADMIN_ROLES,
  authorize,
  requireAdminRole,
  studentOnly,
  teacherOnly,
  adminOnly,
  alumniOnly,
  staffOnly,
  superAdminOnly,
};
