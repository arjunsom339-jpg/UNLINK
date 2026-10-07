'use strict';

const express = require('express');
const { authenticate, requireVerified } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { sendSuccess, sendError, sendCreated } = require('../utils/response');
const alumniService = require('../services/alumniService');

const router = express.Router();

// Require authentication for all alumni & mentorship endpoints
router.use(authenticate);

// ── Alumni Profile & Verification ──────────────────────────────────────────

/**
 * GET /api/alumni/me — Get authenticated user's alumni profile
 */
router.get('/me', async (req, res, next) => {
  try {
    const profile = await alumniService.getMyAlumniProfile(req.user.id);
    return sendSuccess(res, { data: profile });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/alumni/profile — Create or initialize alumni profile
 */
router.post('/profile', async (req, res, next) => {
  try {
    const profile = await alumniService.createOrUpdateProfile(req.user, req.body);
    return sendCreated(res, {
      data: profile,
      message: 'Alumni profile created successfully and queued for administrative verification.',
    });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/alumni/profile — Update alumni profile
 */
router.patch('/profile', async (req, res, next) => {
  try {
    const profile = await alumniService.createOrUpdateProfile(req.user, req.body);
    return sendSuccess(res, {
      data: profile,
      message: 'Alumni profile updated successfully.',
    });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * POST /api/alumni/verification — Submit profile for verification
 */
router.post('/verification', async (req, res, next) => {
  try {
    const profile = await alumniService.getMyAlumniProfile(req.user.id);
    if (!profile) {
      return sendError(res, { statusCode: 404, message: 'Alumni profile not found. Please create profile first.' });
    }
    await profile.update({ verificationStatus: 'PENDING' });
    return sendSuccess(res, {
      data: { status: 'PENDING' },
      message: 'Verification request submitted to college administration.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/alumni/verification/status — Get verification status
 */
router.get('/verification/status', async (req, res, next) => {
  try {
    const profile = await alumniService.getMyAlumniProfile(req.user.id);
    if (!profile) {
      return sendSuccess(res, { data: { status: 'NONE' } });
    }
    return sendSuccess(res, {
      data: {
        status: profile.verificationStatus,
        verifiedAt: profile.verifiedAt,
        rejectionReason: profile.rejectionReason,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── Bookmarks ──────────────────────────────────────────────────────────────

/**
 * GET /api/alumni/saved — Get saved alumni profiles
 */
router.get('/saved', async (req, res, next) => {
  try {
    const result = await alumniService.getSavedAlumni(req.user, req.query);
    return sendSuccess(res, {
      data: result.savedAlumni,
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
 * POST /api/alumni/:id/bookmark — Bookmark alumni profile
 */
router.post('/:id/bookmark', async (req, res, next) => {
  try {
    const bookmark = await alumniService.bookmarkAlumni(req.user, req.params.id);
    return sendCreated(res, { data: bookmark, message: 'Alumni profile bookmarked.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * DELETE /api/alumni/:id/bookmark — Remove bookmark
 */
router.delete('/:id/bookmark', async (req, res, next) => {
  try {
    await alumniService.unbookmarkAlumni(req.user, req.params.id);
    return sendSuccess(res, { message: 'Alumni bookmark removed.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

// ── Directory & Discovery ──────────────────────────────────────────────────

/**
 * GET /api/alumni — Discover verified alumni
 */
router.get('/', async (req, res, next) => {
  try {
    const result = await alumniService.discoverAlumni(req.user, req.query);
    return sendSuccess(res, {
      data: result.alumni,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      },
    });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * GET /api/alumni/mentorships — Get mentorships for authenticated alumnus
 */
router.get('/mentorships', async (req, res, next) => {
  try {
    const result = await alumniService.getUserMentorships(req.user, {
      role: 'alumni',
      ...req.query,
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
 * GET /api/alumni/:id — View specific alumni profile
 */
router.get('/:id', async (req, res, next) => {
  try {
    const profile = await alumniService.getAlumniProfileById(req.params.id, req.user);
    return sendSuccess(res, { data: profile });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

module.exports = router;
