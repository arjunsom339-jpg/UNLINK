'use strict';

const express = require('express');
const { Op, literal } = require('sequelize');
const { authenticate } = require('../middleware/authenticate');
const { studentOnly } = require('../middleware/authorize');
const { sendSuccess, sendCreated, sendPaginated, sendError } = require('../utils/response');
const {
  Question,
  Answer,
  QuestionVote,
  Poll,
  PollVote,
  Announcement,
  StudentProfile,
  ReputationLog,
  User,
} = require('../models');


const router = express.Router();

// All community routes require authentication + student role
router.use(authenticate, studentOnly);

// ─────────────────────────────────────────────────────────────────────────────
// 1. ANNOUNCEMENTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/community/announcements
 * Returns published announcements, pinned first, with optional category filter.
 */
router.get('/announcements', async (req, res, next) => {
  try {
    const { category } = req.query;
    const where = { isPublished: true };
    if (category && category !== 'all') where.category = category;

    const announcements = await Announcement.findAll({
      where,
      order: [['isPinned', 'DESC'], ['publishedAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'email', 'role'],
          include: [
            {
              model: StudentProfile,
              as: 'studentProfile',
              attributes: ['fullName', 'profilePhoto'],
              required: false,
            },
          ],
        },
      ],
    });

    return sendSuccess(res, { data: announcements });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Q&A DISCUSSIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/community/questions
 * Paginated list of questions with filters and user's vote status.
 */
router.get('/questions', async (req, res, next) => {
  try {
    const page    = parseInt(req.query.page, 10) || 1;
    const limit   = parseInt(req.query.limit, 10) || 15;
    const offset  = (page - 1) * limit;
    const { subject, tag, resolved, sort = 'newest' } = req.query;

    const where = {};
    if (subject) where.subject = { [Op.iLike]: `%${subject}%` };
    if (resolved === 'true')  where.isResolved = true;
    if (resolved === 'false') where.isResolved = false;
    if (tag) where.tags = { [Op.contains]: [tag] };

    const order = sort === 'votes' ? [['voteCount', 'DESC']] : [['createdAt', 'DESC']];

    const { count, rows: questions } = await Question.findAndCountAll({
      where,
      order,
      limit,
      offset,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'email'],
          include: [
            {
              model: StudentProfile,
              as: 'studentProfile',
              attributes: ['fullName', 'department', 'semester', 'profilePhoto'],
              required: false,
            },
          ],
        },
      ],
    });

    // Fetch voter status for current user in one query
    const questionIds = questions.map((q) => q.id);
    const userVotes = questionIds.length > 0
      ? await QuestionVote.findAll({
          where: { questionId: { [Op.in]: questionIds }, userId: req.user.id },
          attributes: ['questionId'],
        })
      : [];
    const votedSet = new Set(userVotes.map((v) => v.questionId));

    const data = questions.map((q) => ({
      ...q.toJSON(),
      hasVoted: votedSet.has(q.id),
    }));

    return sendPaginated(res, { data, page, limit, total: count });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/community/questions
 * Post a new academic question.
 */
router.post('/questions', async (req, res, next) => {
  try {
    const { title, body, subject, tags, semester } = req.body;
    if (!title?.trim() || !body?.trim()) {
      return sendError(res, { statusCode: 400, message: 'Question title and body are required.' });
    }

    const question = await Question.create({
      authorId: req.user.id,
      title: title.trim(),
      body:  body.trim(),
      subject: subject?.trim() || null,
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : []),
      semester: semester || null,
    });

    // Re-fetch with author info
    const full = await Question.findByPk(question.id, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'email'],
        include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName', 'department', 'semester', 'profilePhoto'], required: false }],
      }],
    });

    return sendCreated(res, { data: { ...full.toJSON(), hasVoted: false }, message: 'Question posted to campus community!' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/community/questions/:id/vote
 * Toggle upvote on a question. Cannot vote on own question.
 */
router.post('/questions/:id/vote', async (req, res, next) => {
  try {
    const question = await Question.findByPk(req.params.id);
    if (!question) return sendError(res, { statusCode: 404, message: 'Question not found.' });

    if (question.authorId === req.user.id) {
      return sendError(res, { statusCode: 400, message: 'You cannot vote on your own question.' });
    }

    const existing = await QuestionVote.findOne({
      where: { questionId: question.id, userId: req.user.id },
    });

    if (existing) {
      // Toggle: remove vote
      await existing.destroy();
      await question.decrement('voteCount');
      return sendSuccess(res, { data: { voted: false, voteCount: question.voteCount - 1 }, message: 'Vote removed.' });
    }

    // Add vote
    await QuestionVote.create({ questionId: question.id, userId: req.user.id });
    await question.increment('voteCount');
    return sendSuccess(res, { data: { voted: true, voteCount: question.voteCount + 1 }, message: 'Upvoted!' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/community/questions/:id/answers
 * Get all answers for a specific question, accepted answer first.
 */
router.get('/questions/:id/answers', async (req, res, next) => {
  try {
    const question = await Question.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'email'],
        include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName', 'department', 'semester', 'profilePhoto'], required: false }],
      }],
    });
    if (!question) return sendError(res, { statusCode: 404, message: 'Question not found.' });

    // Increment view count
    await question.increment('viewCount');

    const answers = await Answer.findAll({
      where: { questionId: req.params.id },
      order: [['isAccepted', 'DESC'], ['voteCount', 'DESC'], ['createdAt', 'ASC']],
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'email'],
        include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName', 'department', 'semester', 'profilePhoto'], required: false }],
      }],
    });

    return sendSuccess(res, { data: { question, answers } });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/community/questions/:id/answers
 * Post an answer to a question.
 */
router.post('/questions/:id/answers', async (req, res, next) => {
  try {
    const question = await Question.findByPk(req.params.id);
    if (!question) return sendError(res, { statusCode: 404, message: 'Question not found.' });

    const { body } = req.body;
    if (!body?.trim()) {
      return sendError(res, { statusCode: 400, message: 'Answer body is required.' });
    }

    const answer = await Answer.create({
      questionId: question.id,
      authorId: req.user.id,
      body: body.trim(),
    });

    // Increment answer count on question
    await question.increment('answerCount');

    // Reputation: +10 for posting an answer (self-awarded cannot happen since author differs)
    try {
      await ReputationLog.create({
        userId: req.user.id,
        points: 10,
        actionType: 'answer_posted',
        reason: `Answered: "${question.title.slice(0, 60)}"`,
        sourceId: answer.id,
        actorId: req.user.id,
      });
      await StudentProfile.increment('reputationScore', { by: 10, where: { userId: req.user.id } });
    } catch (logErr) {
      console.error('[Reputation] Failed to log answer reputation:', logErr.message);
    }

    // Re-fetch with author
    const full = await Answer.findByPk(answer.id, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'email'],
        include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName', 'department', 'semester', 'profilePhoto'], required: false }],
      }],
    });

    return sendCreated(res, { data: full, message: 'Answer posted! +10 reputation points.' });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/community/questions/:qId/answers/:aId/accept
 * Mark an answer as accepted. Only the question author can do this.
 */
router.patch('/questions/:qId/answers/:aId/accept', async (req, res, next) => {
  try {
    const question = await Question.findByPk(req.params.qId);
    if (!question) return sendError(res, { statusCode: 404, message: 'Question not found.' });

    if (question.authorId !== req.user.id) {
      return sendError(res, { statusCode: 403, message: 'Only the question author can accept an answer.' });
    }

    const answer = await Answer.findByPk(req.params.aId);
    if (!answer || answer.questionId !== question.id) {
      return sendError(res, { statusCode: 404, message: 'Answer not found for this question.' });
    }

    // Unaccept any previously accepted answer
    await Answer.update({ isAccepted: false }, { where: { questionId: question.id } });

    await answer.update({ isAccepted: true });
    await question.update({ isResolved: true, acceptedAnswerId: answer.id });

    // +25 reputation for the answer author
    if (answer.authorId !== req.user.id) {
      try {
        await ReputationLog.create({
          userId: answer.authorId,
          points: 25,
          actionType: 'answer_accepted',
          reason: `Best answer accepted for: "${question.title.slice(0, 60)}"`,
          sourceId: answer.id,
          actorId: req.user.id,
        });
        await StudentProfile.increment('reputationScore', { by: 25, where: { userId: answer.authorId } });
        await StudentProfile.increment('helpfulAnswersCount', { by: 1, where: { userId: answer.authorId } });
      } catch (logErr) {
        console.error('[Reputation] Failed to log accepted-answer reputation:', logErr.message);
      }
    }

    return sendSuccess(res, { data: answer, message: 'Answer marked as accepted. Question resolved!' });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. CAMPUS POLLS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/community/polls
 * Returns all active polls with the current user's vote status.
 */
router.get('/polls', async (req, res, next) => {
  try {
    const polls = await Poll.findAll({
      where: { isActive: true },
      order: [['createdAt', 'DESC']],
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'email', 'role'],
        include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName'], required: false }],
      }],
    });

    // Get all user votes in one batch query
    const pollIds = polls.map((p) => p.id);
    const userVotes = pollIds.length > 0
      ? await PollVote.findAll({
          where: { pollId: { [Op.in]: pollIds }, userId: req.user.id },
          attributes: ['pollId', 'optionIndex'],
        })
      : [];

    const voteMap = {};
    userVotes.forEach((v) => { voteMap[v.pollId] = v.optionIndex; });

    const data = polls.map((p) => ({
      ...p.toJSON(),
      votedIndex: voteMap[p.id] !== undefined ? voteMap[p.id] : null,
    }));

    return sendSuccess(res, { data });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/community/polls
 * Create a new campus poll (any student can propose).
 */
router.post('/polls', async (req, res, next) => {
  try {
    const { question, options, expiresAt, targetAudience, targetDepartment } = req.body;

    if (!question?.trim()) {
      return sendError(res, { statusCode: 400, message: 'Poll question is required.' });
    }
    if (!Array.isArray(options) || options.length < 2) {
      return sendError(res, { statusCode: 400, message: 'At least 2 options are required.' });
    }

    const formattedOptions = options.map((opt) => ({
      text: typeof opt === 'string' ? opt.trim() : opt.text?.trim() || '',
      votes: 0,
    })).filter((o) => o.text);

    if (formattedOptions.length < 2) {
      return sendError(res, { statusCode: 400, message: 'At least 2 non-empty options are required.' });
    }

    const poll = await Poll.create({
      authorId: req.user.id,
      question: question.trim(),
      options: formattedOptions,
      totalVotes: 0,
      isActive: true,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      targetAudience: targetAudience || 'all',
      targetDepartment: targetDepartment || null,
    });

    return sendCreated(res, {
      data: { ...poll.toJSON(), votedIndex: null },
      message: 'Poll created and published!',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/community/polls/:id/vote
 * Cast a vote on a poll option. One vote per user enforced by DB unique constraint.
 */
router.post('/polls/:id/vote', async (req, res, next) => {
  try {
    const poll = await Poll.findByPk(req.params.id);
    if (!poll) return sendError(res, { statusCode: 404, message: 'Poll not found.' });
    if (!poll.isActive) return sendError(res, { statusCode: 400, message: 'This poll is no longer active.' });
    if (poll.expiresAt && new Date() > poll.expiresAt) {
      return sendError(res, { statusCode: 400, message: 'This poll has expired.' });
    }

    const { optionIndex } = req.body;
    if (typeof optionIndex !== 'number' || optionIndex < 0 || optionIndex >= poll.options.length) {
      return sendError(res, { statusCode: 400, message: 'Invalid option index.' });
    }

    // Check for existing vote (also enforced at DB level)
    const existing = await PollVote.findOne({ where: { pollId: poll.id, userId: req.user.id } });
    if (existing) {
      return sendError(res, { statusCode: 409, message: 'You have already voted in this poll.' });
    }

    await PollVote.create({ pollId: poll.id, userId: req.user.id, optionIndex });

    // Atomically update the options array and totalVotes
    const updatedOptions = poll.options.map((opt, i) =>
      i === optionIndex ? { ...opt, votes: opt.votes + 1 } : opt
    );
    const newTotal = poll.totalVotes + 1;
    await poll.update({ options: updatedOptions, totalVotes: newTotal });

    return sendSuccess(res, {
      data: { ...poll.toJSON(), options: updatedOptions, totalVotes: newTotal, votedIndex: optionIndex },
      message: 'Vote recorded!',
    });
  } catch (err) {
    // Handle DB-level unique constraint violation
    if (err.name === 'SequelizeUniqueConstraintError') {
      return sendError(res, { statusCode: 409, message: 'You have already voted in this poll.' });
    }
    next(err);
  }
});

module.exports = router;
