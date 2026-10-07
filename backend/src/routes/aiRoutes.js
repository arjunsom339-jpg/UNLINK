'use strict';

const express = require('express');
const { generateCampusAiResponse, isGeminiConfigured } = require('../services/geminiService');
const { sendSuccess, sendError } = require('../utils/response');
const jwt = require('jsonwebtoken');
const { User, StudentProfile } = require('../models');

const router = express.Router();

/**
 * Optional user context extractor (does not block unauthenticated users)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findByPk(decoded.id, {
        attributes: ['id', 'email', 'role'],
        include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName', 'department', 'semester'] }],
      });
      if (user) {
        req.user = user;
      }
    }
  } catch (_) {
    // Ignore invalid tokens for optional auth
  }
  next();
};

/**
 * GET /api/ai/status
 * Returns current status and availability of Gemini AI
 */
router.get('/status', (req, res) => {
  return sendSuccess(res, {
    data: {
      isConfigured: isGeminiConfigured(),
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      service: 'UniLink Campus AI Copilot',
    },
    message: 'AI service status retrieved successfully',
  });
});

/**
 * POST /api/ai/chat
 * Handles conversational queries with Gemini
 */
router.post('/chat', optionalAuth, async (req, res, next) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return sendError(res, { statusCode: 400, message: 'Message content is required' });
    }

    // Build context if user is signed in
    const context = {};
    if (req.user) {
      context.role = req.user.role;
      if (req.user.studentProfile) {
        context.name = req.user.studentProfile.fullName;
        context.department = req.user.studentProfile.department;
      }
    }

    const aiResult = await generateCampusAiResponse(message, history, context);

    return sendSuccess(res, {
      data: aiResult,
      message: 'AI response generated successfully',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
