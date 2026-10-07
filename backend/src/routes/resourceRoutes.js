'use strict';

const express = require('express');
const fs = require('fs');
const { authenticate } = require('../middleware/authenticate');
const { singleUpload } = require('../middleware/upload');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');
const resourceService = require('../services/resourceService');
const logger = require('../utils/logger');

const router = express.Router();

// All resource routes require authentication
router.use(authenticate);

/**
 * GET /api/resources — Discover published academic resources
 */
router.get('/', async (req, res, next) => {
  try {
    const result = await resourceService.getResources(req.user, req.query);
    return sendSuccess(res, {
      data: result.resources,
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
 * GET /api/resources/saved — Student's saved / bookmarked resources
 * Note: Must be placed before /:id to prevent route collision
 */
router.get('/saved', async (req, res, next) => {
  try {
    const result = await resourceService.getSavedResources(req.user, req.query);
    return sendSuccess(res, {
      data: result.savedResources,
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
 * GET /api/resources/:id — Resource details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const resource = await resourceService.getResourceById(req.user, req.params.id);
    return sendSuccess(res, { data: resource });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/resources — Upload a new academic resource (Teachers & Admins)
 */
router.post('/', singleUpload('file'), async (req, res, next) => {
  try {
    const file = req.file ? {
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    } : null;

    const resource = await resourceService.createResource(req.user, req.body, file);
    return sendCreated(res, {
      data: resource,
      message: resource.status === 'PUBLISHED'
        ? 'Resource published successfully.'
        : resource.status === 'DRAFT'
          ? 'Resource saved as draft.'
          : 'Resource uploaded and submitted for administrative review.',
    });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * PATCH /api/resources/:id — Update resource metadata (IDOR protected)
 */
router.patch('/:id', singleUpload('file'), async (req, res, next) => {
  try {
    const file = req.file ? {
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    } : null;

    const resource = await resourceService.updateResource(req.user, req.params.id, req.body, file);
    return sendSuccess(res, { data: resource, message: 'Resource updated successfully.' });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * DELETE /api/resources/:id — Delete resource (Admin or owner of DRAFT)
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await resourceService.deleteResource(req.user, req.params.id);
    return sendSuccess(res, { message: 'Resource successfully deleted.' });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/resources/:id/submit-review — Submit draft/rejected resource for review
 */
router.post('/:id/submit-review', async (req, res, next) => {
  try {
    const resource = await resourceService.submitForReview(req.user, req.params.id);
    return sendSuccess(res, { data: resource, message: 'Resource submitted for review.' });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/resources/:id/publish — Admin approve and publish resource
 */
router.post('/:id/publish', async (req, res, next) => {
  try {
    const resource = await resourceService.publishResource(req.user, req.params.id);
    return sendSuccess(res, { data: resource, message: 'Resource approved and published.' });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/resources/:id/archive — Archive resource
 */
router.post('/:id/archive', async (req, res, next) => {
  try {
    const resource = await resourceService.archiveResource(req.user, req.params.id);
    return sendSuccess(res, { data: resource, message: 'Resource archived.' });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/resources/:id/bookmark — Save resource to bookmarks
 */
router.post('/:id/bookmark', async (req, res, next) => {
  try {
    const bookmark = await resourceService.bookmarkResource(req.user, req.params.id);
    return sendCreated(res, { data: bookmark, message: 'Resource saved to bookmarks.' });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * DELETE /api/resources/:id/bookmark — Remove resource from bookmarks
 */
router.delete('/:id/bookmark', async (req, res, next) => {
  try {
    await resourceService.unbookmarkResource(req.user, req.params.id);
    return sendSuccess(res, { message: 'Resource removed from saved bookmarks.' });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/resources/:id/view — Track resource view with anti-abuse debounce
 */
router.post('/:id/view', async (req, res, next) => {
  try {
    const result = await resourceService.recordView(req.user, req.params.id, req.ip);
    return sendSuccess(res, { data: result });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * GET /api/resources/:id/download — Download file & track download counter
 */
router.get('/:id/download', async (req, res, next) => {
  try {
    const { resource, physicalPath } = await resourceService.trackDownloadAndGetPath(req.user, req.params.id, req.ip);

    if (physicalPath && fs.existsSync(physicalPath)) {
      return res.download(physicalPath, resource.fileName);
    }

    // Fallback if physical file is not on disk (e.g. mocked or remote URL)
    return res.redirect(resource.fileUrl);
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/resources/:id/report — Report resource for moderation
 */
router.post('/:id/report', async (req, res, next) => {
  try {
    const { category, description } = req.body;
    const report = await resourceService.reportResource(req.user, req.params.id, { category, description });
    return sendCreated(res, {
      data: report,
      message: 'Report submitted. Our campus moderation team will review this resource.',
    });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

module.exports = router;
