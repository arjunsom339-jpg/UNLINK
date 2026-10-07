'use strict';

const express = require('express');
const { authenticate } = require('../middleware/authenticate');
const { sendSuccess, sendCreated, sendError, sendPaginated } = require('../utils/response');
const clubService = require('../services/clubService');

const router = express.Router();

// All club routes require authenticated user session
router.use(authenticate);

// ── 1. CLUB DISCOVERY & MY CLUBS ─────────────────────────────────────────────

/**
 * GET /api/clubs/my — Authenticated user's active/pending club memberships
 */
router.get('/my', async (req, res, next) => {
  try {
    const clubs = await clubService.getMyClubs(req.user);
    return sendSuccess(res, { data: clubs });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * GET /api/clubs — List / discover clubs in user's college
 */
router.get('/', async (req, res, next) => {
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
 * GET /api/clubs/:id — Get club details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const club = await clubService.getClubById(req.user, req.params.id);
    return sendSuccess(res, { data: club });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * POST /api/clubs — Submit club proposal or create club
 */
router.post('/', async (req, res, next) => {
  try {
    const club = await clubService.createClub(req.user, req.body);
    return sendCreated(res, {
      data: club,
      message: req.user.role === 'admin'
        ? 'Club created successfully and is now active.'
        : 'Club proposal submitted successfully for administrator review.',
    });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/clubs/:id — Update club profile
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const club = await clubService.updateClub(req.user, req.params.id, req.body);
    return sendSuccess(res, { data: club, message: 'Club details updated.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

// ── 2. MEMBERSHIP MANAGEMENT ─────────────────────────────────────────────────

/**
 * POST /api/clubs/:id/join — Apply / join club
 */
router.post('/:id/join', async (req, res, next) => {
  try {
    const membership = await clubService.joinClub(req.user, req.params.id);
    const isPending = membership.status === 'PENDING';
    return sendSuccess(res, {
      data: membership,
      message: isPending
        ? 'Membership request submitted and is awaiting approval by club leadership.'
        : 'Welcome! You have successfully joined the club.',
    });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * DELETE /api/clubs/:id/join — Leave club / cancel request
 */
router.delete('/:id/join', async (req, res, next) => {
  try {
    const result = await clubService.leaveClub(req.user, req.params.id);
    return sendSuccess(res, result);
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * GET /api/clubs/:id/members — List members
 */
router.get('/:id/members', async (req, res, next) => {
  try {
    const result = await clubService.getClubMembers(req.user, req.params.id, req.query);
    return sendPaginated(res, {
      data: result.members,
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
 * GET /api/clubs/:id/membership-requests — List pending membership requests
 */
router.get('/:id/membership-requests', async (req, res, next) => {
  try {
    const requests = await clubService.getClubMembershipRequests(req.user, req.params.id);
    return sendSuccess(res, { data: requests });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/clubs/membership-requests/:id/approve — Approve request
 */
router.patch('/membership-requests/:id/approve', async (req, res, next) => {
  try {
    const membership = await clubService.approveMembershipRequest(req.user, req.params.id);
    return sendSuccess(res, { data: membership, message: 'Membership request approved.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/clubs/membership-requests/:id/reject — Reject request
 */
router.patch('/membership-requests/:id/reject', async (req, res, next) => {
  try {
    const membership = await clubService.rejectMembershipRequest(req.user, req.params.id, req.body);
    return sendSuccess(res, { data: membership, message: 'Membership request rejected.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/clubs/members/:id/suspend — Suspend member
 */
router.patch('/members/:id/suspend', async (req, res, next) => {
  try {
    const membership = await clubService.suspendMember(req.user, req.params.id, req.body);
    return sendSuccess(res, { data: membership, message: 'Member suspended.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/clubs/members/:id/promote — Promote member to officer / leadership role
 */
router.patch('/members/:id/promote', async (req, res, next) => {
  try {
    const membership = await clubService.promoteMember(req.user, req.params.id, req.body);
    return sendSuccess(res, { data: membership, message: 'Member promoted successfully.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

// ── 3. LEADERSHIP & OFFICERS ─────────────────────────────────────────────────

/**
 * GET /api/clubs/:id/leadership — View officers and club leadership
 */
router.get('/:id/leadership', async (req, res, next) => {
  try {
    const officers = await clubService.getClubLeadership(req.user, req.params.id);
    return sendSuccess(res, { data: officers });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * POST /api/clubs/:id/officers — Appoint an officer
 */
router.post('/:id/officers', async (req, res, next) => {
  try {
    const officer = await clubService.appointOfficer(req.user, req.params.id, req.body);
    return sendCreated(res, { data: officer, message: 'Officer appointed successfully.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * DELETE /api/clubs/officers/:id — Remove officer appointment
 */
router.delete('/officers/:id', async (req, res, next) => {
  try {
    const result = await clubService.removeOfficer(req.user, req.params.id);
    return sendSuccess(res, result);
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

// ── 4. ANNOUNCEMENTS ─────────────────────────────────────────────────────────

/**
 * GET /api/clubs/:id/announcements — List announcements
 */
router.get('/:id/announcements', async (req, res, next) => {
  try {
    const result = await clubService.getClubAnnouncements(req.user, req.params.id, req.query);
    return sendPaginated(res, {
      data: result.announcements,
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
 * POST /api/clubs/:id/announcements — Create announcement
 */
router.post('/:id/announcements', async (req, res, next) => {
  try {
    const announcement = await clubService.createClubAnnouncement(req.user, req.params.id, req.body);
    return sendCreated(res, { data: announcement, message: 'Announcement published.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/clubs/announcements/:id — Update announcement
 */
router.patch('/announcements/:id', async (req, res, next) => {
  try {
    const announcement = await clubService.updateClubAnnouncement(req.user, req.params.id, req.body);
    return sendSuccess(res, { data: announcement, message: 'Announcement updated.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * DELETE /api/clubs/announcements/:id — Delete announcement
 */
router.delete('/announcements/:id', async (req, res, next) => {
  try {
    const result = await clubService.deleteClubAnnouncement(req.user, req.params.id);
    return sendSuccess(res, result);
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

// ── 5. ACTIVITIES ────────────────────────────────────────────────────────────

/**
 * GET /api/clubs/:id/activities — List activities (with CLUB_ONLY privacy)
 */
router.get('/:id/activities', async (req, res, next) => {
  try {
    const activities = await clubService.getClubActivities(req.user, req.params.id, req.query);
    return sendSuccess(res, { data: activities });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * POST /api/clubs/:id/activities — Create activity
 */
router.post('/:id/activities', async (req, res, next) => {
  try {
    const activity = await clubService.createClubActivity(req.user, req.params.id, req.body);
    return sendCreated(res, { data: activity, message: 'Activity created.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/clubs/activities/:id — Update activity
 */
router.patch('/activities/:id', async (req, res, next) => {
  try {
    const activity = await clubService.updateClubActivity(req.user, req.params.id, req.body);
    return sendSuccess(res, { data: activity, message: 'Activity updated.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * DELETE /api/clubs/activities/:id — Delete activity
 */
router.delete('/activities/:id', async (req, res, next) => {
  try {
    const result = await clubService.deleteClubActivity(req.user, req.params.id);
    return sendSuccess(res, result);
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

// ── 6. ELECTIONS & VOTING ────────────────────────────────────────────────────

/**
 * GET /api/clubs/:id/elections — List elections for club
 */
router.get('/:id/elections', async (req, res, next) => {
  try {
    const elections = await clubService.getClubElections(req.user, req.params.id);
    return sendSuccess(res, { data: elections });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * POST /api/clubs/:id/elections — Create new election
 */
router.post('/:id/elections', async (req, res, next) => {
  try {
    const election = await clubService.createClubElection(req.user, req.params.id, req.body);
    return sendCreated(res, { data: election, message: 'Election created in draft mode.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * GET /api/clubs/elections/:id — Single election details
 */
router.get('/elections/:id', async (req, res, next) => {
  try {
    const election = await clubService.getElectionById(req.user, req.params.id);
    return sendSuccess(res, { data: election });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * POST /api/clubs/elections/:id/positions — Add contested seat/position
 */
router.post('/elections/:id/positions', async (req, res, next) => {
  try {
    const position = await clubService.addElectionPosition(req.user, req.params.id, req.body);
    return sendCreated(res, { data: position, message: 'Election position added.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * POST /api/clubs/elections/positions/:id/nominate — Nominate candidate for position
 */
router.post('/elections/positions/:id/nominate', async (req, res, next) => {
  try {
    const candidate = await clubService.nominateCandidate(req.user, req.params.id, req.body);
    return sendCreated(res, {
      data: candidate,
      message: 'Candidacy nomination submitted for review.',
    });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * POST /api/clubs/elections/:id/candidates — Also support election-level nomination route
 */
router.post('/elections/:id/candidates', async (req, res, next) => {
  try {
    const { positionId, manifesto } = req.body;
    if (!positionId) {
      return sendError(res, { statusCode: 400, message: 'positionId is required.' });
    }
    const candidate = await clubService.nominateCandidate(req.user, positionId, { manifesto });
    return sendCreated(res, { data: candidate, message: 'Candidacy submitted.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * PATCH /api/clubs/elections/candidates/:id/approve — Approve candidate
 */
router.patch('/elections/candidates/:id/approve', async (req, res, next) => {
  try {
    const candidate = await clubService.approveCandidate(req.user, req.params.id);
    return sendSuccess(res, { data: candidate, message: 'Candidate approved.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * POST /api/clubs/elections/:id/open — Open election for voting
 */
router.post('/elections/:id/open', async (req, res, next) => {
  try {
    const election = await clubService.openElection(req.user, req.params.id);
    return sendSuccess(res, { data: election, message: 'Election opened for voting.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * POST /api/clubs/elections/:id/close — Close voting
 */
router.post('/elections/:id/close', async (req, res, next) => {
  try {
    const election = await clubService.closeElection(req.user, req.params.id);
    return sendSuccess(res, { data: election, message: 'Election closed.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * POST /api/clubs/elections/:id/vote — Cast vote in election
 */
router.post('/elections/:id/vote', async (req, res, next) => {
  try {
    const result = await clubService.voteInElection(req.user, req.params.id, req.body);
    return sendSuccess(res, result);
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * GET /api/clubs/elections/:id/results — View election results
 */
router.get('/elections/:id/results', async (req, res, next) => {
  try {
    const results = await clubService.getElectionResults(req.user, req.params.id);
    return sendSuccess(res, { data: results });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * POST /api/clubs/elections/:id/publish — Publish election results
 */
router.post('/elections/:id/publish', async (req, res, next) => {
  try {
    const election = await clubService.publishElectionResults(req.user, req.params.id);
    return sendSuccess(res, { data: election, message: 'Election results published.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

/**
 * POST /api/clubs/elections/:id/cancel — Cancel election
 */
router.post('/elections/:id/cancel', async (req, res, next) => {
  try {
    const election = await clubService.cancelElection(req.user, req.params.id, req.body);
    return sendSuccess(res, { data: election, message: 'Election cancelled.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

// ── 7. REPORTING ─────────────────────────────────────────────────────────────

/**
 * POST /api/clubs/:id/report — Report club or inappropriate content
 */
router.post('/:id/report', async (req, res, next) => {
  try {
    const report = await clubService.reportClub(req.user, req.params.id, req.body);
    return sendCreated(res, { data: report, message: 'Club reported for administrator moderation.' });
  } catch (err) {
    if (err.statusCode) return sendError(res, { statusCode: err.statusCode, message: err.message });
    next(err);
  }
});

module.exports = router;
