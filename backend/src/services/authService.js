'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { User, StudentProfile, TeacherProfile, RefreshToken, AuditLog } = require('../models');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const logger = require('../utils/logger');

const SALT_ROUNDS = 12;

/** Hash a raw token string with SHA-256 for secure DB storage */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/** Log an event to the AuditLog table */
const logAuditEvent = async ({ actorId = null, targetUserId = null, action, category = 'AUTH', ipAddress = null, details = {} }) => {
  try {
    return await AuditLog.create({
      actorId,
      targetUserId,
      action,
      category,
      ipAddress,
      details,
    });
  } catch (err) {
    logger.error('Failed to write audit log:', err.message);
  }
};

/**
 * Creates access and refresh tokens, recording the hashed refresh token session in the DB.
 */
const createSession = async (user, { req, deviceInfo = null } = {}) => {
  const ipAddress = req?.ip || req?.connection?.remoteAddress || null;
  const agent = deviceInfo || req?.headers?.['user-agent'] || 'Unknown device';

  const payload = {
    id: user.id,
    role: user.role,
    ...(user.adminRole && { adminRole: user.adminRole }),
    collegeId: user.collegeId,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await RefreshToken.create({
    userId: user.id,
    tokenHash,
    deviceInfo: agent,
    ipAddress,
    isValid: true,
    expiresAt,
  });

  return { accessToken, refreshToken };
};

/**
 * Rotates an active refresh token:
 * 1. Verifies JWT signature
 * 2. Matches hash in DB
 * 3. Invalidates old token
 * 4. Issues and saves new token pair
 */
const rotateRefreshToken = async (rawRefreshToken, req) => {
  let decoded;
  try {
    decoded = verifyRefreshToken(rawRefreshToken);
  } catch (err) {
    throw new Error('Invalid or expired refresh token signature.');
  }

  const tokenHash = hashToken(rawRefreshToken);
  const session = await RefreshToken.findOne({
    where: { tokenHash, userId: decoded.id },
  });

  if (!session || !session.isValid) {
    // Possible token reuse attack — invalidate all sessions for user as safety measure
    await RefreshToken.update({ isValid: false }, { where: { userId: decoded.id } });
    await logAuditEvent({
      targetUserId: decoded.id,
      action: 'SUSPICIOUS_REFRESH_TOKEN_REUSE',
      category: 'SECURITY',
      ipAddress: req?.ip,
    });
    throw new Error('Refresh token revoked or invalid.');
  }

  if (new Date() > session.expiresAt) {
    await session.update({ isValid: false });
    throw new Error('Refresh token expired.');
  }

  const user = await User.findByPk(decoded.id);
  if (!user || user.accountStatus !== 'active') {
    await session.update({ isValid: false });
    throw new Error('User account inactive, suspended, or not found.');
  }

  // Invalidate current token session
  await session.update({ isValid: false });

  // Issue new token pair
  return createSession(user, { req });
};

/**
 * Revokes a session on user logout.
 */
const revokeSession = async (rawRefreshToken, userId = null) => {
  if (!rawRefreshToken) return;
  const tokenHash = hashToken(rawRefreshToken);
  await RefreshToken.update(
    { isValid: false },
    { where: { tokenHash, ...(userId && { userId }) } }
  );
};

/**
 * Revokes all sessions for a specific user (on password change, account suspension, or ban).
 */
const revokeAllUserSessions = async (userId) => {
  await RefreshToken.update(
    { isValid: false },
    { where: { userId } }
  );
};

/**
 * Generates a crypto-secure password reset token and saves its hash to the user.
 */
const createPasswordResetToken = async (user) => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await user.update({
    passwordResetToken: hashedToken,
    passwordResetExpires: expiresAt,
  });

  return rawToken;
};

/**
 * Validates reset token and updates user password.
 */
const resetPasswordWithToken = async (rawToken, newPassword) => {
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  const user = await User.findOne({
    where: {
      passwordResetToken: hashedToken,
    },
  });

  if (!user || !user.passwordResetExpires || new Date() > user.passwordResetExpires) {
    throw new Error('Password reset token is invalid or has expired.');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await user.update({
    passwordHash,
    passwordResetToken: null,
    passwordResetExpires: null,
    loginAttempts: 0,
    lockedUntil: null,
  });

  // Revoke previous sessions on password change
  await revokeAllUserSessions(user.id);

  await logAuditEvent({
    actorId: user.id,
    targetUserId: user.id,
    action: 'PASSWORD_RESET_COMPLETE',
    category: 'AUTH',
  });

  return user;
};

/**
 * Generates an email verification token.
 */
const createEmailVerificationToken = async (user) => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await user.update({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: expiresAt,
  });

  return rawToken;
};

/**
 * Verifies email with token.
 */
const verifyEmailWithToken = async (rawToken) => {
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  const user = await User.findOne({
    where: {
      emailVerificationToken: hashedToken,
    },
  });

  if (!user || !user.emailVerificationExpires || new Date() > user.emailVerificationExpires) {
    throw new Error('Email verification link is invalid or has expired.');
  }

  await user.update({
    isEmailVerified: true,
    emailVerificationToken: null,
    emailVerificationExpires: null,
  });

  await logAuditEvent({
    actorId: user.id,
    targetUserId: user.id,
    action: 'EMAIL_VERIFIED',
    category: 'AUTH',
  });

  return user;
};

/**
 * Helper to sanitize user object for client responses (strips hashes and secrets).
 */
const sanitizeUser = (user, profile = null) => {
  const plain = user.get ? user.get({ plain: true }) : { ...user };
  delete plain.passwordHash;
  delete plain.refreshTokenHash;
  delete plain.passwordResetToken;
  delete plain.passwordResetExpires;
  delete plain.emailVerificationToken;
  delete plain.emailVerificationExpires;

  return {
    ...plain,
    profile: profile || plain.studentProfile || plain.teacherProfile || null,
  };
};

module.exports = {
  SALT_ROUNDS,
  hashToken,
  logAuditEvent,
  createSession,
  rotateRefreshToken,
  revokeSession,
  revokeAllUserSessions,
  createPasswordResetToken,
  resetPasswordWithToken,
  createEmailVerificationToken,
  verifyEmailWithToken,
  sanitizeUser,
};
