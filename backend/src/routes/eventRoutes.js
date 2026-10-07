'use strict';

const express = require('express');
const { authenticate } = require('../middleware/authenticate');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');
const eventService = require('../services/eventService');
const { Event, EventRegistration, Department, User, TeacherProfile } = require('../models');

const router = express.Router();

// All event routes require authentication
router.use(authenticate);

/**
 * GET /api/events — Discover published campus events
 */
router.get('/', async (req, res, next) => {
  try {
    const result = await eventService.getEvents(req.user, req.query);
    return sendSuccess(res, {
      data: result.events,
      meta: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      },
    });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * GET /api/events/my-registrations — Student's registered events
 */
router.get('/my-registrations', async (req, res, next) => {
  try {
    const result = await eventService.getStudentRegistrations(req.user, req.query);
    return sendSuccess(res, {
      data: result.registrations,
      meta: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      },
    });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * GET /api/events/bookmarks — Student's saved events
 */
router.get('/bookmarks', async (req, res, next) => {
  try {
    const result = await eventService.getBookmarkedEvents(req.user, req.query);
    return sendSuccess(res, {
      data: result.bookmarks,
      meta: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      },
    });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * GET /api/events/teacher/my-events — Teacher's created events
 */
router.get('/teacher/my-events', async (req, res, next) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return sendError(res, { statusCode: 403, message: 'Access denied.' });
    }

    const { status, page = 1, limit = 20 } = req.query;
    const where = { createdBy: req.user.id };
    if (status && status !== 'all') where.status = status;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * pageSize;

    const { rows, count } = await Event.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset,
      include: [
        { model: Department, as: 'targetDepartment' },
      ],
    });

    return sendSuccess(res, {
      data: rows,
      meta: { total: count, page: pageNum, totalPages: Math.ceil(count / pageSize) },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/events/:id — Single event details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const event = await eventService.getEventById(req.user, req.params.id);
    return sendSuccess(res, { data: event });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/events — Create event (Teacher or Admin)
 */
router.post('/', async (req, res, next) => {
  try {
    const event = await eventService.createEvent(req.user, req.body);
    return sendCreated(res, {
      data: event,
      message: event.status === 'PUBLISHED' ? 'Event created and published!' : 'Event draft saved.',
    });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * PATCH /api/events/:id — Update event
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const updated = await eventService.updateEvent(req.user, req.params.id, req.body);
    return sendSuccess(res, { data: updated, message: 'Event updated successfully.' });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * DELETE /api/events/:id — Delete event
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await eventService.deleteEvent(req.user, req.params.id);
    return sendSuccess(res, { message: 'Event deleted successfully.' });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/events/:id/publish — Publish event
 */
router.post('/:id/publish', async (req, res, next) => {
  try {
    const event = await eventService.publishEvent(req.user, req.params.id);
    return sendSuccess(res, { data: event, message: 'Event is now published and visible to students.' });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/events/:id/cancel — Cancel event
 */
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const { reason } = req.body || {};
    const event = await eventService.cancelEvent(req.user, req.params.id, reason);
    return sendSuccess(res, { data: event, message: 'Event cancelled. Registered students have been notified.' });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/events/:id/register — Register student for event
 */
router.post('/:id/register', async (req, res, next) => {
  try {
    const { notes } = req.body || {};
    const result = await eventService.registerForEvent(req.user, req.params.id, notes);
    return sendCreated(res, {
      data: result.registration,
      message: result.isWaitlisted
        ? 'Capacity reached. You have been added to the waitlist.'
        : 'Successfully registered for this event!',
    });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * DELETE /api/events/:id/register — Cancel student registration
 */
router.delete('/:id/register', async (req, res, next) => {
  try {
    const registration = await eventService.cancelRegistration(req.user, req.params.id);
    return sendSuccess(res, { data: registration, message: 'Registration cancelled.' });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/events/:id/bookmark — Bookmark event
 */
router.post('/:id/bookmark', async (req, res, next) => {
  try {
    const bookmark = await eventService.bookmarkEvent(req.user, req.params.id);
    return sendCreated(res, { data: bookmark, message: 'Event saved to bookmarks.' });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * DELETE /api/events/:id/bookmark — Remove bookmark
 */
router.delete('/:id/bookmark', async (req, res, next) => {
  try {
    await eventService.unbookmarkEvent(req.user, req.params.id);
    return sendSuccess(res, { message: 'Bookmark removed.' });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * GET /api/events/:id/participants — View participants (Organizer or Admin)
 */
router.get('/:id/participants', async (req, res, next) => {
  try {
    const result = await eventService.getEventParticipants(req.user, req.params.id, req.query);
    return sendSuccess(res, {
      data: result.participants,
      meta: { total: result.total, page: result.page, totalPages: result.totalPages },
    });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * PATCH /api/events/:id/participants/:studentId/attendance — Mark attendance
 */
router.patch('/:id/participants/:studentId/attendance', async (req, res, next) => {
  try {
    const registration = await eventService.markAttendance(
      req.user,
      req.params.id,
      req.params.studentId,
      req.body
    );
    return sendSuccess(res, { data: registration, message: 'Attendance status updated.' });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * GET /api/events/:id/stats — Event statistics (Organizer or Admin)
 */
router.get('/:id/stats', async (req, res, next) => {
  try {
    const stats = await eventService.getOrganizerEventStats(req.user, req.params.id);
    return sendSuccess(res, { data: stats });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

module.exports = router;
