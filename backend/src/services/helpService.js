'use strict';

const { Op } = require('sequelize');
const {
  HelpRequest,
  HelpResponder,
  HelpMessage,
  HelpFeedback,
  User,
  StudentProfile,
  Block,
  ReputationLog,
  AuditLog,
} = require('../models');

// ── Geospatial Calculation Helpers ──────────────────────────────────────────

/**
 * Calculates Haversine distance in meters between two lat/lon coordinates
 */
const haversineDistanceMeters = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const numLat1 = parseFloat(lat1);
  const numLon1 = parseFloat(lon1);
  const numLat2 = parseFloat(lat2);
  const numLon2 = parseFloat(lon2);

  if (isNaN(numLat1) || isNaN(numLon1) || isNaN(numLat2) || isNaN(numLon2)) return null;

  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(numLat2 - numLat1);
  const dLon = toRad(numLon2 - numLon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(numLat1)) * Math.cos(toRad(numLat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
};

/**
 * Formats distance into privacy-conscious coarse strings
 */
const formatDistanceLabel = (meters) => {
  if (meters == null) return 'Distance unavailable';
  if (meters <= 500) return 'Within 500 m';
  if (meters <= 1000) return 'Under 1 km away';
  const km = (meters / 1000).toFixed(1);
  return `${km} km away`;
};

// ── State Machine ────────────────────────────────────────────────────────────

const VALID_TRANSITIONS = {
  pending: ['notified', 'accepted', 'cancelled', 'expired'],
  notified: ['accepted', 'cancelled', 'expired'],
  accepted: ['active', 'cancelled', 'expired'],
  active: ['resolved', 'cancelled'],
  resolved: [],
  cancelled: [],
  expired: [],
};

const validateTransition = (currentStatus, targetStatus) => {
  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    const error = new Error(`Invalid state transition from '${currentStatus}' to '${targetStatus}'.`);
    error.statusCode = 400;
    throw error;
  }
};

// ── Helper: Blocked Users ────────────────────────────────────────────────────

const getBlockedUserIds = async (userId) => {
  if (!userId) return [];
  const blocks = await Block.findAll({
    where: {
      [Op.or]: [{ blockerId: userId }, { blockedId: userId }],
    },
    attributes: ['blockerId', 'blockedId'],
  });
  const blockedIds = new Set();
  blocks.forEach((b) => {
    if (b.blockerId === userId) blockedIds.add(b.blockedId);
    if (b.blockedId === userId) blockedIds.add(b.blockerId);
  });
  return Array.from(blockedIds);
};

// ── Service Methods ──────────────────────────────────────────────────────────

/**
 * Create a new Help & Emergency request
 */
