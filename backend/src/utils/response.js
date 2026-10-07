'use strict';

/**
 * Standard API response helpers.
 * Ensures consistent response shapes across the entire API.
 */

const sendSuccess = (res, { statusCode = 200, message = 'Success', data = null, meta = null } = {}) => {
  const response = { success: true, status: 'success', message };
  if (data !== null) response.data = data;
  if (meta !== null) response.meta = meta;
  return res.status(statusCode).json(response);
};

const sendCreated = (res, { message = 'Created', data = null, meta = null } = {}) => {
  return sendSuccess(res, { statusCode: 201, message, data, meta });
};

const sendError = (res, { statusCode = 500, message = 'Internal Server Error', code = null, errors = null, data = null, details = null } = {}) => {
  const response = { success: false, status: 'error', message };
  if (code !== null) response.code = code;
  if (data !== null) response.data = data;
  if (errors !== null) response.errors = errors;
  if (details !== null) response.details = details;
  return res.status(statusCode).json(response);
};

const sendPaginated = (res, { data, page, limit, total, message = 'Success' }) => {
  return res.status(200).json({
    success: true,
    message,
    data,
    meta: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  });
};

module.exports = { sendSuccess, sendCreated, sendError, sendPaginated };
