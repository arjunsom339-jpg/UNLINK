'use strict';

const express = require('express');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { singleUpload } = require('../middleware/upload');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');
const campusExchangeService = require('../services/campusExchangeService');
const { saveExchangeImage } = require('../services/storageService');

const router = express.Router();

// All Campus Exchange routes require authentication
router.use(authenticate);

// ── 0. IMAGE UPLOADS ────────────────────────────────────────────────────────

/**
 * POST /api/campus-exchange/upload-image
 * Secure image upload for marketplace items or safe lost & found photos
 */
router.post('/upload-image', singleUpload('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return sendError(res, { statusCode: 400, message: 'No image file uploaded.' });
    }

    const saved = await saveExchangeImage({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    return sendCreated(res, {
      message: 'Image uploaded successfully.',
      data: {
        imageUrl: saved.fileUrl,
        fileName: saved.fileName,
      },
    });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

// ── 1. CAMPUS MARKETPLACE ENDPOINTS ─────────────────────────────────────────

/**
 * GET /api/campus-exchange/marketplace/saved
 * Must precede /:id to prevent routing collisions
 */
router.get('/marketplace/saved', async (req, res, next) => {
  try {
    const result = await campusExchangeService.getSavedMarketplaceListings(req.user, req.query);
    return sendSuccess(res, {
      data: result.savedItems,
      meta: { total: result.total, page: result.page, totalPages: result.totalPages },
    });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * GET /api/campus-exchange/marketplace/my-listings
 */
router.get('/marketplace/my-listings', async (req, res, next) => {
  try {
    const result = await campusExchangeService.getMyMarketplaceListings(req.user, req.query);
    return sendSuccess(res, {
      data: result.listings,
      meta: { total: result.total, page: result.page, totalPages: result.totalPages },
    });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * GET /api/campus-exchange/marketplace/my-inquiries
 */
router.get('/marketplace/my-inquiries', async (req, res, next) => {
  try {
    const result = await campusExchangeService.getMyMarketplaceInquiries(req.user, req.query);
    return sendSuccess(res, {
      data: result.inquiries,
      meta: { total: result.total, page: result.page, totalPages: result.totalPages },
    });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/campus-exchange/marketplace/inquiries/:id/respond
 */
router.patch('/marketplace/inquiries/:id/respond', async (req, res, next) => {
  try {
    const updated = await campusExchangeService.respondToMarketplaceInquiry(
      req.user,
      req.params.id,
      req.body
    );
    return sendSuccess(res, { message: 'Inquiry response recorded.', data: updated });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * GET /api/campus-exchange/marketplace
 * Browse / search active marketplace listings
 */
router.get('/marketplace', async (req, res, next) => {
  try {
    const result = await campusExchangeService.getMarketplaceListings(req.user, req.query);
    return sendSuccess(res, {
      data: result.listings,
      meta: { total: result.total, page: result.page, totalPages: result.totalPages },
    });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * POST /api/campus-exchange/marketplace
 * Create a new marketplace listing
 */
router.post('/marketplace', async (req, res, next) => {
  try {
    const listing = await campusExchangeService.createMarketplaceListing(req.user, req.body);
    return sendCreated(res, {
      message: 'Marketplace listing created successfully.',
      data: listing,
    });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * GET /api/campus-exchange/marketplace/:id
 */
router.get('/marketplace/:id', async (req, res, next) => {
  try {
    const listing = await campusExchangeService.getMarketplaceListingById(req.user, req.params.id);
    return sendSuccess(res, { data: listing });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/campus-exchange/marketplace/:id
 */
router.patch('/marketplace/:id', async (req, res, next) => {
  try {
    const listing = await campusExchangeService.updateMarketplaceListing(
      req.user,
      req.params.id,
      req.body
    );
    return sendSuccess(res, { message: 'Listing updated successfully.', data: listing });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * DELETE /api/campus-exchange/marketplace/:id
 */
router.delete('/marketplace/:id', async (req, res, next) => {
  try {
    const result = await campusExchangeService.deleteMarketplaceListing(
      req.user,
      req.params.id,
      req.body?.reason
    );
    return sendSuccess(res, result);
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * POST /api/campus-exchange/marketplace/:id/bookmark
 */
router.post('/marketplace/:id/bookmark', async (req, res, next) => {
  try {
    const bookmark = await campusExchangeService.bookmarkMarketplaceListing(req.user, req.params.id);
    return sendCreated(res, { message: 'Listing saved to bookmarks.', data: bookmark });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * DELETE /api/campus-exchange/marketplace/:id/bookmark
 */
router.delete('/marketplace/:id/bookmark', async (req, res, next) => {
  try {
    const result = await campusExchangeService.removeMarketplaceBookmark(req.user, req.params.id);
    return sendSuccess(res, result);
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * POST /api/campus-exchange/marketplace/:id/inquiries
 */
router.post('/marketplace/:id/inquiries', async (req, res, next) => {
  try {
    const inquiry = await campusExchangeService.createMarketplaceInquiry(
      req.user,
      req.params.id,
      req.body
    );
    return sendCreated(res, { message: 'Inquiry sent to seller.', data: inquiry });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * GET /api/campus-exchange/marketplace/:id/inquiries
 */
router.get('/marketplace/:id/inquiries', async (req, res, next) => {
  try {
    const inquiries = await campusExchangeService.getListingInquiries(req.user, req.params.id);
    return sendSuccess(res, { data: inquiries });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/campus-exchange/marketplace/:id/reserve
 */
router.patch('/marketplace/:id/reserve', async (req, res, next) => {
  try {
    const listing = await campusExchangeService.reserveMarketplaceListing(req.user, req.params.id);
    return sendSuccess(res, { message: 'Listing marked as reserved.', data: listing });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/campus-exchange/marketplace/:id/sold
 */
router.patch('/marketplace/:id/sold', async (req, res, next) => {
  try {
    const listing = await campusExchangeService.markMarketplaceListingSold(req.user, req.params.id);
    return sendSuccess(res, { message: 'Listing marked as sold.', data: listing });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

// ── 2. LOST & FOUND ENDPOINTS ───────────────────────────────────────────────

/**
 * GET /api/campus-exchange/lost-found/my-reports
 */
router.get('/lost-found/my-reports', async (req, res, next) => {
  try {
    const result = await campusExchangeService.getMyLostFoundReports(req.user, req.query);
    return sendSuccess(res, {
      data: result.reports,
      meta: { total: result.total, page: result.page, totalPages: result.totalPages },
    });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * GET /api/campus-exchange/lost-found/my-claims
 */
router.get('/lost-found/my-claims', async (req, res, next) => {
  try {
    const result = await campusExchangeService.getMyLostFoundClaims(req.user, req.query);
    return sendSuccess(res, {
      data: result.claims,
      meta: { total: result.total, page: result.page, totalPages: result.totalPages },
    });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/campus-exchange/lost-found/claims/:id/accept
 */
router.patch('/lost-found/claims/:id/accept', async (req, res, next) => {
  try {
    const claim = await campusExchangeService.acceptLostFoundClaim(req.user, req.params.id);
    return sendSuccess(res, { message: 'Claim accepted successfully.', data: claim });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/campus-exchange/lost-found/claims/:id/reject
 */
router.patch('/lost-found/claims/:id/reject', async (req, res, next) => {
  try {
    const claim = await campusExchangeService.rejectLostFoundClaim(
      req.user,
      req.params.id,
      req.body.reason
    );
    return sendSuccess(res, { message: 'Claim rejected.', data: claim });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * GET /api/campus-exchange/lost-found
 * Search & browse items
 */
router.get('/lost-found', async (req, res, next) => {
  try {
    const result = await campusExchangeService.getLostFoundItems(req.user, req.query);
    return sendSuccess(res, {
      data: result.items,
      meta: { total: result.total, page: result.page, totalPages: result.totalPages },
    });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * POST /api/campus-exchange/lost-found
 * Report an item lost or found
 */
router.post('/lost-found', async (req, res, next) => {
  try {
    const item = await campusExchangeService.createLostFoundItem(req.user, req.body);
    return sendCreated(res, {
      message: 'Item reported successfully.',
      data: item,
    });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * GET /api/campus-exchange/lost-found/:id
 */
router.get('/lost-found/:id', async (req, res, next) => {
  try {
    const item = await campusExchangeService.getLostFoundItemById(req.user, req.params.id);
    return sendSuccess(res, { data: item });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/campus-exchange/lost-found/:id
 */
router.patch('/lost-found/:id', async (req, res, next) => {
  try {
    const item = await campusExchangeService.updateLostFoundItem(
      req.user,
      req.params.id,
      req.body
    );
    return sendSuccess(res, { message: 'Report updated successfully.', data: item });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * DELETE /api/campus-exchange/lost-found/:id
 */
router.delete('/lost-found/:id', async (req, res, next) => {
  try {
    const result = await campusExchangeService.deleteLostFoundItem(
      req.user,
      req.params.id,
      req.body?.reason
    );
    return sendSuccess(res, result);
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * POST /api/campus-exchange/lost-found/:id/claim
 */
router.post('/lost-found/:id/claim', async (req, res, next) => {
  try {
    const claim = await campusExchangeService.createLostFoundClaim(
      req.user,
      req.params.id,
      req.body
    );
    return sendCreated(res, { message: 'Ownership claim submitted.', data: claim });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/campus-exchange/lost-found/:id/resolve
 */
router.patch('/lost-found/:id/resolve', async (req, res, next) => {
  try {
    const item = await campusExchangeService.markLostFoundResolved(req.user, req.params.id);
    return sendSuccess(res, { message: 'Item marked as resolved.', data: item });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * GET /api/campus-exchange/lost-found/:id/matches
 * Deterministic matching engine endpoint
 */
router.get('/lost-found/:id/matches', async (req, res, next) => {
  try {
    const matches = await campusExchangeService.findMatchesForLostFoundItem(
      req.user,
      req.params.id
    );
    return sendSuccess(res, { data: matches });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

// ── 3. SAFETY REPORTING ENDPOINTS ───────────────────────────────────────────

/**
 * POST /api/campus-exchange/:type/:id/report
 * Flags marketplace listings or lost & found records for campus administration
 */
router.post('/:type/:id/report', async (req, res, next) => {
  try {
    const report = await campusExchangeService.reportExchangeItem(req.user, {
      type: req.params.type,
      id: req.params.id,
      category: req.body.category,
      description: req.body.description,
    });
    return sendCreated(res, {
      message: 'Report submitted for administrator moderation.',
      data: report,
    });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

// ── 4. ADMIN MODERATION & ANALYTICS ─────────────────────────────────────────

router.get('/admin/marketplace', authorize('admin'), async (req, res, next) => {
  try {
    const result = await campusExchangeService.getAdminMarketplaceListings(req.user, req.query);
    return sendSuccess(res, {
      data: result.listings,
      meta: { total: result.total, page: result.page, totalPages: result.totalPages },
    });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

router.get('/admin/lost-found', authorize('admin'), async (req, res, next) => {
  try {
    const result = await campusExchangeService.getAdminLostFoundItems(req.user, req.query);
    return sendSuccess(res, {
      data: result.items,
      meta: { total: result.total, page: result.page, totalPages: result.totalPages },
    });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

router.delete('/admin/marketplace/:id', authorize('admin'), async (req, res, next) => {
  try {
    const result = await campusExchangeService.deleteMarketplaceListing(
      req.user,
      req.params.id,
      req.body?.reason
    );
    return sendSuccess(res, result);
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

router.patch('/admin/lost-found/:id/archive', authorize('admin'), async (req, res, next) => {
  try {
    const item = await campusExchangeService.adminArchiveLostFoundItem(
      req.user,
      req.params.id,
      req.body?.reason
    );
    return sendSuccess(res, { message: 'Item archived by admin.', data: item });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

router.get('/admin/analytics', authorize('admin'), async (req, res, next) => {
  try {
    const analytics = await campusExchangeService.getAdminExchangeAnalytics(req.user);
    return sendSuccess(res, { data: analytics });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

module.exports = router;
