'use strict';

const express = require('express');
const { Op } = require('sequelize');
const { authenticate } = require('../middleware/authenticate');
const { sendSuccess, sendCreated, sendError, sendPaginated } = require('../utils/response');
const helpService = require('../services/helpService');
const { HelpRequest, HelpResponder, User, StudentProfile } = require('../models');

const router = express.Router();

// All help routes require authentication
router.use(authenticate);

/**
 * POST /api/help/requests — Create a new emergency / help request
 */
router.post('/requests', async (req, res, next) => {
  try {
    const request = await helpService.createHelpRequest(req.user, req.body);
    return sendCreated(res, {
      data: request,
      message: 'Help request broadcasted to nearby verified campus peers.',
    });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * GET /api/help/requests — List current user's requests or active requests
 */
router.get('/requests', async (req, res, next) => {
  try {
    const { status, category, urgency, scope = 'my' } = req.query;
    const where = {};

    if (scope === 'my') {
      where.requesterId = req.user.id;
    }

    if (status && status !== 'all') where.status = status;
    if (category && category !== 'all') where.category = category;
    if (urgency && urgency !== 'all') where.urgencyLevel = urgency;

    const requests = await HelpRequest.findAll({
      where,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'email'],
          include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName', 'department', 'semester'] }],
        },
        {
          model: User,
          as: 'helper',
          attributes: ['id', 'email'],
          include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName', 'department', 'semester'] }],
        },
        {
          model: HelpResponder,
          as: 'responders',
          include: [
            {
              model: User,
              as: 'responder',
              attributes: ['id', 'email'],
              include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName', 'department', 'semester'] }],
            },
          ],
        },
      ],
    });

    return sendSuccess(res, { data: requests });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/help/nearby — Retrieve nearby eligible peer requests within radius
 */
router.get('/nearby', async (req, res, next) => {
  try {
    const { lat, lon } = req.query;
    const nearby = await helpService.getNearbyHelpRequests(req.user, lat, lon);
    return sendSuccess(res, { data: nearby });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * GET /api/help/requests/:id — Get details of a single request
 */
router.get('/requests/:id', async (req, res, next) => {
  try {
    const request = await HelpRequest.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'email'],
          include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName', 'department', 'semester'] }],
        },
        {
          model: User,
          as: 'helper',
          attributes: ['id', 'email'],
          include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName', 'department', 'semester'] }],
        },
        {
          model: HelpResponder,
          as: 'responders',
          include: [
            {
              model: User,
              as: 'responder',
              attributes: ['id', 'email'],
              include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName', 'department', 'semester'] }],
            },
          ],
        },
      ],
    });

    if (!request) {
      return sendError(res, { statusCode: 404, message: 'Help request not found.' });
    }

    // Strip exact coordinates if user is not authorized
    const isParticipant = request.requesterId === req.user.id || request.helperId === req.user.id || req.user.role === 'admin';
    const data = request.toJSON();
    if (!isParticipant) {
      delete data.latitude;
      delete data.longitude;
      delete data.helperLatitude;
      delete data.helperLongitude;
    }

    return sendSuccess(res, { data });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/help/requests/:id/respond — Volunteer to help ("I Can Help")
 */
router.post('/requests/:id/respond', async (req, res, next) => {
  try {
    const { message, latitude, longitude } = req.body;
    const responder = await helpService.respondToHelpRequest(req.user, req.params.id, message, latitude, longitude);
    return sendCreated(res, {
      data: responder,
      message: 'You have offered to assist. The requester has been notified.',
    });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * PATCH /api/help/requests/:id/select-helper — Requester assigns primary helper (transitions to active)
 */
router.patch('/requests/:id/select-helper', async (req, res, next) => {
  try {
    const { responderUserId } = req.body;
    if (!responderUserId) {
      return sendError(res, { statusCode: 400, message: 'Responder user ID is required.' });
    }
    const updated = await helpService.selectPrimaryHelper(req.user, req.params.id, responderUserId);
    return sendSuccess(res, {
      data: updated,
      message: 'Helper selected. Live coordination channel is now active.',
    });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * PATCH /api/help/requests/:id/location — Update / toggle live location sharing
 */
router.patch('/requests/:id/location', async (req, res, next) => {
  try {
    const updated = await helpService.updateLocationSharing(req.user, req.params.id, req.body);
    return sendSuccess(res, {
      data: updated,
      message: 'Location sharing preferences updated.',
    });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * GET /api/help/requests/:id/location — Securely view authorized live coordinates
 */
router.get('/requests/:id/location', async (req, res, next) => {
  try {
    const locationData = await helpService.getAuthorizedLocation(req.user, req.params.id);
    return sendSuccess(res, { data: locationData });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/help/requests/:id/messages — Send emergency coordination message
 */
router.post('/requests/:id/messages', async (req, res, next) => {
  try {
    const { message } = req.body;
    const msg = await helpService.sendEmergencyMessage(req.user, req.params.id, message);
    return sendCreated(res, { data: msg });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * GET /api/help/requests/:id/messages — Get emergency coordination conversation
 */
router.get('/requests/:id/messages', async (req, res, next) => {
  try {
    const messages = await helpService.getEmergencyMessages(req.user, req.params.id);
    return sendSuccess(res, { data: messages });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * PATCH /api/help/requests/:id/resolve — Mark request resolved (+15 reputation points)
 */
router.patch('/requests/:id/resolve', async (req, res, next) => {
  try {
    const resolved = await helpService.resolveHelpRequest(req.user, req.params.id);
    return sendSuccess(res, {
      data: resolved,
      message: 'Help request marked as resolved. Reputation awarded to helper!',
    });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * DELETE /api/help/requests/:id/cancel — Cancel request
 */
router.delete('/requests/:id/cancel', async (req, res, next) => {
  try {
    const { reason } = req.body || {};
    const cancelled = await helpService.cancelHelpRequest(req.user, req.params.id, reason);
    return sendSuccess(res, {
      data: cancelled,
      message: 'Help request cancelled successfully.',
    });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/help/requests/:id/feedback — Submit rating / feedback
 */
router.post('/requests/:id/feedback', async (req, res, next) => {
  try {
    const feedback = await helpService.submitFeedback(req.user, req.params.id, req.body);
    return sendCreated(res, {
      data: feedback,
      message: 'Thank you for your feedback! It helps keep our campus safe and supportive.',
    });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * GET /api/help/history — Retrieve student's help history
 */
router.get('/history', async (req, res, next) => {
  try {
    const history = await helpService.getHelpHistory(req.user);
    return sendSuccess(res, { data: history });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/help/availability — Update helper availability & radius
 */
router.patch('/availability', async (req, res, next) => {
  try {
    const { availableToHelp, helpRadiusKm } = req.body;
    const profile = await StudentProfile.findOne({ where: { userId: req.user.id } });
    if (!profile) {
      return sendError(res, { statusCode: 404, message: 'Student profile not found.' });
    }

    const updates = {};
    if (availableToHelp !== undefined) updates.availableToHelp = !!availableToHelp;
    if (helpRadiusKm != null) updates.helpRadiusKm = parseFloat(helpRadiusKm);

    await profile.update(updates);
    return sendSuccess(res, {
      data: {
        availableToHelp: profile.availableToHelp,
        helpRadiusKm: profile.helpRadiusKm,
      },
      message: 'Emergency helper settings updated.',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
