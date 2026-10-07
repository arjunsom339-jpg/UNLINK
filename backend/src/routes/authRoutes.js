'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');

const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');
const {
  registerStudentRules,
  registerTeacherRules,
  loginRules,
  firebaseLoginRules,
  refreshTokenRules,
  forgotPasswordRules,
  resetPasswordRules,
  verifyEmailRules,
} = require('../validators/authValidators');

const router = express.Router();

// Strict rate limiter for authentication endpoints
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: { success: false, message: 'Too many authentication attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Registration Routes ────────────────────────────────────────────────────

/** POST /api/auth/register/student */
router.post(
  '/register/student',
  authRateLimit,
  registerStudentRules,
  validate,
  authController.registerStudent
);

/** POST /api/auth/register/teacher */
router.post(
  '/register/teacher',
  authRateLimit,
  registerTeacherRules,
  validate,
  authController.registerTeacher
);

// ── Dedicated Login Doors ──────────────────────────────────────────────────

/** POST /api/auth/login — generic login */
router.post(
  '/login',
  authRateLimit,
  loginRules,
  validate,
  authController.login
);

/** POST /api/auth/login/student — student login entry point */
router.post(
  '/login/student',
  authRateLimit,
  loginRules,
  validate,
  authController.loginStudent
);

/** POST /api/auth/login/teacher — faculty login entry point */
router.post(
  '/login/teacher',
  authRateLimit,
  loginRules,
  validate,
  authController.loginTeacher
);

/** POST /api/auth/login/admin — administrative console entry point */
router.post(
  '/login/admin',
  authRateLimit,
  loginRules,
  validate,
  authController.loginAdmin
);

// ── Third-Party & OTP Authentication ───────────────────────────────────────

/** POST /api/auth/firebase — Google OAuth & Phone OTP */
router.post(
  '/firebase',
  authRateLimit,
  firebaseLoginRules,
  validate,
  authController.firebaseLogin
);

// ── Token Management & Session Invalidation ────────────────────────────────

/** POST /api/auth/refresh — token rotation */
router.post(
  '/refresh',
  refreshTokenRules,
  validate,
  authController.refreshToken
);

/** POST /api/auth/logout — revoke session */
router.post(
  '/logout',
  authController.logout
);

// ── Password Reset & Email Verification ────────────────────────────────────

/** POST /api/auth/forgot-password */
router.post(
  '/forgot-password',
  authRateLimit,
  forgotPasswordRules,
  validate,
  authController.forgotPassword
);

/** POST /api/auth/reset-password */
router.post(
  '/reset-password',
  authRateLimit,
  resetPasswordRules,
  validate,
  authController.resetPassword
);

/** POST /api/auth/verify-email */
router.post(
  '/verify-email',
  verifyEmailRules,
  validate,
  authController.verifyEmail
);

// ── Protected Current User ─────────────────────────────────────────────────

/** GET /api/auth/me */
router.get(
  '/me',
  authenticate,
  authController.getMe
);

module.exports = router;
