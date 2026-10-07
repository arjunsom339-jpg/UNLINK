'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { authenticate } = require('../../middleware/authenticate');
const { adminOnly, superAdminOnly } = require('../../middleware/authorize');
const { sendSuccess, sendPaginated, sendError, sendCreated } = require('../../utils/response');
const {
  User,
  StudentProfile,
  TeacherProfile,
  VerificationRequest,
  AuditLog,
  Announcement,
  College,
  HelpRequest,
  HelpResponder,
  HelpFeedback,
  Report,
  sequelize,
  Event,
  EventRegistration,
  Department,
  Resource,
} = require('../../models');
const authService = require('../../services/authService');
const eventService = require('../../services/eventService');
const resourceService = require('../../services/resourceService');
const alumniService = require('../../services/alumniService');
const placementService = require('../../services/placementService');
const clubService = require('../../services/clubService');

const router = express.Router();


// All admin routes strictly require authentication + admin role on the server
router.use(authenticate, adminOnly);

/**
 * GET /api/admin/dashboard — Real-time platform statistics
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    const [
      totalStudents,
      totalTeachers,
      pendingStudents,
      pendingTeachers,
      suspendedUsers,
      totalVerificationsPending,
    ] = await Promise.all([
      User.count({ where: { role: 'student' } }),
      User.count({ where: { role: 'teacher' } }),
      User.count({ where: { role: 'student', accountStatus: 'pending' } }),
      User.count({ where: { role: 'teacher', accountStatus: 'pending' } }),
      User.count({ where: { accountStatus: 'suspended' } }),
      VerificationRequest.count({ where: { status: 'pending' } }),
    ]);

    return sendSuccess(res, {
      data: {
        stats: {
          totalStudents,
          totalTeachers,
          pendingStudents,
          pendingTeachers,
          suspendedUsers,
          totalVerificationsPending,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/verifications — View pending student & teacher registrations
 */
router.get('/verifications', async (req, res, next) => {
  try {
    const page   = parseInt(req.query.page, 10)  || 1;
    const limit  = parseInt(req.query.limit, 10) || 20;
    const role   = req.query.role;
    const status = req.query.status || 'pending';

    const where = {};
    if (status && status !== 'all') where.status = status;
    if (role && role !== 'all') where.role = role;

    const { count, rows } = await VerificationRequest.findAndCountAll({
      where,
      offset: (page - 1) * limit,
      limit,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'role', 'accountStatus', 'createdAt'],
          include: [
            { model: StudentProfile, as: 'studentProfile' },
            { model: TeacherProfile, as: 'teacherProfile' },
          ],
        },
      ],
    });

    return sendPaginated(res, { data: rows, page, limit, total: count });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/verifications/:id/approve — Approve a registration
 */