const createHelpRequest = async (user, data) => {
  // 1. Role and account verification check
  if (user.role !== 'student' && user.role !== 'admin') {
    const error = new Error('Only verified students can request emergency assistance.');
    error.statusCode = 403;
    throw error;
  }

  // 2. Rate limit / Active request limits
  const activeCount = await HelpRequest.count({
    where: {
      requesterId: user.id,
      status: { [Op.in]: ['pending', 'notified', 'accepted', 'active'] },
    },
  });

  if (activeCount >= 2) {
    const error = new Error('You already have 2 active help requests. Please resolve or cancel existing requests before creating a new one.');
    error.statusCode = 429;
    throw error;
  }

  const {
    category,
    title,
    description,
    urgencyLevel = 'medium',
    locationLabel,
    latitude,
    longitude,
    locationConsented = false,
    contactPreference = 'chat',
    attachmentUrl,
    isAnonymous = false,
    radiusKm = 5.0,
  } = data;

  // Validation
  const validCategories = [
    'medical',
    'blood_requirement',
    'vehicle_breakdown',
    'lost_item',
    'campus_assistance',
    'academic_emergency',
    'safety',
    'travel',
    'other',
  ];

  if (!category || !validCategories.includes(category)) {
    const error = new Error(`Category must be one of: ${validCategories.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  const validUrgency = ['low', 'medium', 'high', 'critical'];
  if (!validUrgency.includes(urgencyLevel)) {
    const error = new Error(`Urgency level must be one of: ${validUrgency.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  if (!title || !title.trim()) {
    const error = new Error('Title / Short description is required.');
    error.statusCode = 400;
    throw error;
  }

  if (!description || !description.trim()) {
    const error = new Error('Detailed description of the emergency or request is required.');
    error.statusCode = 400;
    throw error;
  }

  if (!locationLabel && (latitude == null || longitude == null)) {
    const error = new Error('Location is required. Provide either a location label or GPS coordinates.');
    error.statusCode = 400;
    throw error;
  }

  // Configurable timeout based on urgency (critical: 2h, normal: 4h)
  const timeoutHours = urgencyLevel === 'critical' ? 2 : 4;
  const expiresAt = new Date(Date.now() + timeoutHours * 60 * 60 * 1000);

  const helpRequest = await HelpRequest.create({
    requesterId: user.id,
    category,
    title: title.trim().slice(0, 200),
    description: description.trim(),
    urgencyLevel,
    locationLabel: locationLabel ? locationLabel.trim().slice(0, 255) : 'Campus Location',
    latitude: locationConsented && latitude != null ? parseFloat(latitude) : null,
    longitude: locationConsented && longitude != null ? parseFloat(longitude) : null,
    locationConsented: !!locationConsented,
    requesterLocationShared: !!locationConsented,
    contactPreference,
    attachmentUrl: attachmentUrl || null,
    isAnonymous: !!isAnonymous,
    radiusKm: parseFloat(radiusKm) || 5.0,
    status: 'pending',
    expiresAt,
  });

  // Audit log
  try {
    await AuditLog.create({
      actorId: user.id,
      action: 'HELP_REQUEST_CREATED',
      resource: 'HelpRequest',
      resourceId: helpRequest.id,
      details: { category, urgencyLevel, isAnonymous },
    });
  } catch (err) {
    console.error('AuditLog error:', err.message);
  }

  return helpRequest;
};

/**
 * Get nearby eligible help requests for a helper
 */
const getNearbyHelpRequests = async (user, helperLat, helperLon) => {
  // Check helper status
  const helperUser = await User.findByPk(user.id, {
    include: [{ model: StudentProfile, as: 'studentProfile' }],
  });

  if (!helperUser || helperUser.accountStatus !== 'active') {
    const error = new Error('Only active students can view nearby help requests.');
    error.statusCode = 403;
    throw error;
  }

  const profile = helperUser.studentProfile;
  if (profile && profile.availableToHelp === false) {
    return []; // Helper has disabled help availability
  }

  const helperRadius = profile?.helpRadiusKm || 5.0;
  const lat = helperLat != null ? parseFloat(helperLat) : profile?.lastLatitude;
  const lon = helperLon != null ? parseFloat(helperLon) : profile?.lastLongitude;

  // Auto-expire overdue requests
  await expireInactiveRequests();

  // Blocked users exclusion
  const blockedIds = await getBlockedUserIds(user.id);
  const excludedIds = [user.id, ...blockedIds];

  const requests = await HelpRequest.findAll({
    where: {
      requesterId: { [Op.notIn]: excludedIds },
      status: { [Op.in]: ['pending', 'notified', 'accepted'] },
    },
    order: [
      ['createdAt', 'DESC'],
    ],
    include: [
      {
        model: User,
        as: 'requester',
        attributes: ['id', 'email', 'accountStatus'],
        include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName', 'department', 'semester'] }],
      },
      {
        model: HelpResponder,
        as: 'responders',
        attributes: ['id', 'userId', 'status', 'respondedAt'],
      },
    ],
  });

  // Calculate distances and format coarse distance labels
  const nearbyList = [];

  for (const req of requests) {
    let distanceMeters = null;
    let distanceLabel = 'Location Label Provided';

    if (lat != null && lon != null && req.latitude != null && req.longitude != null) {
      distanceMeters = haversineDistanceMeters(lat, lon, req.latitude, req.longitude);
      distanceLabel = formatDistanceLabel(distanceMeters);

      // Check distance against both helper radius and request radius
      const maxDistance = Math.max(helperRadius, req.radiusKm) * 1000;
      if (distanceMeters > maxDistance) {
        continue; // Outside allowed radius
      }
    }

    const hasUserResponded = (req.responders || []).some((r) => r.userId === user.id);

    // Strict privacy: strip raw exact coordinates for public nearby feed!
    nearbyList.push({
      id: req.id,
      category: req.category,
      title: req.title,
      description: req.description,
      urgencyLevel: req.urgencyLevel,
      locationLabel: req.locationLabel,
      status: req.status,
      createdAt: req.createdAt,
      expiresAt: req.expiresAt,
      isAnonymous: req.isAnonymous,
      requester: req.isAnonymous
        ? { fullName: 'Campus Student', department: 'UniLink Peer' }
        : {
            fullName: req.requester?.studentProfile?.fullName || 'UniLink Student',
            department: req.requester?.studentProfile?.department,
            semester: req.requester?.studentProfile?.semester,
          },
      distanceMeters,
      distanceLabel,
      hasUserResponded,
      responderCount: (req.responders || []).length,
    });
  }

  // Sort by urgency hierarchy (critical > high > medium > low) and proximity
  const urgencyWeight = { critical: 4, high: 3, medium: 2, low: 1 };
  nearbyList.sort((a, b) => {
    const diff = (urgencyWeight[b.urgencyLevel] || 0) - (urgencyWeight[a.urgencyLevel] || 0);
    if (diff !== 0) return diff;
    if (a.distanceMeters != null && b.distanceMeters != null) {
      return a.distanceMeters - b.distanceMeters;
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return nearbyList;
};

/**
 * Volunteer / Respond to a Help Request ("I Can Help")
 */
const respondToHelpRequest = async (user, requestId, message, helperLat, helperLon) => {
  const request = await HelpRequest.findByPk(requestId);
  if (!request) {
    const error = new Error('Help request not found.');
    error.statusCode = 404;
    throw error;
  }

  if (request.requesterId === user.id) {
    const error = new Error('You cannot volunteer for your own help request.');
    error.statusCode = 400;
    throw error;
  }

  // Verify request is open for helpers
  if (!['pending', 'notified', 'accepted'].includes(request.status)) {
    const error = new Error(`This help request is already ${request.status} and cannot accept new helpers.`);
    error.statusCode = 400;
    throw error;
  }

  // Check blocks
  const isBlocked = await Block.findOne({
    where: {
      [Op.or]: [
        { blockerId: user.id, blockedId: request.requesterId },
        { blockerId: request.requesterId, blockedId: user.id },
      ],
    },
  });
  if (isBlocked) {
    const error = new Error('Unable to respond to this request.');
    error.statusCode = 403;
    throw error;
  }

  let distanceMeters = null;
  if (helperLat != null && helperLon != null && request.latitude != null && request.longitude != null) {
    distanceMeters = haversineDistanceMeters(helperLat, helperLon, request.latitude, request.longitude);
  }

  // Check existing response
  let responder = await HelpResponder.findOne({
    where: { helpRequestId: request.id, userId: user.id },
  });

  if (responder) {
    await responder.update({
      status: 'offered',
      message: message ? message.trim().slice(0, 300) : responder.message,
      distanceMeters: distanceMeters ?? responder.distanceMeters,
      respondedAt: new Date(),
    });
  } else {
    responder = await HelpResponder.create({
      helpRequestId: request.id,
      userId: user.id,
      status: 'offered',
      message: message ? message.trim().slice(0, 300) : null,
      distanceMeters,
    });
  }

  // Update request status to 'accepted' if still pending
  if (request.status === 'pending' || request.status === 'notified') {
    validateTransition(request.status, 'accepted');
    await request.update({ status: 'accepted' });
  }

  return responder;
};

/**
 * Requester selects primary helper from responders -> Request becomes ACTIVE
 */
const selectPrimaryHelper = async (user, requestId, responderUserId) => {
  const request = await HelpRequest.findByPk(requestId);
  if (!request) {
    const error = new Error('Help request not found.');
    error.statusCode = 404;
    throw error;
  }

  if (request.requesterId !== user.id) {
    const error = new Error('Only the requester can select the primary helper.');
    error.statusCode = 403;
    throw error;
  }

  if (!['accepted', 'pending'].includes(request.status)) {
    const error = new Error(`Cannot select a helper when request status is '${request.status}'.`);
    error.statusCode = 400;
    throw error;
  }

  const responder = await HelpResponder.findOne({
    where: { helpRequestId: request.id, userId: responderUserId },
  });

  if (!responder) {
    const error = new Error('Selected responder has not offered help for this request.');
    error.statusCode = 404;
    throw error;
  }

  // Update selected responder and decline others
  await responder.update({ status: 'selected' });
  await HelpResponder.update(
    { status: 'declined' },
    {
      where: {
        helpRequestId: request.id,
        userId: { [Op.ne]: responderUserId },
      },
    }
  );

  // Transition to active
  validateTransition(request.status, 'active');
  await request.update({
    helperId: responderUserId,
    status: 'active',
  });

  // Seed initial system message in emergency chat
  try {
    await HelpMessage.create({
      helpRequestId: request.id,
      senderId: user.id,
      message: '🚨 Emergency assistance connected. You are now in a private coordination channel.',
    });
  } catch (err) {
    console.error('Initial chat message error:', err.message);
  }

  return request;
};

/**
 * Update live location sharing state (for requester or helper)
 */
const updateLocationSharing = async (user, requestId, { shareExactLocation, latitude, longitude }) => {
  const request = await HelpRequest.findByPk(requestId);
  if (!request) {
    const error = new Error('Help request not found.');
    error.statusCode = 404;
    throw error;
  }

  const isRequester = request.requesterId === user.id;
  const isHelper = request.helperId === user.id;

  if (!isRequester && !isHelper && user.role !== 'admin') {
    const error = new Error('You are not authorized to update location for this request.');
    error.statusCode = 403;
    throw error;
  }

  if (request.status !== 'active' && request.status !== 'accepted' && request.status !== 'pending') {
    const error = new Error(`Location sharing cannot be updated when request is ${request.status}.`);
    error.statusCode = 400;
    throw error;
  }

  const updates = {};
  if (isRequester) {
    if (shareExactLocation !== undefined) updates.requesterLocationShared = !!shareExactLocation;
    if (latitude != null) updates.latitude = parseFloat(latitude);
    if (longitude != null) updates.longitude = parseFloat(longitude);
  } else if (isHelper) {
    if (shareExactLocation !== undefined) updates.helperLocationShared = !!shareExactLocation;
    if (latitude != null) updates.helperLatitude = parseFloat(latitude);
    if (longitude != null) updates.helperLongitude = parseFloat(longitude);
    updates.helperLocationUpdate = new Date();
  }

  await request.update(updates);
  return request;
};

/**
 * Securely retrieve exact live location coordinates for authorized participants
 */
const getAuthorizedLocation = async (user, requestId) => {
  const request = await HelpRequest.findByPk(requestId);
  if (!request) {
    const error = new Error('Help request not found.');
    error.statusCode = 404;
    throw error;
  }

  const isRequester = request.requesterId === user.id;
  const isHelper = request.helperId === user.id;
  const isAdmin = user.role === 'admin';

  if (!isRequester && !isHelper && !isAdmin) {
    const error = new Error('Unauthorized: Only active request participants can view location.');
    error.statusCode = 403;
    throw error;
  }

  // Location tracking stops when request ends
  if (['resolved', 'cancelled', 'expired'].includes(request.status)) {
    return {
      status: request.status,
      message: 'Location sharing ended because request is resolved/terminal.',
      requesterLocation: null,
      helperLocation: null,
    };
  }

  return {
    status: request.status,
    requesterLocationShared: request.requesterLocationShared,
    helperLocationShared: request.helperLocationShared,
    requesterLocation: request.requesterLocationShared
      ? { latitude: request.latitude, longitude: request.longitude, label: request.locationLabel }
      : null,
    helperLocation: request.helperLocationShared
      ? { latitude: request.helperLatitude, longitude: request.helperLongitude, lastUpdated: request.helperLocationUpdate }
      : null,
  };
};

/**
 * Send emergency chat message
 */
const sendEmergencyMessage = async (user, requestId, messageText) => {
  if (!messageText || !messageText.trim()) {
    const error = new Error('Message cannot be empty.');
    error.statusCode = 400;
    throw error;
  }

  const request = await HelpRequest.findByPk(requestId);
  if (!request) {
    const error = new Error('Help request not found.');
    error.statusCode = 404;
    throw error;
  }

  const isRequester = request.requesterId === user.id;
  const isHelper = request.helperId === user.id;

  if (!isRequester && !isHelper && user.role !== 'admin') {
    const error = new Error('Unauthorized: You are not a participant in this help conversation.');
    error.statusCode = 403;
    throw error;
  }

  if (['cancelled', 'expired'].includes(request.status)) {
    const error = new Error(`Cannot send messages in a ${request.status} request.`);
    error.statusCode = 400;
    throw error;
  }

  const msg = await HelpMessage.create({
    helpRequestId: request.id,
    senderId: user.id,
    message: messageText.trim().slice(0, 1000),
  });

  return msg;
};

/**
 * Get messages for an emergency conversation
 */
const getEmergencyMessages = async (user, requestId) => {
  const request = await HelpRequest.findByPk(requestId);
  if (!request) {
    const error = new Error('Help request not found.');
    error.statusCode = 404;
    throw error;
  }

  const isRequester = request.requesterId === user.id;
  const isHelper = request.helperId === user.id;
  const isAdmin = user.role === 'admin';

  if (!isRequester && !isHelper && !isAdmin) {
    const error = new Error('Unauthorized: You are not a participant in this conversation.');
    error.statusCode = 403;
    throw error;
  }

  const messages = await HelpMessage.findAll({
    where: { helpRequestId: request.id },
    order: [['createdAt', 'ASC']],
    include: [
      {
        model: User,
        as: 'sender',
        attributes: ['id', 'email'],
        include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName', 'profilePhoto'] }],
      },
    ],
  });

  return messages;
};

/**
 * Resolve a Help Request
 */
const resolveHelpRequest = async (user, requestId) => {
  const request = await HelpRequest.findByPk(requestId);
  if (!request) {
    const error = new Error('Help request not found.');
    error.statusCode = 404;
    throw error;
  }

  const isRequester = request.requesterId === user.id;
  const isHelper = request.helperId === user.id;

  if (!isRequester && !isHelper && user.role !== 'admin') {
    const error = new Error('Only the requester or assigned helper can mark the request as resolved.');
    error.statusCode = 403;
    throw error;
  }

  validateTransition(request.status, 'resolved');

  const resolvedAt = new Date();
  const durationMinutes = Math.max(1, Math.round((resolvedAt - new Date(request.createdAt)) / (1000 * 60)));

  await request.update({
    status: 'resolved',
    resolvedAt,
    resolvedById: user.id,
    durationMinutes,
    requesterLocationShared: false,
    helperLocationShared: false,
  });

  // Award reputation points to the assigned helper (+15 points)
  if (request.helperId) {
    try {
      await ReputationLog.create({
        userId: request.helperId,
        points: 15,
        actionType: 'emergency_help',
        reason: `Resolved emergency/help request: "${request.title.slice(0, 50)}"`,
        sourceId: request.id,
        actorId: request.requesterId,
      });

      await StudentProfile.increment('reputationScore', { by: 15, where: { userId: request.helperId } });
      await StudentProfile.increment('studentsHelpedCount', { by: 1, where: { userId: request.helperId } });
    } catch (logErr) {
      console.error('Reputation award error on help resolution:', logErr.message);
    }
  }

  return request;
};

/**
 * Cancel a Help Request
 */
const cancelHelpRequest = async (user, requestId, reason) => {
  const request = await HelpRequest.findByPk(requestId);
  if (!request) {
    const error = new Error('Help request not found.');
    error.statusCode = 404;
    throw error;
  }

  const isRequester = request.requesterId === user.id;
  const isAdmin = user.role === 'admin';

  if (!isRequester && !isAdmin) {
    const error = new Error('Only the requester or an administrator can cancel this help request.');
    error.statusCode = 403;
    throw error;
  }

  validateTransition(request.status, 'cancelled');

  await request.update({
    status: 'cancelled',
    cancellationReason: reason ? reason.trim().slice(0, 255) : 'Cancelled by requester',
    requesterLocationShared: false,
    helperLocationShared: false,
  });

  return request;
};

/**
 * Submit feedback / rating after resolution
 */
const submitFeedback = async (user, requestId, { wasHelpful = true, rating = 5, comments }) => {
  const request = await HelpRequest.findByPk(requestId);
  if (!request) {
    const error = new Error('Help request not found.');
    error.statusCode = 404;
    throw error;
  }

  if (request.requesterId !== user.id) {
    const error = new Error('Only the requester can provide feedback.');
    error.statusCode = 403;
    throw error;
  }

  if (request.status !== 'resolved') {
    const error = new Error('Feedback can only be provided for resolved requests.');
    error.statusCode = 400;
    throw error;
  }

  if (!request.helperId) {
    const error = new Error('No helper was assigned to this request.');
    error.statusCode = 400;
    throw error;
  }

  const existing = await HelpFeedback.findOne({ where: { helpRequestId: request.id } });
  if (existing) {
    const error = new Error('You have already submitted feedback for this help request.');
    error.statusCode = 409;
    throw error;
  }

  const feedback = await HelpFeedback.create({
    helpRequestId: request.id,
    reviewerId: user.id,
    helperId: request.helperId,
    wasHelpful: !!wasHelpful,
    rating: Math.max(1, Math.min(5, parseInt(rating, 10) || 5)),
    comments: comments ? comments.trim().slice(0, 500) : null,
  });

  return feedback;
};

/**
 * Automatically expire overdue pending/notified/accepted requests
 */
const expireInactiveRequests = async () => {
  const now = new Date();
  const [count] = await HelpRequest.update(
    {
      status: 'expired',
      requesterLocationShared: false,
      helperLocationShared: false,
    },
    {
      where: {
        status: { [Op.in]: ['pending', 'notified', 'accepted'] },
        expiresAt: { [Op.lte]: now },
      },
    }
  );
  return count;
};

/**
 * Retrieve a student's help history (requests created and assistance provided)
 */
const getHelpHistory = async (user) => {
  const [myRequests, helpProvided] = await Promise.all([
    HelpRequest.findAll({
      where: { requesterId: user.id },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'helper',
          attributes: ['id', 'email'],
          include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName', 'department', 'semester'] }],
        },
        {
          model: HelpFeedback,
          as: 'feedback',
        },
      ],
    }),
    HelpRequest.findAll({
      where: { helperId: user.id },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'email'],
          include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName', 'department', 'semester'] }],
        },
        {
          model: HelpFeedback,
          as: 'feedback',
        },
      ],
    }),
  ]);

  // Strip exact coordinates from history for privacy
  const sanitize = (list) =>
    list.map((r) => {
      const item = r.toJSON();
      delete item.latitude;
      delete item.longitude;
      delete item.helperLatitude;
      delete item.helperLongitude;
      return item;
    });

  return {
    myRequests: sanitize(myRequests),
    helpProvided: sanitize(helpProvided),
  };
};

module.exports = {
  haversineDistanceMeters,
  formatDistanceLabel,
  validateTransition,
  createHelpRequest,
  getNearbyHelpRequests,
  respondToHelpRequest,
  selectPrimaryHelper,
  updateLocationSharing,
  getAuthorizedLocation,
  sendEmergencyMessage,
  getEmergencyMessages,
  resolveHelpRequest,
  cancelHelpRequest,
  submitFeedback,
  expireInactiveRequests,
  getHelpHistory,
};
