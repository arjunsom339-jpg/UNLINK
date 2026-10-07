'use strict';

const { validationResult } = require('express-validator');
const { sendError } = require('../utils/response');

/**
 * VALIDATION MIDDLEWARE
 * Runs after express-validator chains and returns structured 400 error.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed. Please correct the input errors.',
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

module.exports = { validate };
