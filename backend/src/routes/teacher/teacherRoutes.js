'use strict';

const express = require('express');
const { authenticate }   = require('../../middleware/authenticate');
const { teacherOnly }    = require('../../middleware/authorize');
const { sendSuccess, sendCreated, sendError } = require('../../utils/response');
const { TeacherProfile, Announcement, Question, User, Event, EventRegistration, Department } = require('../../models');

const router = express.Router();

// All teacher routes require authentication + teacher role
router.use(authenticate, teacherOnly);

/** GET /api/teacher/profile */
router.get('/profile', async (req, res, next) => {
  try {
    const profile = await TeacherProfile.findOne({ where: { userId: req.user.id } });
    return sendSuccess(res, { data: profile });
  } catch (err) { next(err); }
});

/** PATCH /api/teacher/profile */
router.patch('/profile', async (req, res, next) => {
  try {
    const allowed = ['fullName', 'bio', 'designation', 'subjects', 'qualifications', 'specializations', 'cabinLocation', 'officeHours', 'department'];
    const updates = {};
    allowed.forEach((key) => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });

    let profile = await TeacherProfile.findOne({ where: { userId: req.user.id } });
    if (!profile) {
      profile = await TeacherProfile.create({ userId: req.user.id, ...updates });
    } else {
      await profile.update(updates);
    }
    return sendSuccess(res, { data: profile, message: 'Profile updated.' });
  } catch (err) { next(err); }
});

/** GET /api/teacher/dashboard */
router.get('/dashboard', async (req, res, next) => {
  try {
    const [profile, myAnnouncements, pendingQuestions] = await Promise.all([
      TeacherProfile.findOne({ where: { userId: req.user.id } }),
      Announcement.findAll({
        where: { authorId: req.user.id },
        order: [['createdAt', 'DESC']],
      }),
      Question.findAll({
        where: { isResolved: false },
        order: [['createdAt', 'DESC']],
        limit: 10,
      }),
    ]);

    return sendSuccess(res, {
      data: {
        profile,
        announcementsCount: myAnnouncements.length,
        announcements: myAnnouncements,
        pendingQuestions,
      },
    });
  } catch (err) { next(err); }
});

/** POST /api/teacher/announcements — create official announcement */
router.post('/announcements', async (req, res, next) => {
  try {
    const { title, content, category, targetDepartment, targetSemester, isPinned } = req.body;
    const announcement = await Announcement.create({
      authorId: req.user.id,
      title,
      content,
      category: category || 'academic',
      targetDepartment,
      targetSemester,
      isPinned: !!isPinned,
      isPublished: true,
      publishedAt: new Date(),
    });
    return sendCreated(res, { data: announcement, message: 'Announcement published.' });
  } catch (err) { next(err); }
});

/** GET /api/teacher/announcements — list teacher's announcements */
router.get('/announcements', async (req, res, next) => {
  try {
    const announcements = await Announcement.findAll({
      where: { authorId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    return sendSuccess(res, { data: announcements });
  } catch (err) { next(err); }
});

/** GET /api/teacher/events — list teacher's organized events */
router.get('/events', async (req, res, next) => {
  try {
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
        { model: Department, as: 'targetDepartment', attributes: ['id', 'name', 'code'] },
      ],
    });

    return sendSuccess(res, {
      data: rows,
      meta: { total: count, page: pageNum, totalPages: Math.ceil(count / pageSize) },
    });
  } catch (err) { next(err); }
});

const resourceService = require('../../services/resourceService');

/** GET /api/teacher/resources — list teacher's own uploaded resources */
router.get('/resources', async (req, res, next) => {
  try {
    const result = await resourceService.getTeacherResources(req.user, req.query);
    return sendSuccess(res, {
      data: result.resources,
      meta: { total: result.total, page: result.page, totalPages: result.totalPages },
    });
  } catch (err) { next(err); }
});

/** GET /api/teacher/resources/stats — teacher's resource statistics */
router.get('/resources/stats', async (req, res, next) => {
  try {
    const stats = await resourceService.getTeacherStats(req.user);
    return sendSuccess(res, { data: stats });
  } catch (err) { next(err); }
});

module.exports = router;
