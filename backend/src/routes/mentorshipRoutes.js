'use strict';

const express = require('express');
const { authenticate } = require('../middleware/authenticate');
const { sendSuccess, sendError, sendCreated } = require('../utils/response');
const alumniService = require('../services/alumniService');

const router = express.Router();

// Require authentication for all mentorship actions
router.use(authenticate);

// ── Mentorship Requests Lifecycle ──────────────────────────────────────────

/**
 * POST /api/mentorship/requests — Create a new mentorship request
 */
router.post('/requests', async (req, res, next) => {
  try {
    const request = await alumniService.createMentorshipRequest(req.user, req.body);
    return sendCreated(res, {
      data: request,
      message: 'Mentorship request sent successfully.',
    });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * GET /api/mentorship/requests — List mentorship requests for student or alumnus
 */
router.get('/requests', async (req, res, next) => {
  try {
    const role = req.query.role || (req.user.role === 'alumni' ? 'alumni' : 'student');
    const result = await alumniService.getUserMentorships(req.user, {
      role,
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit,
    });
    return sendSuccess(res, {
      data: result.requests,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/mentorship/requests/:id — Get details of a single mentorship request
 */
router.get('/requests/:id', async (req, res, next) => {
  try {
    const request = await alumniService.getMentorshipRequestById(req.params.id, req.user);
    return sendSuccess(res, { data: request });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/mentorship/requests/:id/accept — Accept request (Mentor)
 */
router.patch('/requests/:id/accept', async (req, res, next) => {
  try {
    const request = await alumniService.acceptMentorshipRequest(req.user, req.params.id);
    return sendSuccess(res, { data: request, message: 'Mentorship request accepted.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/mentorship/requests/:id/decline — Decline request (Mentor)
 */
router.patch('/requests/:id/decline', async (req, res, next) => {
  try {
    const request = await alumniService.declineMentorshipRequest(req.user, req.params.id, req.body?.reason);
    return sendSuccess(res, { data: request, message: 'Mentorship request declined.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/mentorship/requests/:id/cancel — Cancel request (Student)
 */
router.patch('/requests/:id/cancel', async (req, res, next) => {
  try {
    const request = await alumniService.cancelMentorshipRequest(req.user, req.params.id, req.body?.reason);
    return sendSuccess(res, { data: request, message: 'Mentorship request cancelled.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/mentorship/requests/:id/start — Start mentorship (Transition to ACTIVE)
 */
router.patch('/requests/:id/start', async (req, res, next) => {
  try {
    const request = await alumniService.startMentorship(req.user, req.params.id);
    return sendSuccess(res, { data: request, message: 'Mentorship is now active.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/mentorship/requests/:id/complete — Complete mentorship
 */
router.patch('/requests/:id/complete', async (req, res, next) => {
  try {
    const request = await alumniService.completeMentorship(req.user, req.params.id);
    return sendSuccess(res, { data: request, message: 'Mentorship successfully marked completed.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

// ── Mentorship Sessions ──────────────────────────────────────────────────────

/** Helper to schedule session */
const handleScheduleSession = async (req, res, next) => {
  try {
    const session = await alumniService.scheduleSession(req.user, req.params.id, req.body);
    return sendCreated(res, { data: session, message: 'Mentorship session scheduled successfully.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
};

/** Helper to get sessions */
const handleGetSessions = async (req, res, next) => {
  try {
    const sessions = await alumniService.getSessions(req.user, req.params.id);
    return sendSuccess(res, { data: sessions });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
};

router.post('/requests/:id/sessions', handleScheduleSession);
router.post('/:id/sessions', handleScheduleSession);
router.get('/requests/:id/sessions', handleGetSessions);
router.get('/:id/sessions', handleGetSessions);

/**
 * PATCH /api/mentorship/sessions/:sessionId — Update session
 */
router.patch('/sessions/:sessionId', async (req, res, next) => {
  try {
    const session = await alumniService.updateSession(req.user, req.params.sessionId, req.body);
    return sendSuccess(res, { data: session, message: 'Session updated successfully.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

// ── Private Messaging ────────────────────────────────────────────────────────

/** Helper to send message */
const handleSendMessage = async (req, res, next) => {
  try {
    const message = await alumniService.sendMessage(req.user, req.params.id, req.body.message);
    return sendCreated(res, { data: message, message: 'Message sent.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
};

/** Helper to get messages */
const handleGetMessages = async (req, res, next) => {
  try {
    const messages = await alumniService.getMessages(req.user, req.params.id);
    return sendSuccess(res, { data: messages });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
};

router.post('/requests/:id/messages', handleSendMessage);
router.post('/:id/messages', handleSendMessage);
router.get('/requests/:id/messages', handleGetMessages);
router.get('/:id/messages', handleGetMessages);

// ── Feedback & Evaluation ────────────────────────────────────────────────────

/** Helper to submit feedback */
const handleSubmitFeedback = async (req, res, next) => {
  try {
    const feedback = await alumniService.submitFeedback(req.user, req.params.id, req.body);
    return sendCreated(res, {
      data: feedback,
      message: 'Mentorship feedback submitted successfully and reputation points awarded.',
    });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
};

router.post('/requests/:id/feedback', handleSubmitFeedback);
router.post('/:id/feedback', handleSubmitFeedback);

module.exports = router;