router.patch('/verifications/:id/approve', async (req, res, next) => {
  try {
    const verification = await VerificationRequest.findByPk(req.params.id);
    if (!verification) {
      return sendError(res, { statusCode: 404, message: 'Verification request not found.' });
    }

    const user = await User.findByPk(verification.userId);
    if (!user) {
      return sendError(res, { statusCode: 404, message: 'Target user not found.' });
    }

    await verification.update({
      status: 'approved',
      reviewedById: req.user.id,
      reviewedAt: new Date(),
      reviewNotes: req.body.notes || 'Approved by administrator',
    });

    await user.update({
      accountStatus: 'active',
      isAdminVerified: true,
    });

    await authService.logAuditEvent({
      actorId: req.user.id,
      targetUserId: user.id,
      action: 'ACCOUNT_VERIFIED_APPROVED',
      category: 'ADMIN_MODERATION',
      ipAddress: req.ip,
      details: { role: user.role, identifier: verification.identifier },
    });

    return sendSuccess(res, {
      message: `${user.role.toUpperCase()} account successfully verified and activated.`,
      data: { verificationId: verification.id, userId: user.id, status: 'active' },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/verifications/:id/reject — Reject a registration
 */
router.patch('/verifications/:id/reject', async (req, res, next) => {
  try {
    const verification = await VerificationRequest.findByPk(req.params.id);
    if (!verification) {
      return sendError(res, { statusCode: 404, message: 'Verification request not found.' });
    }

    const user = await User.findByPk(verification.userId);

    await verification.update({
      status: 'rejected',
      reviewedById: req.user.id,
      reviewedAt: new Date(),
      reviewNotes: req.body.notes || 'Verification rejected by administrator',
    });

    if (user) {
      await user.update({ accountStatus: 'suspended' });
      await authService.revokeAllUserSessions(user.id);
    }

    await authService.logAuditEvent({
      actorId: req.user.id,
      targetUserId: user?.id,
      action: 'ACCOUNT_VERIFICATION_REJECTED',
      category: 'ADMIN_MODERATION',
      ipAddress: req.ip,
      details: { reason: req.body.notes },
    });

    return sendSuccess(res, {
      message: 'Verification request rejected.',
      data: { verificationId: verification.id, status: 'rejected' },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/users — List all users with pagination & search filters
 */
router.get('/users', async (req, res, next) => {
  try {
    const page   = parseInt(req.query.page, 10)  || 1;
    const limit  = parseInt(req.query.limit, 10) || 20;
    const role   = req.query.role;
    const status = req.query.status;

    const where = {};
    if (role && role !== 'all')   where.role = role;
    if (status && status !== 'all') where.accountStatus = status;

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['passwordHash', 'refreshTokenHash', 'passwordResetToken', 'emailVerificationToken'] },
      include: [
        { model: StudentProfile, as: 'studentProfile' },
        { model: TeacherProfile, as: 'teacherProfile' },
      ],
      offset: (page - 1) * limit,
      limit,
      order: [['createdAt', 'DESC']],
    });

    return sendPaginated(res, { data: rows, page, limit, total: count });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/users/:id/status — Moderation: activate, suspend, ban, or reset to pending
 */
router.patch('/users/:id/status', async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    const validStatuses = ['active', 'suspended', 'banned', 'pending'];

    if (!validStatuses.includes(status)) {
      return sendError(res, { statusCode: 400, message: `Invalid status. Must be one of: [${validStatuses.join(', ')}]` });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return sendError(res, { statusCode: 404, message: 'User not found.' });
    }

    // Protect Super Admins from being modified by ordinary admins
    if (user.role === 'admin' && user.adminRole === 'SUPER_ADMIN' && req.user.adminRole !== 'SUPER_ADMIN') {
      return sendError(res, { statusCode: 403, message: 'Only Super Administrators can modify this account.' });
    }

    const previousStatus = user.accountStatus;
    await user.update({ accountStatus: status });

    // If suspended or banned, invalidate all active sessions immediately
    if (status === 'suspended' || status === 'banned') {
      await authService.revokeAllUserSessions(user.id);
    }

    await authService.logAuditEvent({
      actorId: req.user.id,
      targetUserId: user.id,
      action: `ACCOUNT_STATUS_${status.toUpperCase()}`,
      category: 'ADMIN_MODERATION',
      ipAddress: req.ip,
      details: { previousStatus, newStatus: status, reason: reason || 'Admin action' },
    });

    return sendSuccess(res, {
      message: `User status changed to '${status}'.`,
      data: { id: user.id, accountStatus: status },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/audit-logs — Access security and moderation audit trail
 */
router.get('/audit-logs', async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page, 10)  || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const category = req.query.category;

    const where = {};
    if (category) where.category = category;

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      offset: (page - 1) * limit,
      limit,
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'actor', attributes: ['id', 'email', 'role'] },
        { model: User, as: 'targetUser', attributes: ['id', 'email', 'role'] },
      ],
    });

    return sendPaginated(res, { data: rows, page, limit, total: count });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/create-admin — Secure administrative admin provisioning (SUPER_ADMIN only)
 */
router.post('/create-admin', superAdminOnly, async (req, res, next) => {
  try {
    const { email, password, adminRole = 'ADMIN' } = req.body;

    if (!email || !password) {
      return sendError(res, { statusCode: 400, message: 'Email and password are required.' });
    }

    const emailExists = await User.findOne({ where: { email } });
    if (emailExists) {
      return sendError(res, { statusCode: 409, message: 'User with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, authService.SALT_ROUNDS);

    const newAdmin = await User.create({
      email,
      passwordHash,
      role: 'admin',
      adminRole,
      accountStatus: 'active',
      isAdminVerified: true,
      isEmailVerified: true,
    });

    await authService.logAuditEvent({
      actorId: req.user.id,
      targetUserId: newAdmin.id,
      action: 'ADMIN_PROVISIONED',
      category: 'ADMIN_MODERATION',
      ipAddress: req.ip,
      details: { email, adminRole },
    });

    return sendCreated(res, {
      message: `Admin account (${adminRole}) created successfully.`,
      data: { id: newAdmin.id, email: newAdmin.email, role: 'admin', adminRole },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/announcements — Broadcast emergency or college notice
 */
router.post('/announcements', async (req, res, next) => {
  try {
    const { title, content, category, isPinned } = req.body;
    const announcement = await Announcement.create({
      authorId: req.user.id,
      title,
      content,
      category: category || 'urgent',
      isPinned: isPinned !== undefined ? !!isPinned : true,
      isPublished: true,
      publishedAt: new Date(),
    });

    await authService.logAuditEvent({
      actorId: req.user.id,
      action: 'ADMIN_ANNOUNCEMENT_BROADCAST',
      category: 'ADMIN_MODERATION',
      ipAddress: req.ip,
      details: { title, category },
    });

    return sendCreated(res, { data: announcement, message: 'Campus-wide announcement published.' });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EMERGENCY & HELP ASSISTANCE MONITORING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/help/requests — View all emergency and help requests
 */
router.get('/help/requests', async (req, res, next) => {
  try {
    const page     = parseInt(req.query.page, 10)  || 1;
    const limit    = parseInt(req.query.limit, 10) || 20;
    const status   = req.query.status;
    const category = req.query.category;
    const urgency  = req.query.urgency;

    const where = {};
    if (status && status !== 'all') where.status = status;
    if (category && category !== 'all') where.category = category;
    if (urgency && urgency !== 'all') where.urgencyLevel = urgency;

    const { count, rows } = await HelpRequest.findAndCountAll({
      where,
      offset: (page - 1) * limit,
      limit,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'email', 'accountStatus'],
          include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName', 'department', 'semester'] }],
        },
        {
          model: User,
          as: 'helper',
          attributes: ['id', 'email', 'accountStatus'],
          include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName', 'department', 'semester'] }],
        },
        {
          model: HelpFeedback,
          as: 'feedback',
        },
      ],
    });

    // Audit administrative access to emergency logs
    await authService.logAuditEvent({
      actorId: req.user.id,
      action: 'ADMIN_EMERGENCY_LOGS_VIEWED',
      category: 'ADMIN_ACCESS',
      ipAddress: req.ip,
      details: { page, status, category },
    });

    // Sanitize exact live coordinates for standard admin table view
    const sanitizedRows = rows.map((r) => {
      const obj = r.toJSON();
      delete obj.latitude;
      delete obj.longitude;
      delete obj.helperLatitude;
      delete obj.helperLongitude;
      return obj;
    });

    return sendPaginated(res, { data: sanitizedRows, page, limit, total: count });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/help/stats — Overview of emergency response metrics
 */
router.get('/help/stats', async (req, res, next) => {
  try {
    const [total, pending, active, resolved, cancelled] = await Promise.all([
      HelpRequest.count(),
      HelpRequest.count({ where: { status: 'pending' } }),
      HelpRequest.count({ where: { status: 'active' } }),
      HelpRequest.count({ where: { status: 'resolved' } }),
      HelpRequest.count({ where: { status: 'cancelled' } }),
    ]);

    const categories = await HelpRequest.findAll({
      attributes: ['category', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['category'],
      raw: true,
    });

    return sendSuccess(res, {
      data: {
        totalRequests: total,
        pendingRequests: pending,
        activeRequests: active,
        resolvedRequests: resolved,
        resolvedCount: resolved,
        cancelledRequests: cancelled,
        categoryBreakdown: categories,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/help/requests/:id/moderate — Administrative intervention on request
 */
router.patch('/help/requests/:id/moderate', async (req, res, next) => {
  try {
    const { action, reason } = req.body;
    const request = await HelpRequest.findByPk(req.params.id);
    if (!request) return sendError(res, { statusCode: 404, message: 'Help request not found.' });

    if (action === 'cancel') {
      await request.update({
        status: 'cancelled',
        cancellationReason: `Admin intervention: ${reason || 'Administrative action'}`,
        requesterLocationShared: false,
        helperLocationShared: false,
      });
    } else if (action === 'expire') {
      await request.update({
        status: 'expired',
        requesterLocationShared: false,
        helperLocationShared: false,
      });
    } else {
      return sendError(res, { statusCode: 400, message: 'Action must be cancel or expire.' });
    }

    await authService.logAuditEvent({
      actorId: req.user.id,
      targetUserId: request.requesterId,
      action: 'ADMIN_EMERGENCY_MODERATION',
      category: 'ADMIN_MODERATION',
      ipAddress: req.ip,
      details: { requestId: request.id, action, reason },
    });

    return sendSuccess(res, { data: request, message: `Request successfully moderated (${action}).` });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/events — Audit & list all campus events
 */
router.get('/events', async (req, res, next) => {
  try {
    const { category, status, search, page = 1, limit = 20 } = req.query;
    const where = { collegeId: req.user.collegeId };

    if (category && category !== 'all') where.category = category;
    if (status && status !== 'all') where.status = status;
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { title: { [Op.like]: q } },
        { description: { [Op.like]: q } },
        { venue: { [Op.like]: q } },
        { organizerName: { [Op.like]: q } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * pageSize;

    const { rows, count } = await Event.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'email', 'role'],
          include: [{ model: TeacherProfile, as: 'teacherProfile', attributes: ['fullName', 'designation'] }],
        },
        { model: Department, as: 'targetDepartment', attributes: ['id', 'name', 'code'] },
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
 * GET /api/admin/events/stats — Overall campus event analytics
 */
router.get('/events/stats', async (req, res, next) => {
  try {
    const stats = await eventService.getAdminEventStats(req.user);
    return sendSuccess(res, { data: stats });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/events/:id/moderate — Admin event moderation (publish, cancel, complete)
 */
router.patch('/events/:id/moderate', async (req, res, next) => {
  try {
    const { action, reason } = req.body;
    const event = await Event.findByPk(req.params.id);
    if (!event) return sendError(res, { statusCode: 404, message: 'Event not found.' });

    if (event.collegeId !== req.user.collegeId) {
      return sendError(res, { statusCode: 403, message: 'Cross-college moderation blocked.' });
    }

    let moderatedEvent = event;
    if (action === 'publish') {
      moderatedEvent = await eventService.publishEvent(req.user, event.id);
    } else if (action === 'cancel') {
      moderatedEvent = await eventService.cancelEvent(req.user, event.id, reason || 'Cancelled by campus administration');
    } else if (action === 'complete') {
      await event.update({ status: 'COMPLETED' });
      moderatedEvent = event;
    } else {
      return sendError(res, { statusCode: 400, message: 'Invalid action. Supported: publish, cancel, complete.' });
    }

    await authService.logAuditEvent({
      actorId: req.user.id,
      targetUserId: event.createdBy,
      action: 'ADMIN_EVENT_MODERATION',
      category: 'ADMIN_MODERATION',
      ipAddress: req.ip,
      details: { eventId: event.id, action, reason },
    });

    return sendSuccess(res, { data: moderatedEvent, message: `Event successfully moderated (${action}).` });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

/**
 * DELETE /api/admin/events/:id — Admin delete event
 */
router.delete('/events/:id', async (req, res, next) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) return sendError(res, { statusCode: 404, message: 'Event not found.' });

    if (event.collegeId !== req.user.collegeId) {
      return sendError(res, { statusCode: 403, message: 'Cross-college deletion blocked.' });
    }

    await eventService.deleteEvent(req.user, event.id);
    return sendSuccess(res, { message: 'Event permanently deleted by admin.' });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, { statusCode: err.statusCode, message: err.message });
    }
    next(err);
  }
});

// ══════════════════════════════════════════════════════════════════════════
// RESOURCE MANAGEMENT (ACADEMIC REPOSITORY)
// ══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/resources — List all resources across college with moderation filters
 */
router.get('/resources', async (req, res, next) => {
  try {
    const result = await resourceService.getAdminResources(req.user, req.query);
    return sendSuccess(res, {
      data: result.resources,
      meta: { total: result.total, page: result.page, totalPages: result.totalPages },
    });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * GET /api/admin/resources/pending — Shortcut to list pending review resources
 */
router.get('/resources/pending', async (req, res, next) => {
  try {
    const query = { ...req.query, status: 'PENDING_REVIEW' };
    const result = await resourceService.getAdminResources(req.user, query);
    return sendSuccess(res, {
      data: result.resources,
      meta: { total: result.total, page: result.page, totalPages: result.totalPages },
    });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * GET /api/admin/resources/stats — Platform-wide resource statistics
 */
router.get('/resources/stats', async (req, res, next) => {
  try {
    const stats = await resourceService.getAdminStats(req.user);
    return sendSuccess(res, { data: stats });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/admin/resources/:id/moderate — Admin resource moderation (approve, reject, archive)
 */
router.patch('/resources/:id/moderate', async (req, res, next) => {
  try {
    const { action, reason } = req.body;
    const resource = await Resource.findByPk(req.params.id);
    if (!resource) return sendError(res, { statusCode: 404, message: 'Resource not found.' });

    if (resource.collegeId !== req.user.collegeId) {
      return sendError(res, { statusCode: 403, message: 'Cross-college resource moderation is forbidden.' });
    }

    let moderatedResource;
    if (action === 'approve' || action === 'publish') {
      moderatedResource = await resourceService.publishResource(req.user, resource.id);
      await authService.logAuditEvent({
        actorId: req.user.id,
        targetUserId: resource.uploadedBy,
        action: 'RESOURCE_APPROVED',
        category: 'RESOURCE_MODERATION',
        ipAddress: req.ip,
        details: { resourceId: resource.id, title: resource.title },
      });
    } else if (action === 'reject') {
      if (!reason || !reason.trim()) {
        return sendError(res, { statusCode: 400, message: 'Rejection reason is required.' });
      }
      moderatedResource = await resourceService.rejectResource(req.user, resource.id, reason);
      await authService.logAuditEvent({
        actorId: req.user.id,
        targetUserId: resource.uploadedBy,
        action: 'RESOURCE_REJECTED',
        category: 'RESOURCE_MODERATION',
        ipAddress: req.ip,
        details: { resourceId: resource.id, title: resource.title, reason },
      });
    } else if (action === 'archive') {
      moderatedResource = await resourceService.archiveResource(req.user, resource.id);
      await authService.logAuditEvent({
        actorId: req.user.id,
        targetUserId: resource.uploadedBy,
        action: 'RESOURCE_ARCHIVED',
        category: 'RESOURCE_MODERATION',
        ipAddress: req.ip,
        details: { resourceId: resource.id, title: resource.title },
      });
    } else {
      return sendError(res, { statusCode: 400, message: 'Invalid action. Supported: approve, reject, archive.' });
    }

    return sendSuccess(res, {
      data: moderatedResource,
      message: `Resource successfully moderated (${action}).`,
    });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * DELETE /api/admin/resources/:id — Admin delete resource
 */
router.delete('/resources/:id', async (req, res, next) => {
  try {
    const resource = await Resource.findByPk(req.params.id);
    if (!resource) return sendError(res, { statusCode: 404, message: 'Resource not found.' });

    if (resource.collegeId !== req.user.collegeId) {
      return sendError(res, { statusCode: 403, message: 'Cross-college resource deletion is forbidden.' });
    }

    await resourceService.deleteResource(req.user, resource.id);

    await authService.logAuditEvent({
      actorId: req.user.id,
      targetUserId: resource.uploadedBy,
      action: 'RESOURCE_DELETED',
      category: 'RESOURCE_MODERATION',
      ipAddress: req.ip,
      details: { resourceId: resource.id, title: resource.title },
    });

    return sendSuccess(res, { message: 'Resource permanently deleted by admin.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

// ── Admin Alumni & Mentorship Moderation ────────────────────────────────────

/**
 * GET /api/admin/alumni — List alumni directory with verification status and filters
 */
router.get('/alumni', async (req, res, next) => {
  try {
    const result = await alumniService.getAdminAlumniList(req.user, req.query);
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
 * GET /api/admin/alumni/stats — Mentorship and alumni network statistics
 */
router.get('/alumni/stats', async (req, res, next) => {
  try {
    const stats = await alumniService.getAdminAlumniStats(req.user);
    return sendSuccess(res, { data: stats });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/alumni/:id/verify — Approve or reject alumni verification
 * Body: { status: 'VERIFIED' } or { status: 'REJECTED', reason: '...' }
 */
router.patch('/alumni/:id/verify', async (req, res, next) => {
  try {
    const { status, action, reason } = req.body;
    const targetStatus = status || action;

    if (targetStatus === 'VERIFIED' || targetStatus === 'approve') {
      const profile = await alumniService.verifyAlumni(req.user, req.params.id);
      return sendSuccess(res, {
        data: profile,
        message: 'Alumni verified successfully. Profile is now active in the directory.',
      });
    } else if (targetStatus === 'REJECTED' || targetStatus === 'reject') {
      if (!reason || !reason.trim()) {
        return sendError(res, { statusCode: 400, message: 'Rejection reason is required.' });
      }
      const profile = await alumniService.rejectAlumni(req.user, req.params.id, reason);
      return sendSuccess(res, {
        data: profile,
        message: 'Alumni verification rejected.',
      });
    }

    return sendError(res, {
      statusCode: 400,
      message: 'Invalid status. Supported values are VERIFIED or REJECTED.',
    });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/admin/alumni/:id/suspend — Suspend alumni privileges
 */
router.patch('/alumni/:id/suspend', async (req, res, next) => {
  try {
    const { reason } = req.body;
    const profile = await alumniService.suspendAlumni(req.user, req.params.id, reason);
    return sendSuccess(res, {
      data: profile,
      message: 'Alumni suspended and removed from discovery.',
    });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * GET /api/admin/placements/stats — Placement overview statistics
 */
router.get('/placements/stats', async (req, res, next) => {
  try {
    const stats = await placementService.getPlacementStats(req.user);
    return sendSuccess(res, { data: stats });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

// ── Admin Club & Society Endpoints ───────────────────────────────────────────

/**
 * GET /api/admin/clubs — List all clubs (any status, including proposals)
 */
router.get('/clubs', async (req, res, next) => {
  try {
    const result = await clubService.getClubs(req.user, req.query);
    return sendPaginated(res, {
      data: result.clubs,
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * GET /api/admin/clubs/analytics — Real analytics on clubs, members, and elections
 */
router.get('/clubs/analytics', async (req, res, next) => {
  try {
    const analytics = await clubService.getAdminClubAnalytics(req.user);
    return sendSuccess(res, { data: analytics });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/admin/clubs/:id/approve — Approve club proposal
 */
router.patch('/clubs/:id/approve', async (req, res, next) => {
  try {
    const club = await clubService.approveClub(req.user, req.params.id);
    return sendSuccess(res, { data: club, message: 'Club approved and activated.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/admin/clubs/:id/reject — Reject club proposal
 */
router.patch('/clubs/:id/reject', async (req, res, next) => {
  try {
    const club = await clubService.rejectClub(req.user, req.params.id, req.body);
    return sendSuccess(res, { data: club, message: 'Club proposal rejected.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/admin/clubs/:id/suspend — Suspend club
 */
router.patch('/clubs/:id/suspend', async (req, res, next) => {
  try {
    const club = await clubService.suspendClub(req.user, req.params.id, req.body);
    return sendSuccess(res, { data: club, message: 'Club suspended.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/admin/clubs/:id/archive — Archive club
 */
router.patch('/clubs/:id/archive', async (req, res, next) => {
  try {
    const club = await clubService.archiveClub(req.user, req.params.id);
    return sendSuccess(res, { data: club, message: 'Club archived.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * POST /api/admin/clubs/elections/:id/cancel — Cancel election with administrative intervention
 */
router.post('/clubs/elections/:id/cancel', async (req, res, next) => {
  try {
    const election = await clubService.cancelElection(req.user, req.params.id, req.body);
    return sendSuccess(res, { data: election, message: 'Election cancelled by administrator.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});
module.exports = router;

