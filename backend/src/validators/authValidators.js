'use strict';

const { body, query } = require('express-validator');

const registerStudentRules = [
  body('fullName').trim().isLength({ min: 2, max: 150 }).withMessage('Full name must be 2–150 characters'),
  body('usn').trim().isLength({ min: 3, max: 30 }).withMessage('University Seat Number (USN) is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid institutional/college email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('phone').optional({ checkFalsy: true }).isMobilePhone().withMessage('Valid phone number is required'),
  body('department').optional().trim().isLength({ max: 100 }),
  body('semester').optional().isInt({ min: 1, max: 10 }).withMessage('Semester must be between 1 and 10'),
  body('college').optional().trim().isLength({ max: 200 }),
];

const registerTeacherRules = [
  body('fullName').trim().isLength({ min: 2, max: 150 }).withMessage('Full name must be 2–150 characters'),
  body('teacherId').trim().isLength({ min: 2, max: 50 }).withMessage('Institutional Teacher ID is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid college/institutional email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('phone').optional({ checkFalsy: true }).isMobilePhone().withMessage('Valid phone number is required'),
  body('department').optional().trim().isLength({ max: 100 }),
  body('designation').optional().trim().isLength({ max: 100 }),
  body('college').optional().trim().isLength({ max: 200 }),
];

const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  body('role').optional().isIn(['student', 'teacher', 'admin']).withMessage('Role must be student, teacher, or admin'),
];

const firebaseLoginRules = [
  body('idToken').notEmpty().withMessage('Firebase ID token is required'),
  body('role').optional().isIn(['student', 'teacher']).withMessage('Role must be student or teacher'),
];

const refreshTokenRules = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
];

const forgotPasswordRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email address is required'),
];

const resetPasswordRules = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
];

const verifyEmailRules = [
  body('token').notEmpty().withMessage('Verification token is required'),
];

module.exports = {
  registerStudentRules,
  registerTeacherRules,
  loginRules,
  firebaseLoginRules,
  refreshTokenRules,
  forgotPasswordRules,
  resetPasswordRules,
  verifyEmailRules,
};
