'use strict';

const express = require('express');
const fs = require('fs');
const { authenticate } = require('../middleware/authenticate');
const { singleUpload } = require('../middleware/upload');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');
const placementService = require('../services/placementService');
const logger = require('../utils/logger');

const router = express.Router();

// All placement endpoints require authenticated user
router.use(authenticate);

// ── 1. PLACEMENT DASHBOARD & ANALYTICS ────────────────────────────────────────

/**
 * GET /api/placements/stats — Placement statistics (TPC overview or Student summary)
 */
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await placementService.getPlacementStats(req.user);
    return sendSuccess(res, { data: stats });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

// ── 2. SAVED / BOOKMARKED OPPORTUNITIES ────────────────────────────────────────

/**
 * GET /api/placements/saved — Student's bookmarked opportunities
 * (Placed before /opportunities/:id to avoid parameter collisions)
 */
router.get('/saved', async (req, res, next) => {
  try {
    const saved = await placementService.getSavedOpportunities(req.user, req.query);
    return sendSuccess(res, { data: saved });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

// ── 3. STUDENT PLACEMENT PROFILE & RESUME ─────────────────────────────────────

/**
 * GET /api/placements/profile — Get placement profile
 */
router.get('/profile', async (req, res, next) => {
  try {
    const profile = await placementService.getPlacementProfile(req.user, req.query.studentId);
    return sendSuccess(res, { data: profile });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/placements/profile — Update student placement profile
 */
router.patch('/profile', async (req, res, next) => {
  try {
    const updated = await placementService.updatePlacementProfile(req.user, req.body);
    return sendSuccess(res, { data: updated, message: 'Placement profile updated successfully.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * POST /api/placements/profile/resume — Upload private resume file
 */
router.post('/profile/resume', singleUpload('resume'), async (req, res, next) => {
  try {
    const result = await placementService.uploadResume(req.user, req.file);
    return sendCreated(res, { data: result, message: result.message });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * GET /api/placements/resumes/:filename — Access-controlled resume download
 */
router.get('/resumes/:filename', async (req, res, next) => {
  try {
    const { physicalPath, filename } = await placementService.getResumeAccess(req.user, req.params.filename);

    if (physicalPath && fs.existsSync(physicalPath)) {
      return res.download(physicalPath, filename);
    }

    return sendError(res, { statusCode: 404, message: 'Resume document not found on disk.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

// ── 4. COMPANY MANAGEMENT ─────────────────────────────────────────────────────

/**
 * GET /api/placements/companies — List companies in college
 */
router.get('/companies', async (req, res, next) => {
  try {
    const result = await placementService.getCompanies(req.user, req.query);
    return sendSuccess(res, {
      data: result.companies,
      meta: {
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
 * POST /api/placements/companies — Register new company (TPC/Admin)
 */
router.post('/companies', async (req, res, next) => {
  try {
    const company = await placementService.createCompany(req.user, req.body);
    return sendCreated(res, { data: company, message: 'Company created successfully.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/placements/companies/:id/verify — Verify company record (TPC/Admin)
 */
router.patch('/companies/:id/verify', async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const company = await placementService.verifyCompany(req.user, req.params.id, { status, notes });
    return sendSuccess(res, { data: company, message: `Company verification status updated to ${status}.` });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

// ── 5. OPPORTUNITIES & PLACEMENT DRIVES ────────────────────────────────────────

/**
 * GET /api/placements/opportunities — Discover opportunities & drives
 */
router.get('/opportunities', async (req, res, next) => {
  try {
    const result = await placementService.getOpportunities(req.user, req.query);
    return sendSuccess(res, {
      data: result.opportunities,
      meta: {
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
 * GET /api/placements/opportunities/:id — Opportunity details
 */
router.get('/opportunities/:id', async (req, res, next) => {
  try {
    const opportunity = await placementService.getOpportunityById(req.user, req.params.id);
    return sendSuccess(res, { data: opportunity });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * POST /api/placements/opportunities — Create opportunity/drive (TPC/Admin)
 */
router.post('/opportunities', async (req, res, next) => {
  try {
    const opportunity = await placementService.createOpportunity(req.user, req.body);
    return sendCreated(res, { data: opportunity, message: 'Opportunity created successfully.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/placements/opportunities/:id — Update opportunity (TPC/Admin)
 */
router.patch('/opportunities/:id', async (req, res, next) => {
  try {
    const opportunity = await placementService.updateOpportunity(req.user, req.params.id, req.body);
    return sendSuccess(res, { data: opportunity, message: 'Opportunity updated successfully.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * POST /api/placements/opportunities/:id/publish — Publish opportunity (TPC/Admin)
 */
router.post('/opportunities/:id/publish', async (req, res, next) => {
  try {
    const opportunity = await placementService.publishOpportunity(req.user, req.params.id);
    return sendSuccess(res, { data: opportunity, message: 'Opportunity published successfully.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * POST /api/placements/opportunities/:id/close — Close applications (TPC/Admin)
 */
router.post('/opportunities/:id/close', async (req, res, next) => {
  try {
    const opportunity = await placementService.closeOpportunity(req.user, req.params.id);
    return sendSuccess(res, { data: opportunity, message: 'Opportunity applications closed.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * POST /api/placements/opportunities/:id/cancel — Cancel opportunity (TPC/Admin)
 */
router.post('/opportunities/:id/cancel', async (req, res, next) => {
  try {
    const { reason } = req.body;
    const opportunity = await placementService.cancelOpportunity(req.user, req.params.id, reason);
    return sendSuccess(res, { data: opportunity, message: 'Opportunity cancelled.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * POST /api/placements/opportunities/:id/apply — Student applies for opportunity
 */
router.post('/opportunities/:id/apply', async (req, res, next) => {
  try {
    const application = await placementService.applyOpportunity(req.user, req.params.id, req.body);
    return sendCreated(res, { data: application, message: 'Application submitted successfully.' });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, {
        statusCode: err.statusCode,
        message: err.message,
        details: err.missingCriteria ? { missingCriteria: err.missingCriteria } : undefined,
      });
    }
    next(err);
  }
});

/**
 * DELETE /api/placements/opportunities/:id/apply — Student withdraws application by opportunity ID
 */
router.delete('/opportunities/:id/apply', async (req, res, next) => {
  try {
    const apps = await placementService.getApplications(req.user, { opportunityId: req.params.id });
    const existing = apps.applications && apps.applications[0];
    if (!existing) {
      return sendError(res, { statusCode: 404, message: 'Application not found.' });
    }
    const withdrawn = await placementService.withdrawApplication(req.user, existing.id);
    return sendSuccess(res, { data: withdrawn, message: 'Application withdrawn successfully.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * POST /api/placements/opportunities/:id/bookmark — Save opportunity
 */
router.post('/opportunities/:id/bookmark', async (req, res, next) => {
  try {
    const bookmark = await placementService.bookmarkOpportunity(req.user, req.params.id);
    return sendCreated(res, { data: bookmark, message: 'Opportunity saved to bookmarks.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * DELETE /api/placements/opportunities/:id/bookmark — Remove bookmark
 */
router.delete('/opportunities/:id/bookmark', async (req, res, next) => {
  try {
    const result = await placementService.unbookmarkOpportunity(req.user, req.params.id);
    return sendSuccess(res, { message: result.message });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * POST /api/placements/opportunities/:id/report — Report suspicious opportunity
 */
router.post('/opportunities/:id/report', async (req, res, next) => {
  try {
    const { category, description } = req.body;
    const report = await placementService.reportOpportunity(req.user, req.params.id, { category, description });
    return sendCreated(res, {
      data: report,
      message: 'Report submitted. TPC / Administrative moderation team will review this opportunity.',
    });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

// ── 6. APPLICATIONS & RECRUITMENT STAGES ──────────────────────────────────────

/**
 * GET /api/placements/applications — List applications
 */
router.get('/applications', async (req, res, next) => {
  try {
    const result = await placementService.getApplications(req.user, req.query);
    return sendSuccess(res, {
      data: result.applications,
      meta: {
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
 * GET /api/placements/applications/:id — Application details
 */
router.get('/applications/:id', async (req, res, next) => {
  try {
    const application = await placementService.getApplicationById(req.user, req.params.id);
    return sendSuccess(res, { data: application });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * POST /api/placements/applications/:id/withdraw — Student withdraws application
 */
router.post('/applications/:id/withdraw', async (req, res, next) => {
  try {
    const application = await placementService.withdrawApplication(req.user, req.params.id);
    return sendSuccess(res, { data: application, message: 'Application withdrawn successfully.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/placements/applications/:id/stage — Move recruitment stage
 */
router.patch('/applications/:id/stage', async (req, res, next) => {
  try {
    const application = await placementService.updateApplicationStage(req.user, req.params.id, req.body);
    return sendSuccess(res, {
      data: application,
      message: `Application updated to stage: ${application.status}`,
    });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/placements/applications/:id/shortlist — Shorthand shortlist
 */
router.patch('/applications/:id/shortlist', async (req, res, next) => {
  try {
    const application = await placementService.updateApplicationStage(req.user, req.params.id, {
      status: 'SHORTLISTED',
      notes: req.body?.notes,
    });
    return sendSuccess(res, { data: application, message: 'Candidate shortlisted successfully.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/placements/applications/:id/reject — Shorthand reject
 */
router.patch('/applications/:id/reject', async (req, res, next) => {
  try {
    const application = await placementService.updateApplicationStage(req.user, req.params.id, {
      status: 'REJECTED',
      notes: req.body?.notes,
    });
    return sendSuccess(res, { data: application, message: 'Application marked as rejected.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/placements/applications/:id/select — Shorthand select / extend offer
 */
router.patch('/applications/:id/select', async (req, res, next) => {
  try {
    const application = await placementService.updateApplicationStage(req.user, req.params.id, {
      status: 'SELECTED',
      notes: req.body?.notes,
      finalResult: 'SELECTED',
    });
    return sendSuccess(res, { data: application, message: 'Candidate marked as selected for placement.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

// ── 7. INTERVIEWS & ASSESSMENTS ───────────────────────────────────────────────

/**
 * GET /api/placements/interviews — List scheduled tests & interviews
 */
router.get('/interviews', async (req, res, next) => {
  try {
    const result = await placementService.getInterviews(req.user, req.query);
    return sendSuccess(res, {
      data: result.interviews,
      meta: {
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
 * POST /api/placements/interviews — Schedule test/interview (TPC/Admin)
 */
router.post('/interviews', async (req, res, next) => {
  try {
    const interview = await placementService.scheduleInterview(req.user, req.body);
    return sendCreated(res, { data: interview, message: 'Interview scheduled successfully.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/placements/interviews/:id — Update interview status/result (TPC/Admin)
 */
router.patch('/interviews/:id', async (req, res, next) => {
  try {
    const interview = await placementService.updateInterview(req.user, req.params.id, req.body);
    return sendSuccess(res, { data: interview, message: 'Interview updated successfully.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

module.exports = router;
