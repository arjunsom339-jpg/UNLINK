'use strict';

const jwt = require('jsonwebtoken');

/**
 * Generate a short-lived access token
 * @param {object} payload - { id, role }
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    issuer: 'unilink-api',
    audience: 'unilink-client',
  });
};

const crypto = require('crypto');

/**
 * Generate a long-lived refresh token
 * @param {object} payload - { id, role }
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: 'unilink-api',
    audience: 'unilink-client',
    jwtid: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'),
  });
};

/**
 * Verify an access token
 * @param {string} token
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
    issuer: 'unilink-api',
    audience: 'unilink-client',
  });
};

/**
 * Verify a refresh token
 * @param {string} token
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
    issuer: 'unilink-api',
    audience: 'unilink-client',
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
