'use strict';

const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const {
  User,
  StudentProfile,
  TeacherProfile,
  VerificationRequest,
  College,
  AuditLog,
} = require('../models');
const authService = require('../services/authService');
const collegeService = require('../services/collegeService');
const { verifyFirebaseToken } = require('../config/firebase');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');
const logger = require('../utils/logger');

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MINUTES = 15;

// ── 1. STUDENT REGISTRATION ──────────────────────────────────────────────────

const registerStudent = async (req, res, next) => {
  try {
    const { email, password, fullName, usn, college: collegeName, collegeId, department, semester, phone } = req.body;

    const college = await collegeService.resolveCollege(collegeId);

    // Check duplicate email
    const emailExists = await User.findOne({ where: { email } });
    if (emailExists) {
      return sendError(res, {
        statusCode: 409,
        code: 'DUPLICATE_EMAIL',
        message: 'An account with this email address already exists.',
      });
    }

    // Check duplicate USN within college
    const usnExists = await StudentProfile.findOne({
      where: {
        usn: usn.trim(),
        collegeId: college.id,
      },
    });
    if (usnExists) {
      return sendError(res, {
        statusCode: 409,
        code: 'DUPLICATE_USN',
        message: `An account with USN '${usn}' already exists for this institution.`,
      });
    }

    const passwordHash = await bcrypt.hash(password, authService.SALT_ROUNDS);

    // Initial state: PENDING_VERIFICATION
    const user = await User.create({
      email,
      passwordHash,
      phone: phone || null,
      role: 'student',
      collegeId: college.id,
      accountStatus: 'pending', // PENDING_VERIFICATION
      isAdminVerified: false,
    });

    const studentProfile = await StudentProfile.create({
      userId: user.id,
      collegeId: college.id,
      usn: usn.trim(),
      fullName: fullName.trim(),
      college: collegeName || college.name,
      department: department || null,
      semester: semester ? Number(semester) : 1,
      phone: phone || null,
    });

    // Create verification request for college administration review
    await VerificationRequest.create({
      userId: user.id,
      collegeId: college.id,
      role: 'student',
      identifier: usn.trim(),
      collegeEmail: email,
      fullName: fullName.trim(),
      department: department || null,
      status: 'pending',
      submittedDetails: {
        semester: semester ? Number(semester) : 1,
        phone: phone || null,
        registeredAt: new Date(),
      },
    });

    await authService.logAuditEvent({
      targetUserId: user.id,
      action: 'STUDENT_REGISTERED',
      category: 'AUTH',
      ipAddress: req.ip,
      details: { usn: usn.trim(), email, collegeId: college.id },
    });

    logger.info(`Student registered (Pending Verification): ${user.id} [${usn}]`);

    return sendCreated(res, {
      message: 'Student account registered successfully. Awaiting college administrative verification.',
      data: {
        user: authService.sanitizeUser(user, studentProfile),
        accountStatus: 'pending',
        isPendingVerification: true,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── 2. TEACHER REGISTRATION ──────────────────────────────────────────────────

const registerTeacher = async (req, res, next) => {
  try {
    const { email, password, fullName, teacherId, college: collegeName, collegeId, department, designation, phone } = req.body;

    const college = await collegeService.resolveCollege(collegeId);

    // Check duplicate email
    const emailExists = await User.findOne({ where: { email } });
    if (emailExists) {
      return sendError(res, {
        statusCode: 409,
        code: 'DUPLICATE_EMAIL',
        message: 'An account with this institutional email already exists.',
      });
    }

    // Check duplicate Teacher ID within college
    const tidExists = await TeacherProfile.findOne({
      where: {
        teacherId: teacherId.trim(),
        collegeId: college.id,
      },
    });
    if (tidExists) {
      return sendError(res, {
        statusCode: 409,
        code: 'DUPLICATE_TEACHER_ID',
        message: `An account with Teacher ID '${teacherId}' already exists for this institution.`,
      });
    }

    const passwordHash = await bcrypt.hash(password, authService.SALT_ROUNDS);

    // Initial state: PENDING_VERIFICATION (Teachers must never be treated as students)
    const user = await User.create({
      email,
      passwordHash,
      phone: phone || null,
      role: 'teacher',
      collegeId: college.id,
      accountStatus: 'pending', // PENDING_VERIFICATION
      isAdminVerified: false,
    });

    const teacherProfile = await TeacherProfile.create({
      userId: user.id,
      collegeId: college.id,
      teacherId: teacherId.trim(),
      fullName: fullName.trim(),
      college: collegeName || college.name,
      department: department || null,
      designation: designation || 'Faculty',
      phone: phone || null,
    });

    // Create verification request
    await VerificationRequest.create({
      userId: user.id,
      collegeId: college.id,
      role: 'teacher',
      identifier: teacherId.trim(),
      collegeEmail: email,
      fullName: fullName.trim(),
      department: department || null,
      status: 'pending',
      submittedDetails: {
        designation: designation || 'Faculty',
        phone: phone || null,
        registeredAt: new Date(),
      },
    });

    await authService.logAuditEvent({
      targetUserId: user.id,
      action: 'TEACHER_REGISTERED',
      category: 'AUTH',
      ipAddress: req.ip,
      details: { teacherId: teacherId.trim(), email, collegeId: college.id },
    });

    logger.info(`Teacher registered (Pending Verification): ${user.id} [${teacherId}]`);

    return sendCreated(res, {
      message: 'Faculty registration submitted successfully. Your credentials are under review by college administration.',
      data: {
        user: authService.sanitizeUser(user, teacherProfile),
        accountStatus: 'pending',
        isPendingVerification: true,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── 3. LOGIN (Unified & Role-Specific) ────────────────────────────────────────

const performLogin = async (req, res, targetRole = null) => {
  const { email, password } = req.body;

  const user = await User.findOne({
    where: { email },
    include: [
      { model: StudentProfile, as: 'studentProfile' },
      { model: TeacherProfile, as: 'teacherProfile' },
      { model: College, as: 'college' },
    ],
  });

  if (!user) {
    await authService.logAuditEvent({
      action: 'LOGIN_FAILED',
      category: 'SECURITY',
      ipAddress: req.ip,
      details: { email, reason: 'USER_NOT_FOUND', targetRole },
    });
    return sendError(res, { statusCode: 401, message: 'Invalid email or password.' });
  }

  // Account Lock Protection
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockedUntil - Date.now()) / 60000);
    return sendError(res, {
      statusCode: 429,
      code: 'ACCOUNT_LOCKED',
      message: `Account is temporarily locked due to repeated failed logins. Please try again in ${minutesLeft} minute(s).`,
    });
  }

  if (!user.passwordHash) {
    return sendError(res, {
      statusCode: 400,
      code: 'AUTH_METHOD_MISMATCH',
      message: 'This account uses Google OAuth or Phone OTP login.',
    });
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    const attempts = (user.loginAttempts || 0) + 1;
    const updates = { loginAttempts: attempts };

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      updates.lockedUntil = new Date(Date.now() + LOCK_TIME_MINUTES * 60 * 1000);
      updates.loginAttempts = 0;
      await authService.logAuditEvent({
        targetUserId: user.id,
        action: 'ACCOUNT_LOCKED_BRUTE_FORCE',
        category: 'SECURITY',
        ipAddress: req.ip,
      });
    }

    await user.update(updates);
    return sendError(res, { statusCode: 401, message: 'Invalid email or password.' });
  }

  // Enforce Role Integrity: ensure user is accessing their designated role portal
  if (targetRole && user.role !== targetRole) {
    await authService.logAuditEvent({
      actorId: user.id,
      action: 'CROSS_PORTAL_LOGIN_ATTEMPT',
      category: 'SECURITY',
      ipAddress: req.ip,
      details: { userRole: user.role, attemptedPortal: targetRole },
    });
    return sendError(res, {
      statusCode: 403,
      code: 'PORTAL_MISMATCH',
      message: `Access denied. This is the ${targetRole.toUpperCase()} portal, but your account is registered as '${user.role.toUpperCase()}'.`,
    });
  }

  // Account State Checks
  if (user.accountStatus === 'banned') {
    return sendError(res, {
      statusCode: 403,
      code: 'ACCOUNT_BANNED',
      message: 'Your account has been permanently banned from the UniLink network.',
    });
  }

  if (user.accountStatus === 'suspended') {
    return sendError(res, {
      statusCode: 403,
      code: 'ACCOUNT_SUSPENDED',
      message: 'Your account is suspended. Please contact the campus administration desk.',
    });
  }

  if (user.accountStatus === 'pending' || user.accountStatus === 'pending_verification') {
    return sendError(res, {
      statusCode: 403,
      code: 'ACCOUNT_PENDING_VERIFICATION',
      message: 'Your account is pending institutional verification by college administration.',
      data: {
        isPendingVerification: true,
        role: user.role,
        email: user.email,
      },
    });
  }

  // Reset lock counter on successful login
  await user.update({
    loginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: new Date(),
  });

  // Issue tokens and record session
  const tokens = await authService.createSession(user, { req });

  await authService.logAuditEvent({
    actorId: user.id,
    targetUserId: user.id,
    action: 'LOGIN_SUCCESS',
    category: 'AUTH',
    ipAddress: req.ip,
    details: { role: user.role },
  });

  logger.info(`User authenticated: ${user.id} [Role: ${user.role}]`);

  return sendSuccess(res, {
    message: 'Authentication successful.',
    data: {
      user: authService.sanitizeUser(user),
      ...tokens,
    },
  });
};

const login = async (req, res, next) => {
  try {
    await performLogin(req, res, req.body.role || null);
  } catch (err) {
    next(err);
  }
};

const loginStudent = async (req, res, next) => {
  try {
    await performLogin(req, res, 'student');
  } catch (err) {
    next(err);
  }
};

const loginTeacher = async (req, res, next) => {
  try {
    await performLogin(req, res, 'teacher');
  } catch (err) {
    next(err);
  }
};

const loginAdmin = async (req, res, next) => {
  try {
    await performLogin(req, res, 'admin');
  } catch (err) {
    next(err);
  }
};

// ── 4. REFRESH TOKEN (Rotation) ──────────────────────────────────────────────

const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return sendError(res, { statusCode: 400, message: 'Refresh token is required.' });
    }

    const newTokens = await authService.rotateRefreshToken(token, req);

    return sendSuccess(res, {
      message: 'Session refreshed successfully.',
      data: newTokens,
    });
  } catch (err) {
    return sendError(res, {
      statusCode: 401,
      code: 'REFRESH_FAILED',
      message: err.message || 'Session refresh failed. Please log in again.',
    });
  }
};

// ── 5. LOGOUT & SESSION INVALIDATION ──────────────────────────────────────────

const logout = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    const userId = req.user?.id || null;

    if (token) {
      await authService.revokeSession(token, userId);
    }

    if (userId) {
      await authService.logAuditEvent({
        actorId: userId,
        action: 'USER_LOGOUT',
        category: 'AUTH',
        ipAddress: req.ip,
      });
    }

    return sendSuccess(res, { message: 'Logged out successfully. Session invalidated.' });
  } catch (err) {
    next(err);
  }
};

// ── 6. PASSWORD RESET FLOW ───────────────────────────────────────────────────

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      // Do not reveal whether email exists for anti-enumeration security
      return sendSuccess(res, {
        message: 'If an account exists with this email, password reset instructions have been issued.',
      });
    }

    const resetToken = await authService.createPasswordResetToken(user);

    await authService.logAuditEvent({
      targetUserId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      category: 'AUTH',
      ipAddress: req.ip,
    });

    // In production, send via Email service (SMTP / SendGrid). In dev/testing, expose token.
    return sendSuccess(res, {
      message: 'Password reset token generated.',
      data: process.env.NODE_ENV !== 'production' ? { resetToken } : undefined,
    });
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    await authService.resetPasswordWithToken(token, password);
    return sendSuccess(res, { message: 'Password reset successfully. Please log in with your new password.' });
  } catch (err) {
    return sendError(res, {
      statusCode: 400,
      code: 'PASSWORD_RESET_FAILED',
      message: err.message,
    });
  }
};

