'use strict';

const logger = require('../utils/logger');
const { sendError } = require('../utils/response');

/**
 * GLOBAL ERROR HANDLER
 * Must be registered LAST in app.js (after all routes).
 * Catches all unhandled errors from synchronous and async route handlers.
 */
const errorHandler = (err, req, res, next) => {
  // Log full error details server-side
  logger.error({
    message: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    userId: req.user?.id || 'unauthenticated',
    ip: req.ip,
  });

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    return sendError(res, {
      statusCode: 422,
      message: 'Database validation failed.',
      errors: err.errors.map((e) => ({ field: e.path, message: e.message })),
    });
  }

  // Sequelize unique constraint violation
  if (err.name === 'SequelizeUniqueConstraintError') {
    return sendError(res, {
      statusCode: 409,
      message: 'A record with this value already exists.',
      errors: err.errors.map((e) => ({ field: e.path, message: e.message })),
    });
  }

  // JWT errors (should be caught in authenticate middleware, but just in case)
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return sendError(res, { statusCode: 401, message: 'Invalid or expired token.' });
  }

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return sendError(res, {
      statusCode: 413,
      message: `File size exceeds the ${process.env.MAX_FILE_SIZE_MB || 10}MB limit.`,
    });
  }

  // Default: hide internal details from clients in production
  const statusCode = err.statusCode || err.status || 500;
  const message =
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'An unexpected error occurred. Please try again later.'
      : err.message || 'Internal Server Error';

  return sendError(res, { statusCode, message });
};

/**
 * 404 handler — for routes that don't exist
 */
const notFound = (req, res) => {
  return sendError(res, {
    statusCode: 404,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
};

module.exports = { errorHandler, notFound };
