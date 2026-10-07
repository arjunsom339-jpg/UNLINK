'use strict';

const { verifyAccessToken } = require('../utils/jwt');
const { sendError } = require('../utils/response');
const { User, StudentProfile, TeacherProfile, AlumniProfile, College } = require('../models');

/**
 * AUTHENTICATE MIDDLEWARE
 * Verifies JWT access token in the Authorization header.
 * Confirms user existence, fresh status, and attaches req.user.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, {
        statusCode: 401,
        message: 'Authentication required. Missing Bearer token.',
      });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return sendError(res, {
          statusCode: 401,
          code: 'TOKEN_EXPIRED',
          message: 'Access token expired. Please refresh your session.',
        });
      }
      return sendError(res, {
        statusCode: 401,
        code: 'TOKEN_INVALID',
        message: 'Invalid access token signature.',
      });
    }

    // Fetch fresh user record from DB
    const user = await User.findByPk(decoded.id, {
      include: [
        { model: StudentProfile, as: 'studentProfile' },
        { model: TeacherProfile, as: 'teacherProfile' },
        { model: AlumniProfile,  as: 'alumniProfile' },
        { model: College, as: 'college', attributes: ['id', 'name', 'code', 'domain'] },
      ],
    });

    if (!user) {
      return sendError(res, {
        statusCode: 401,
        code: 'USER_NOT_FOUND',
        message: 'User account no longer exists.',
      });
    }

    // Enforce immediate account status bans & suspensions
    if (user.accountStatus === 'banned') {
      return sendError(res, {
        statusCode: 403,
        code: 'ACCOUNT_BANNED',
        message: 'Your account has been permanently banned from the UniLink campus platform.',
      });
    }

    if (user.accountStatus === 'suspended') {
      return sendError(res, {
        statusCode: 403,
        code: 'ACCOUNT_SUSPENDED',
        message: 'Your account is suspended. Please contact the college administration office.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return sendError(res, {
      statusCode: 500,
      message: 'Internal authentication error: ' + error.message,
    });
  }
};

/**
 * REQUIRE VERIFIED MIDDLEWARE
 * Enforces that an account has been verified by the institution or admin
 * before accessing academic, community, or messaging features.
 */
const requireVerified = (req, res, next) => {
  if (!req.user) {
    return sendError(res, { statusCode: 401, message: 'Authentication required.' });
  }

  // Admins bypass institutional verification
  if (req.user.role === 'admin') {
    return next();
  }

  if (req.user.accountStatus === 'pending' || req.user.accountStatus === 'pending_verification' || !req.user.isAdminVerified) {
    return sendError(res, {
      statusCode: 403,
      code: 'ACCOUNT_PENDING_VERIFICATION',
      message: 'Account is pending administrative verification. Please wait for college approval.',
      data: {
        accountStatus: req.user.accountStatus,
        isAdminVerified: req.user.isAdminVerified,
        role: req.user.role,
      },
    });
  }

  next();
};

module.exports = { authenticate, requireVerified };
