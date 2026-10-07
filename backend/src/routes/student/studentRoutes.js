'use strict';

const express = require('express');
const { Op } = require('sequelize');
const { authenticate } = require('../../middleware/authenticate');
const { studentOnly } = require('../../middleware/authorize');
const { sendSuccess, sendCreated, sendPaginated, sendError } = require('../../utils/response');
const {
  StudentProfile,
  User,
  Announcement,
  HelpRequest,
  Question,
  Skill,
  StudentSkill,
  Project,
  ProjectMember,
  Hackathon,
  HackathonMember,
  ReputationLog,
  Block,
  Report,
} = require('../../models');

const skillService = require('../../services/skillService');
const connectionService = require('../../services/connectionService');
const matchingService = require('../../services/matchingService');
const privacyService = require('../../services/privacyService');

const router = express.Router();

// All student routes strictly require authentication + student role
router.use(authenticate, studentOnly);

// ─────────────────────────────────────────────────────────────────────────────
// 1. PROFILE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/student/profile — Get authenticated student's full profile
 */
router.get('/profile', async (req, res, next) => {
  try {
    let profile = await StudentProfile.findOne({
      where: { userId: req.user.id },
      include: [
        {
          model: StudentSkill,
          as: 'studentSkills',
          include: [{ model: Skill, as: 'skill' }],
        },
      ],
    });

    if (!profile) {
      return sendError(res, { statusCode: 404, message: 'Student profile not found.' });
    }

    return sendSuccess(res, { data: profile });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/student/profile — Update allowed student profile fields
 * Rejects or ignores tampering with USN, college, department, and gamification counters.
 */
router.patch('/profile', async (req, res, next) => {
  try {
    // Strictly forbidden fields for student self-edit
    const forbiddenFields = ['usn', 'college', 'department', 'collegeId', 'departmentId', 'isAdminVerified', 'reputationScore', 'helpfulAnswersCount', 'connectionsCount', 'studentsHelpedCount'];
    for (const field of forbiddenFields) {
      if (req.body[field] !== undefined && field === 'usn') {
        return sendError(res, {
          statusCode: 403,
          message: 'Academic identity fields (such as USN and College Department) are verified and cannot be edited by the student.',
        });
      }
    }

    const allowedFields = [
      'fullName',
      'bio',
      'profilePhoto',
      'semester',
      'interests',
      'skillsKnown',
      'skillsWanted',
      'projects',
      'achievements',
      'hackathons',
      'certifications',
      'preferredLearningAreas',
      'availability',
      'profileVisibility',
      'showPhone',
      'showLocation',
      'phone',
    ];

    const updates = {};
    allowedFields.forEach((key) => {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    });

    let profile = await StudentProfile.findOne({ where: { userId: req.user.id } });
    if (!profile) {
      profile = await StudentProfile.create({ userId: req.user.id, ...updates });
    } else {
      await profile.update(updates);
    }

    // Refresh with studentSkills
    const freshProfile = await StudentProfile.findOne({
      where: { id: profile.id },
      include: [
        {
          model: StudentSkill,
          as: 'studentSkills',
          include: [{ model: Skill, as: 'skill' }],
        },
      ],
    });

    return sendSuccess(res, { data: freshProfile, message: 'Profile updated successfully.' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/student/profile/:id — View another student's profile with privacy rules enforced
 */
router.get('/profile/:id', async (req, res, next) => {
  try {
    const targetIdentifier = req.params.id;
    // Check by profile id or user id
    const profile = await StudentProfile.findOne({
      where: {
        [Op.or]: [{ id: targetIdentifier }, { userId: targetIdentifier }],
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'accountStatus'],
        },
        {
          model: StudentSkill,
          as: 'studentSkills',
          include: [{ model: Skill, as: 'skill' }],
        },
      ],
    });

    if (!profile) {
      return sendError(res, { statusCode: 404, message: 'Student profile not found.' });
    }

    const sanitized = await privacyService.sanitizeStudentProfile(profile, req.user);
    return sendSuccess(res, { data: sanitized });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. SKILLS MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/student/skills — Get current student's skills
 */
router.get('/skills', async (req, res, next) => {
  try {
    const profile = await StudentProfile.findOne({ where: { userId: req.user.id } });
    if (!profile) {
      return sendError(res, { statusCode: 404, message: 'Student profile not found.' });
    }

    const skills = await skillService.getStudentSkills(profile.id);
    return sendSuccess(res, { data: skills });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/student/skills — Add a skill with proficiency and type
 */
router.post('/skills', async (req, res, next) => {
  try {
    const profile = await StudentProfile.findOne({ where: { userId: req.user.id } });
    if (!profile) {
      return sendError(res, { statusCode: 404, message: 'Student profile not found.' });
    }

    const { skillName, skillType, proficiency, canTeach, category } = req.body;
    const result = await skillService.addStudentSkill(profile.id, {
      skillName,
      skillType,
      proficiency,
      canTeach,
      category,
    });

    return sendCreated(res, {
      data: result,
      message: result.isNew ? 'Skill added to profile.' : 'Skill updated successfully.',
    });
  } catch (err) {
    return sendError(res, { statusCode: 400, message: err.message });
  }
});

/**
 * DELETE /api/student/skills/:id — Remove a skill from student profile
 */
router.delete('/skills/:id', async (req, res, next) => {
  try {
    const profile = await StudentProfile.findOne({ where: { userId: req.user.id } });
    if (!profile) {
      return sendError(res, { statusCode: 404, message: 'Student profile not found.' });
    }

    await skillService.removeStudentSkill(profile.id, req.params.id);
    return sendSuccess(res, { message: 'Skill removed successfully.' });
  } catch (err) {
    return sendError(res, { statusCode: 400, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. LEARN & CONNECT DISCOVERY & MATCHING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/student/learn-connect/dashboard — Consolidated Learn & Connect Hub
 */
router.get('/learn-connect/dashboard', async (req, res, next) => {
  try {
    const [profile, exchangeMatches, learnFromMatches, connectionCounts] = await Promise.all([
      StudentProfile.findOne({
        where: { userId: req.user.id },
        include: [{ model: StudentSkill, as: 'studentSkills', include: [{ model: Skill, as: 'skill' }] }],
      }),
      matchingService.getSkillExchangeMatches(req.user, 6),
      matchingService.findPeopleToLearnFrom(req.user, '', 1, 6),
      connectionService.getPendingRequests(req.user.id),
    ]);

    return sendSuccess(res, {
      data: {
        profile,
        exchangeMatches,
        learnFromMatches: learnFromMatches.matches,
        pendingReceivedCount: connectionCounts.received.length,
        pendingSentCount: connectionCounts.sent.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/student/learn-connect/discover — Paginated student search with filters
 */
router.get('/learn-connect/discover', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 12;
    const filters = {
      skill: req.query.skill,
      department: req.query.department,
      semester: req.query.semester,
      proficiency: req.query.proficiency,
      interest: req.query.interest,
      query: req.query.q || req.query.query,
    };

    const data = await matchingService.discoverStudents(req.user, filters, page, limit);
    return sendPaginated(res, { data: data.students, page, limit, total: data.total });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/student/learn-connect/learn-from — Find students who can teach target skills
 */
router.get('/learn-connect/learn-from', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const targetSkill = req.query.skill || '';

    const data = await matchingService.findPeopleToLearnFrom(req.user, targetSkill, page, limit);
    return sendPaginated(res, { data: data.matches, page, limit, total: data.total });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/student/learn-connect/matches — Reciprocal skill exchange matches
 */
router.get('/learn-connect/matches', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 12;
    const matches = await matchingService.getSkillExchangeMatches(req.user, limit);
    return sendSuccess(res, { data: matches });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. PROJECT COLLABORATION FOUNDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/student/projects — List collaborative projects
 */
router.get('/projects', async (req, res, next) => {
  try {
    const { category, status = 'open' } = req.query;
    const where = {};
    if (status && status !== 'all') where.status = status;
    if (category && category !== 'all') where.category = category;

    const projects = await Project.findAll({
      where,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'email'],
          include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName', 'department', 'semester', 'profilePhoto'] }],
        },
        {
          model: ProjectMember,
          as: 'members',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'email'],
              include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName', 'department', 'semester', 'profilePhoto'] }],
            },
          ],
        },
      ],
    });

    return sendSuccess(res, { data: projects });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/student/projects — Create a project collaboration opportunity
 */
router.post('/projects', async (req, res, next) => {
  try {
    const { title, description, requiredSkills, teammatesRequired, category, deadline, githubUrl } = req.body;

    if (!title || !description) {
      return sendError(res, { statusCode: 400, message: 'Project title and description are required.' });
    }

    const project = await Project.create({
      creatorId: req.user.id,
      collegeId: req.user.collegeId,
      title,
      description,
      requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : [],
      teammatesRequired: teammatesRequired || 2,
      currentTeamSize: 1,
      category: category || 'Web & Mobile',
      deadline: deadline ? new Date(deadline) : null,
      githubUrl: githubUrl || null,
      status: 'open',
    });

    // Add creator as Team Lead in project members
    await ProjectMember.create({
      projectId: project.id,
      userId: req.user.id,
      role: 'Lead',
      status: 'accepted',
    });

    return sendCreated(res, { data: project, message: 'Project collaboration opportunity published.' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/student/projects/:id/join — Express interest or request to join a project
 */
router.post('/projects/:id/join', async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return sendError(res, { statusCode: 404, message: 'Project not found.' });
    }

    if (project.creatorId === req.user.id) {
      return sendError(res, { statusCode: 400, message: 'You are the creator of this project.' });
    }

    const existing = await ProjectMember.findOne({
      where: { projectId: project.id, userId: req.user.id },
    });

    if (existing) {
      return sendError(res, { statusCode: 409, message: `You have already requested to join (Status: ${existing.status}).` });
    }

    const member = await ProjectMember.create({
      projectId: project.id,
      userId: req.user.id,
      role: req.body.role || 'Contributor',
      message: req.body.message || '',
      status: 'pending',
    });

    return sendCreated(res, { data: member, message: 'Join request submitted to project creator.' });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. HACKATHON TEAM FOUNDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/student/hackathons — List hackathon team listings
 */
router.get('/hackathons', async (req, res, next) => {
  try {
    const { status = 'open' } = req.query;
    const where = {};
    if (status && status !== 'all') where.status = status;

    const hackathons = await Hackathon.findAll({
      where,
      order: [['eventDate', 'ASC'], ['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'email'],
          include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName', 'department', 'semester', 'profilePhoto'] }],
        },
        {
          model: HackathonMember,
          as: 'members',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'email'],
              include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName', 'department', 'semester', 'profilePhoto'] }],
            },
          ],
        },
      ],
    });

    return sendSuccess(res, { data: hackathons });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/student/hackathons — Create a hackathon team recruit listing
 */
router.post('/hackathons', async (req, res, next) => {
  try {
    const { title, description, requiredSkills, teamSize, lookingFor, eventDate, registrationDeadline } = req.body;

    if (!title || !description) {
      return sendError(res, { statusCode: 400, message: 'Hackathon team title and description are required.' });
    }

    const hackathon = await Hackathon.create({
      creatorId: req.user.id,
      collegeId: req.user.collegeId,
      title,
      description,
      requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : [],
      teamSize: teamSize || 4,
      currentMembersCount: 1,
      lookingFor: lookingFor || 'Full-stack & AI teammates',
      eventDate: eventDate ? new Date(eventDate) : null,
      registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
      status: 'open',
    });

    // Add creator as Lead member
    await HackathonMember.create({
      hackathonId: hackathon.id,
      userId: req.user.id,
      role: 'Team Lead',
      status: 'accepted',
    });

    return sendCreated(res, { data: hackathon, message: 'Hackathon team recruitment published.' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/student/hackathons/:id/join — Request to join hackathon team
 */
router.post('/hackathons/:id/join', async (req, res, next) => {
  try {
    const hackathon = await Hackathon.findByPk(req.params.id);
    if (!hackathon) {
      return sendError(res, { statusCode: 404, message: 'Hackathon listing not found.' });
    }

    if (hackathon.creatorId === req.user.id) {
      return sendError(res, { statusCode: 400, message: 'You are the creator of this hackathon team.' });
    }

    const existing = await HackathonMember.findOne({
      where: { hackathonId: hackathon.id, userId: req.user.id },
    });

    if (existing) {
      return sendError(res, { statusCode: 409, message: `You have already requested to join (Status: ${existing.status}).` });
    }

    const member = await HackathonMember.create({
      hackathonId: hackathon.id,
      userId: req.user.id,
      role: req.body.role || 'Teammate',
      message: req.body.message || '',
      status: 'pending',
    });

    return sendCreated(res, { data: member, message: 'Request sent to hackathon team lead.' });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5b. PROJECT & HACKATHON MEMBER MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PATCH /api/student/projects/:id/members/:memberId/accept — Accept a join request
 */
router.patch('/projects/:id/members/:memberId/accept', async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return sendError(res, { statusCode: 404, message: 'Project not found.' });
    if (project.creatorId !== req.user.id) {
      return sendError(res, { statusCode: 403, message: 'Only the project creator can manage members.' });
    }

    const member = await ProjectMember.findByPk(req.params.memberId);
    if (!member || member.projectId !== project.id) {
      return sendError(res, { statusCode: 404, message: 'Member request not found.' });
    }
    if (member.status !== 'pending') {
      return sendError(res, { statusCode: 400, message: `Request is already ${member.status}.` });
    }

    await member.update({ status: 'accepted' });
    await project.increment('currentTeamSize');
    return sendSuccess(res, { data: member, message: 'Team member accepted!' });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/student/projects/:id/members/:memberId/reject — Reject a join request
 */
router.patch('/projects/:id/members/:memberId/reject', async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return sendError(res, { statusCode: 404, message: 'Project not found.' });
    if (project.creatorId !== req.user.id) {
      return sendError(res, { statusCode: 403, message: 'Only the project creator can manage members.' });
    }

    const member = await ProjectMember.findByPk(req.params.memberId);
    if (!member || member.projectId !== project.id) {
      return sendError(res, { statusCode: 404, message: 'Member request not found.' });
    }
    if (member.status !== 'pending') {
      return sendError(res, { statusCode: 400, message: `Request is already ${member.status}.` });
    }

    await member.update({ status: 'rejected' });
    return sendSuccess(res, { data: member, message: 'Join request declined.' });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/student/hackathons/:id/members/:memberId/accept — Accept hackathon join
 */
router.patch('/hackathons/:id/members/:memberId/accept', async (req, res, next) => {
  try {
    const hackathon = await Hackathon.findByPk(req.params.id);
    if (!hackathon) return sendError(res, { statusCode: 404, message: 'Hackathon listing not found.' });
    if (hackathon.creatorId !== req.user.id) {
      return sendError(res, { statusCode: 403, message: 'Only the team lead can manage members.' });
    }

    const member = await HackathonMember.findByPk(req.params.memberId);
    if (!member || member.hackathonId !== hackathon.id) {
      return sendError(res, { statusCode: 404, message: 'Member request not found.' });
    }
    if (member.status !== 'pending') {
      return sendError(res, { statusCode: 400, message: `Request is already ${member.status}.` });
    }

    await member.update({ status: 'accepted' });
    await hackathon.increment('currentMembersCount');
    return sendSuccess(res, { data: member, message: 'Team member accepted!' });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/student/hackathons/:id/members/:memberId/reject — Reject hackathon join
 */
router.patch('/hackathons/:id/members/:memberId/reject', async (req, res, next) => {
  try {
    const hackathon = await Hackathon.findByPk(req.params.id);
    if (!hackathon) return sendError(res, { statusCode: 404, message: 'Hackathon listing not found.' });
    if (hackathon.creatorId !== req.user.id) {
      return sendError(res, { statusCode: 403, message: 'Only the team lead can manage members.' });
    }

    const member = await HackathonMember.findByPk(req.params.memberId);
    if (!member || member.hackathonId !== hackathon.id) {
      return sendError(res, { statusCode: 404, message: 'Member request not found.' });
    }
    if (member.status !== 'pending') {
      return sendError(res, { statusCode: 400, message: `Request is already ${member.status}.` });
    }

    await member.update({ status: 'rejected' });
    return sendSuccess(res, { data: member, message: 'Join request declined.' });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. REPUTATION FOUNDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/student/reputation — View reputation breakdown and audit logs
 */
router.get('/reputation', async (req, res, next) => {
  try {
    const profile = await StudentProfile.findOne({ where: { userId: req.user.id } });
    const logs = await ReputationLog.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 20,
    });

    return sendSuccess(res, {
      data: {
        score: profile?.reputationScore || 0,
        helpfulAnswersCount: profile?.helpfulAnswersCount || 0,
        studentsHelpedCount: profile?.studentsHelpedCount || 0,
        logs,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. DASHBOARD & EXISTING ACADEMIC / HELP ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/student/dashboard — basic dashboard data */
router.get('/dashboard', async (req, res, next) => {
  try {
    const [profile, recentAnnouncements, activeHelpRequests, recentQuestions] = await Promise.all([
      StudentProfile.findOne({
        where: { userId: req.user.id },
        include: [{ model: StudentSkill, as: 'studentSkills', include: [{ model: Skill, as: 'skill' }] }],
      }),
      Announcement.findAll({
        where: { isPublished: true },
        order: [['isPinned', 'DESC'], ['publishedAt', 'DESC']],
        limit: 5,
      }),
      HelpRequest.findAll({
        where: { status: { [Op.in]: ['pending', 'accepted', 'active'] } },
        order: [['urgencyLevel', 'DESC'], ['createdAt', 'DESC']],
        limit: 5,
      }),
      Question.findAll({
        order: [['createdAt', 'DESC']],
        limit: 5,
      }),
    ]);

    return sendSuccess(res, {
      data: {
        profile,
        announcements: recentAnnouncements,
        helpRequests: activeHelpRequests,
        questions: recentQuestions,
      },
    });
  } catch (err) {
    next(err);
  }
});

/** GET /api/student/announcements — get all campus announcements */
router.get('/announcements', async (req, res, next) => {
  try {
    const { category } = req.query;
    const where = { isPublished: true };
    if (category && category !== 'all') where.category = category;

    const announcements = await Announcement.findAll({
      where,
      order: [['isPinned', 'DESC'], ['publishedAt', 'DESC']],
      include: [{ model: User, as: 'author', attributes: ['id', 'email', 'role'] }],
    });
    return sendSuccess(res, { data: announcements });
  } catch (err) {
    next(err);
  }
});

/** GET /api/student/help-requests — get active help & emergency requests */
router.get('/help-requests', async (req, res, next) => {
  try {
    const requests = await HelpRequest.findAll({
      order: [['urgencyLevel', 'DESC'], ['createdAt', 'DESC']],
      include: [{ model: User, as: 'requester', attributes: ['id', 'email'] }],
    });
    return sendSuccess(res, { data: requests });
  } catch (err) {
    next(err);
  }
});

/** POST /api/student/help-requests — create help request */
router.post('/help-requests', async (req, res, next) => {
  try {
    const { category, title, description, urgencyLevel, locationLabel, isAnonymous } = req.body;
    const helpRequest = await HelpRequest.create({
      requesterId: req.user.id,
      category: category || 'campus_assistance',
      title,
      description,
      urgencyLevel: urgencyLevel || 'medium',
      locationLabel: locationLabel || 'Campus',
      isAnonymous: !!isAnonymous,
      status: 'pending',
    });
    return sendCreated(res, { data: helpRequest, message: 'Help request created.' });
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/student/help-requests/:id/respond — volunteer or resolve */
router.patch('/help-requests/:id/respond', async (req, res, next) => {
  try {
    const { action } = req.body;
    const request = await HelpRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });

    if (action === 'volunteer') {
      await request.update({ status: 'accepted' });
      return sendSuccess(res, { data: request, message: 'You have volunteered to assist.' });
    } else if (action === 'resolve') {
      await request.update({ status: 'resolved', resolvedAt: new Date(), resolvedById: req.user.id });
      // Award reputation points for student helper (+15 points)
      try {
        await ReputationLog.create({
          userId: req.user.id,
          points: 15,
          actionType: 'community_help',
          reason: `Resolved emergency/help request: "${request.title.slice(0, 50)}"`,
          sourceId: request.id,
          actorId: request.requesterId,
        });
        await StudentProfile.increment('reputationScore', { by: 15, where: { userId: req.user.id } });
        await StudentProfile.increment('studentsHelpedCount', { by: 1, where: { userId: req.user.id } });
      } catch (logErr) {
        console.error('Reputation logging error:', logErr.message);
      }
      return sendSuccess(res, { data: request, message: 'Request marked as resolved and reputation points awarded!' });
    }

    return res.status(400).json({ success: false, message: 'Invalid action.' });
  } catch (err) {
    next(err);
  }
});

/** GET /api/student/questions — list academic questions */
router.get('/questions', async (req, res, next) => {
  try {
    const { subject } = req.query;
    const where = {};
    if (subject) where.subject = subject;

    const questions = await Question.findAll({
      where,
      order: [['createdAt', 'DESC']],
      include: [{ model: User, as: 'author', attributes: ['id', 'email'] }],
    });
    return sendSuccess(res, { data: questions });
  } catch (err) {
    next(err);
  }
});

/** POST /api/student/questions — ask a question */
router.post('/questions', async (req, res, next) => {
  try {
    const { title, body, subject, tags, semester } = req.body;
    const question = await Question.create({
      authorId: req.user.id,
      title,
      body,
      subject,
      tags: tags || [],
      semester,
    });
    return sendCreated(res, { data: question, message: 'Question posted successfully.' });
  } catch (err) {
    next(err);
  }
});

/** GET /api/student/peers — list student directory */
router.get('/peers', async (req, res, next) => {
  try {
    const blocks = await Block.findAll({
      where: {
        [Op.or]: [{ blockerId: req.user.id }, { blockedId: req.user.id }],
      },
      attributes: ['blockerId', 'blockedId'],
    });
    const excludedIds = [req.user.id];
    blocks.forEach((b) => {
      excludedIds.push(b.blockerId === req.user.id ? b.blockedId : b.blockerId);
    });

    const peers = await StudentProfile.findAll({
      where: {
        userId: { [Op.notIn]: excludedIds },
        profileVisibility: { [Op.in]: ['campus', 'public'] },
      },
      limit: 50,
      include: [{ model: User, as: 'user', attributes: ['id', 'email', 'accountStatus'] }],
    });
    return sendSuccess(res, { data: peers });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. BLOCKING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/student/blocks — Block another student
 */
router.post('/blocks', async (req, res, next) => {
  try {
    const { userId, reason } = req.body;
    if (!userId) return sendError(res, { statusCode: 400, message: 'User ID to block is required.' });
    if (userId === req.user.id) return sendError(res, { statusCode: 400, message: 'You cannot block yourself.' });

    const targetUser = await User.findOne({ where: { id: userId, role: 'student' } });
    if (!targetUser) return sendError(res, { statusCode: 404, message: 'Student not found.' });

    const existing = await Block.findOne({ where: { blockerId: req.user.id, blockedId: userId } });
    if (existing) return sendError(res, { statusCode: 409, message: 'User is already blocked.' });

    const block = await Block.create({
      blockerId: req.user.id,
      blockedId: userId,
      reason: reason ? reason.trim().slice(0, 255) : null,
    });

    return sendCreated(res, { data: block, message: 'User blocked successfully.' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/student/blocks/:userId — Unblock a student
 */
router.delete('/blocks/:userId', async (req, res, next) => {
  try {
    const block = await Block.findOne({
      where: { blockerId: req.user.id, blockedId: req.params.userId },
    });
    if (!block) return sendError(res, { statusCode: 404, message: 'Block record not found.' });

    await block.destroy();
    return sendSuccess(res, { message: 'User unblocked successfully.' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/student/blocks — List blocked students
 */
router.get('/blocks', async (req, res, next) => {
  try {
    const blocks = await Block.findAll({
      where: { blockerId: req.user.id },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'blockedUser',
          attributes: ['id', 'email'],
          include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName', 'department', 'profilePhoto'] }],
        },
      ],
    });
    return sendSuccess(res, { data: blocks });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. REPORTING
// ─────────────────────────────────────────────────────────────────────────────

const REPORT_CATEGORIES = ['spam', 'harassment', 'fake_profile', 'inappropriate_content', 'misuse', 'other'];

/**
 * POST /api/student/reports — Report a student profile or behavior
 */
router.post('/reports', async (req, res, next) => {
  try {
    const { userId, category, description } = req.body;
    if (!userId) return sendError(res, { statusCode: 400, message: 'User ID to report is required.' });
    if (userId === req.user.id) return sendError(res, { statusCode: 400, message: 'You cannot report yourself.' });
    if (!category || !REPORT_CATEGORIES.includes(category)) {
      return sendError(res, { statusCode: 400, message: `Category must be one of: ${REPORT_CATEGORIES.join(', ')}` });
    }

    const targetUser = await User.findByPk(userId);
    if (!targetUser) return sendError(res, { statusCode: 404, message: 'User not found.' });

    // Prevent duplicate pending reports from same reporter for same user
    const existingPending = await Report.findOne({
      where: { reporterId: req.user.id, reportedUserId: userId, status: 'pending' },
    });
    if (existingPending) {
      return sendError(res, { statusCode: 409, message: 'You already have a pending report for this user.' });
    }

    const report = await Report.create({
      reporterId: req.user.id,
      reportedUserId: userId,
      category,
      description: description ? description.trim().slice(0, 1000) : null,
      status: 'pending',
    });

    return sendCreated(res, { data: { id: report.id, category: report.category, status: report.status }, message: 'Report submitted. Our moderation team will review it.' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/student/mentorships — Get mentorships sent/participating as a student
 */
router.get('/mentorships', async (req, res, next) => {
  try {
    const alumniService = require('../../services/alumniService');
    const result = await alumniService.getUserMentorships(req.user, {
      role: 'student',
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit,
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

module.exports = router;
