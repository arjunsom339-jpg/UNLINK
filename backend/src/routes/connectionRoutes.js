'use strict';

const express = require('express');
const { authenticate } = require('../middleware/authenticate');
const { studentOnly } = require('../middleware/authorize');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');
const connectionService = require('../services/connectionService');

const router = express.Router();

// Require student authentication
router.use(authenticate, studentOnly);

/**
 * POST /api/connections/request — Send a peer connection request
 */
router.post('/request', async (req, res, next) => {
  try {
    const receiverId = req.body.receiverId || req.body.targetUserId;
    const { message } = req.body;

    if (!receiverId) {
      return sendError(res, { statusCode: 400, message: 'Receiver ID is required.' });
    }

    const connection = await connectionService.sendRequest(req.user.id, receiverId, message);
    return sendCreated(res, {
      data: connection,
      message: 'Connection request sent successfully.',
    });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * PATCH /api/connections/:id/accept — Accept incoming connection request
 */
router.patch('/:id/accept', async (req, res, next) => {
  try {
    const connection = await connectionService.acceptRequest(req.params.id, req.user.id);
    return sendSuccess(res, {
      data: connection,
      message: 'Connection accepted. You can now collaborate and message each other!',
    });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * PATCH /api/connections/:id/reject — Decline incoming connection request
 */
router.patch('/:id/reject', async (req, res, next) => {
  try {
    const connection = await connectionService.rejectRequest(req.params.id, req.user.id);
    return sendSuccess(res, {
      data: connection,
      message: 'Connection request declined.',
    });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * DELETE /api/connections/:id/cancel — Cancel sent pending connection request
 */
router.delete('/:id/cancel', async (req, res, next) => {
  try {
    const connection = await connectionService.cancelRequest(req.params.id, req.user.id);
    return sendSuccess(res, {
      data: connection,
      message: 'Connection request cancelled successfully.',
    });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * DELETE /api/connections/:id — Cancel pending request or remove active connection
 */
router.delete('/:id', async (req, res, next) => {
  try {
    // Attempt remove connection (or cancel if pending)
    const connection = await connectionService.removeConnection(req.params.id, req.user.id);
    return sendSuccess(res, {
      data: connection,
      message: 'Connection removed or request cancelled successfully.',
    });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * GET /api/connections — Get active accepted connections for current student
 */
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const data = await connectionService.getAcceptedConnections(req.user.id, page, limit);
    return sendSuccess(res, { data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/connections/requests — Get pending incoming and outgoing connection requests
 */
router.get('/requests', async (req, res, next) => {
  try {
    const data = await connectionService.getPendingRequests(req.user.id);
    return sendSuccess(res, { data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