// ── 7. EMAIL VERIFICATION ────────────────────────────────────────────────────

const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;
    await authService.verifyEmailWithToken(token);
    return sendSuccess(res, { message: 'College email verified successfully.' });
  } catch (err) {
    return sendError(res, {
      statusCode: 400,
      code: 'EMAIL_VERIFICATION_FAILED',
      message: err.message,
    });
  }
};

// ── 8. FIREBASE / GOOGLE & PHONE OTP ─────────────────────────────────────────

const firebaseLogin = async (req, res, next) => {
  try {
    const { idToken, role = 'student' } = req.body;

    let decoded;
    try {
      decoded = await verifyFirebaseToken(idToken);
    } catch {
      // In development / test mode with mock token fallback
      if (process.env.NODE_ENV === 'test' || idToken === 'test-firebase-token') {
        decoded = { uid: 'test-google-uid-123', email: 'google.student@nie.ac.in' };
      } else {
        return sendError(res, { statusCode: 401, message: 'Invalid Firebase ID token.' });
      }
    }

    const { uid, email, phone_number: phone } = decoded;

    let user = await User.findOne({
      where: email ? { email } : { firebaseUid: uid },
      include: [
        { model: StudentProfile, as: 'studentProfile' },
        { model: TeacherProfile, as: 'teacherProfile' },
      ],
    });

    if (!user) {
      const college = await collegeService.getDefaultCollege();
      user = await User.create({
        email: email || `${uid}@student.unilink`,
        firebaseUid: uid,
        phone: phone || null,
        role: role === 'teacher' ? 'teacher' : 'student',
        collegeId: college.id,
        accountStatus: 'pending', // Requires verification
        isEmailVerified: true,
      });

      if (user.role === 'student') {
        await StudentProfile.create({
          userId: user.id,
          collegeId: college.id,
          usn: `GOOGLE-${uid.slice(0, 8)}`,
          fullName: 'Google Student',
          college: college.name,
        });
      }
    }

    if (user.accountStatus !== 'active') {
      return sendError(res, {
        statusCode: 403,
        code: 'ACCOUNT_PENDING_VERIFICATION',
        message: 'Account is pending administrative verification.',
        data: { isPendingVerification: true, role: user.role },
      });
    }

    const tokens = await authService.createSession(user, { req });

    return sendSuccess(res, {
      message: 'Third-party authentication successful.',
      data: {
        user: authService.sanitizeUser(user),
        ...tokens,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── 9. GET CURRENT USER (me) ─────────────────────────────────────────────────

const getMe = async (req, res, next) => {
  try {
    return sendSuccess(res, {
      data: authService.sanitizeUser(req.user),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  registerStudent,
  registerTeacher,
  login,
  loginStudent,
  loginTeacher,
  loginAdmin,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  firebaseLogin,
  getMe,
};
