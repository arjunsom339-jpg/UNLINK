'use strict';

const { Op } = require('sequelize');
const {
  sequelize,
  User,
  StudentProfile,
  TeacherProfile,
  AlumniProfile,
  MentorshipRequest,
  MentorshipSession,
  MentorshipFeedback,
  MentorshipMessage,
  AlumniBookmark,
  Block,
  Report,
  AuditLog,
  Notification,
  ReputationLog,
  College,
  Department,
} = require('../models');
const notificationService = require('./notificationService');
const authService = require('./authService');
const logger = require('../utils/logger');

/**
 * Deterministic Matching Score Calculator
 * Scores compatibility between a student and an alumnus on a scale of 0 to 100.
 */
const calculateMatchScore = (student, alumnusProfile) => {
  let score = 0;

  // 1. Same Department (+25 points)
  if (
    student?.departmentId &&
    alumnusProfile?.departmentId &&
    student.departmentId === alumnusProfile.departmentId
  ) {
    score += 25;
  } else if (
    student?.department &&
    alumnusProfile?.departmentRef?.name &&
    student.department.toLowerCase() === alumnusProfile.departmentRef.name.toLowerCase()
  ) {
    score += 25;
  }

  // 2. Skill Overlap (+25 points)
  const alumnusSkills = Array.isArray(alumnusProfile?.skills)
    ? alumnusProfile.skills.map((s) => String(s).toLowerCase().trim())
    : [];
  
  const studentSkills = [];
  if (Array.isArray(student?.skills)) {
    student.skills.forEach((s) => {
      const name = typeof s === 'string' ? s : s?.skill?.name || s?.name;
      if (name) studentSkills.push(name.toLowerCase().trim());
    });
  }

  if (alumnusSkills.length > 0 && studentSkills.length > 0) {
    const commonSkills = alumnusSkills.filter((s) => studentSkills.includes(s));
    if (commonSkills.length >= 2) {
      score += 25;
    } else if (commonSkills.length === 1) {
      score += 15;
    }
  }

  // 3. Mentorship Topic Overlap (+30 points)
  const alumnusTopics = Array.isArray(alumnusProfile?.mentorshipTopics)
    ? alumnusProfile.mentorshipTopics.map((t) => String(t).toLowerCase().trim())
    : [];

  if (alumnusTopics.length > 0 && studentSkills.length > 0) {
    const topicMatches = alumnusTopics.filter((t) =>
      studentSkills.some((s) => t.includes(s) || s.includes(t))
    );
    if (topicMatches.length >= 2) {
      score += 30;
    } else if (topicMatches.length === 1) {
      score += 20;
    }
  } else if (alumnusTopics.length > 0) {
    // General match if alumnus offers diverse topics
    score += 15;
  }

  // 4. Availability (+10 points)
  if (alumnusProfile?.availabilityStatus === 'AVAILABLE') {
    score += 10;
  } else if (alumnusProfile?.availabilityStatus === 'LIMITED') {
    score += 5;
  }

  // 5. Experience (+10 points)
  const exp = alumnusProfile?.experienceYears || 0;
  if (exp >= 5) {
    score += 10;
  } else if (exp >= 2) {
    score += 7;
  } else if (exp >= 1) {
    score += 5;
  }

  return Math.min(100, Math.max(0, score));
};

/**
 * Check if two users have blocked each other
 */
const areUsersBlocked = async (userAId, userBId) => {
  const block = await Block.findOne({
    where: {
      [Op.or]: [
        { blockerId: userAId, blockedId: userBId },
        { blockerId: userBId, blockedId: userAId },
      ],
    },
  });
  return !!block;
};

// ── 1. Profile Management ────────────────────────────────────────────────────

/**
 * Create or update an Alumni Profile
 */
const createOrUpdateProfile = async (user, data) => {
  if (!user || !user.id) {
    const error = new Error('User context required');
    error.statusCode = 401;
    throw error;
  }

  const {
    graduationYear,
    graduationSemester,
    departmentId,
    degree,
    currentJobTitle,
    currentCompany,
    industry,
    experienceYears,
    location,
    bio,
    skills,
    expertiseAreas,
    mentorshipTopics,
    linkedinUrl,
    portfolioUrl,
    availabilityStatus,
    mentorshipMode,
    preferredFrequency,
    visibility,
  } = data;

  if (!graduationYear || !currentJobTitle || !currentCompany || !industry) {
    const error = new Error('graduationYear, currentJobTitle, currentCompany, and industry are required');
    error.statusCode = 400;
    throw error;
  }

  let profile = await AlumniProfile.findOne({ where: { userId: user.id } });

  const safeSkills = Array.isArray(skills) ? skills : [];
  const safeExpertise = Array.isArray(expertiseAreas) ? expertiseAreas : [];
  const safeTopics = Array.isArray(mentorshipTopics) ? mentorshipTopics : [];

  if (profile) {
    await profile.update({
      graduationYear: parseInt(graduationYear, 10),
      graduationSemester: graduationSemester ? parseInt(graduationSemester, 10) : profile.graduationSemester,
      departmentId: departmentId || profile.departmentId,
      degree: degree || profile.degree,
      currentJobTitle: currentJobTitle.trim(),
      currentCompany: currentCompany.trim(),
      industry: industry.trim(),
      experienceYears: experienceYears !== undefined ? Math.max(0, parseInt(experienceYears, 10)) : profile.experienceYears,
      location: location !== undefined ? (location ? location.trim() : null) : profile.location,
      bio: bio !== undefined ? (bio ? bio.trim() : null) : profile.bio,
      skills: safeSkills,
      expertiseAreas: safeExpertise,
      mentorshipTopics: safeTopics,
      linkedinUrl: linkedinUrl !== undefined ? linkedinUrl : profile.linkedinUrl,
      portfolioUrl: portfolioUrl !== undefined ? portfolioUrl : profile.portfolioUrl,
      availabilityStatus: availabilityStatus || profile.availabilityStatus,
      mentorshipMode: mentorshipMode || profile.mentorshipMode,
      preferredFrequency: preferredFrequency || profile.preferredFrequency,
      visibility: visibility || profile.visibility,
    });
  } else {
    profile = await AlumniProfile.create({
      userId: user.id,
      collegeId: user.collegeId,
      departmentId: departmentId || user.studentProfile?.departmentId || null,
      graduationYear: parseInt(graduationYear, 10),
      graduationSemester: graduationSemester ? parseInt(graduationSemester, 10) : null,
      degree: degree || 'Bachelor of Engineering',
      currentJobTitle: currentJobTitle.trim(),
      currentCompany: currentCompany.trim(),
      industry: industry.trim(),
      experienceYears: experienceYears !== undefined ? Math.max(0, parseInt(experienceYears, 10)) : 1,
      location: location ? location.trim() : null,
      bio: bio ? bio.trim() : null,
      skills: safeSkills,
      expertiseAreas: safeExpertise,
      mentorshipTopics: safeTopics,
      linkedinUrl: linkedinUrl || null,
      portfolioUrl: portfolioUrl || null,
      availabilityStatus: availabilityStatus || 'AVAILABLE',
      mentorshipMode: mentorshipMode || 'FLEXIBLE',
      preferredFrequency: preferredFrequency || 'FLEXIBLE',
      verificationStatus: 'PENDING',
      visibility: visibility || 'COLLEGE_ONLY',
    });
  }

  return getMyAlumniProfile(user.id);
};

/**
 * Get current authenticated user's Alumni Profile
 */
const getMyAlumniProfile = async (userId) => {
  return await AlumniProfile.findOne({
    where: { userId },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'role', 'isAdminVerified', 'accountStatus'],
        include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName', 'profilePhoto', 'usn', 'department'] }],
      },
      { model: College, as: 'collegeRef', attributes: ['id', 'name', 'code'] },
      { model: Department, as: 'departmentRef', attributes: ['id', 'name', 'code'] },
    ],
  });
};

/**
 * Get public profile of an alumnus by AlumniProfile ID or User ID
 */
const getAlumniProfileById = async (targetId, viewingUser = null) => {
  let profile = await AlumniProfile.findOne({
    where: {
      [Op.or]: [{ id: targetId }, { userId: targetId }],
    },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'role', 'accountStatus'],
        include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName', 'profilePhoto', 'department'] }],
      },
      { model: College, as: 'collegeRef', attributes: ['id', 'name', 'code'] },
      { model: Department, as: 'departmentRef', attributes: ['id', 'name', 'code'] },
    ],
  });

  if (!profile) {
    const error = new Error('Alumni profile not found');
    error.statusCode = 404;
    throw error;
  }

  // Multi-college isolation: viewing user must belong to same college
  if (viewingUser && viewingUser.role !== 'admin' && profile.collegeId !== viewingUser.collegeId) {
    const error = new Error('Access denied: Alumni is from another institution');
    error.statusCode = 403;
    throw error;
  }

  // Block check
  if (viewingUser) {
    const blocked = await areUsersBlocked(viewingUser.id, profile.userId);
    if (blocked) {
      const error = new Error('Alumni profile is unavailable');
      error.statusCode = 403;
      throw error;
    }
  }

  // Sanitize sensitive email and details for public viewing
  const plain = profile.toJSON();
  if (plain.user) {
    delete plain.user.email;
  }

  let isBookmarked = false;
  if (viewingUser) {
    const bm = await AlumniBookmark.findOne({
      where: { studentId: viewingUser.id, alumniProfileId: profile.id },
    });
    isBookmarked = !!bm;
  }

  plain.isBookmarked = isBookmarked;
  return plain;
};

// ── 2. Discovery & Search ────────────────────────────────────────────────────

/**
 * Discover verified alumni in the user's institution
 */
const discoverAlumni = async (user, options = {}) => {
  const {
    search,
    departmentId,
    graduationYear,
    industry,
    availabilityStatus,
    mentorshipMode,
    topic,
    skill,
    sortBy = 'relevance',
    page = 1,
    limit = 12,
  } = options;

  const whereClause = {
    collegeId: user.collegeId,
    verificationStatus: 'VERIFIED',
    visibility: { [Op.ne]: 'HIDDEN' },
  };

  // Do not show suspended profiles
  whereClause.verificationStatus = 'VERIFIED';

  if (departmentId) {
    whereClause.departmentId = departmentId;
  }
  if (graduationYear) {
    whereClause.graduationYear = parseInt(graduationYear, 10);
  }
  if (industry) {
    whereClause.industry = { [Op.like]: `%${industry.trim()}%` };
  }
  if (availabilityStatus) {
    whereClause.availabilityStatus = availabilityStatus;
  }
  if (mentorshipMode) {
    whereClause.mentorshipMode = mentorshipMode;
  }

  // Exclude users blocked by viewing user or who blocked viewing user
  const blockedRecords = await Block.findAll({
    where: {
      [Op.or]: [{ blockerId: user.id }, { blockedId: user.id }],
    },
  });
  const blockedUserIds = blockedRecords.map((b) =>
    b.blockerId === user.id ? b.blockedId : b.blockerId
  );
  if (blockedUserIds.length > 0) {
    whereClause.userId = { [Op.notIn]: blockedUserIds };
  }

  // General text search
  if (search && search.trim()) {
    const q = `%${search.trim()}%`;
    whereClause[Op.or] = [
      { currentCompany: { [Op.like]: q } },
      { currentJobTitle: { [Op.like]: q } },
      { industry: { [Op.like]: q } },
      { bio: { [Op.like]: q } },
      { location: { [Op.like]: q } },
    ];
  }

  let order = [['createdAt', 'DESC']];
  if (sortBy === 'experience') {
    order = [['experienceYears', 'DESC']];
  } else if (sortBy === 'graduationYear') {
    order = [['graduationYear', 'DESC']];
  } else if (sortBy === 'recentlyActive') {
    order = [['updatedAt', 'DESC']];
  }

  const offset = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(50, Math.max(1, parseInt(limit, 10)));
  const pageLimit = Math.min(50, Math.max(1, parseInt(limit, 10)));

  const { rows, count } = await AlumniProfile.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'role', 'accountStatus'],
        where: { accountStatus: { [Op.ne]: 'suspended' } },
        include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName', 'profilePhoto', 'department'] }],
      },
      { model: Department, as: 'departmentRef', attributes: ['id', 'name', 'code'] },
    ],
    order,
    limit: pageLimit,
    offset,
  });

  // Calculate matching scores and sanitize
  const studentData = user.studentProfile ? user.studentProfile.toJSON() : {};
  let sanitizedRows = rows.map((profile) => {
    const plain = profile.toJSON();
    if (plain.user) {
      delete plain.user.email;
    }
    plain.matchScore = calculateMatchScore(studentData, plain);
    return plain;
  });

  // In-memory filter for topics or skills if specified
  if (topic) {
    const tLower = topic.toLowerCase().trim();
    sanitizedRows = sanitizedRows.filter((p) =>
      Array.isArray(p.mentorshipTopics) &&
      p.mentorshipTopics.some((t) => String(t).toLowerCase().includes(tLower))
    );
  }
  if (skill) {
    const sLower = skill.toLowerCase().trim();
    sanitizedRows = sanitizedRows.filter((p) =>
      Array.isArray(p.skills) &&
      p.skills.some((s) => String(s).toLowerCase().includes(sLower))
    );
  }

  // Sort by match score if relevance chosen
  if (sortBy === 'relevance') {
    sanitizedRows.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  }

  return {
    alumni: sanitizedRows,
    total: count,
    page: parseInt(page, 10) || 1,
    totalPages: Math.ceil(count / pageLimit),
  };
};

// ── 3. Mentorship Request Lifecycle ──────────────────────────────────────────

/**
 * Send a new Mentorship Request from a student to a verified alumnus
 */
const createMentorshipRequest = async (studentUser, data) => {
  const {
    alumniId,
    alumniProfileId,
    topic,
    message,
    goals,
    preferredMode,
    preferredFrequency,
    preferredDuration,
  } = data;

  if (!topic || !topic.trim() || !message || !message.trim()) {
    const error = new Error('topic and message are required');
    error.statusCode = 400;
    throw error;
  }

  // Resolve target alumnus profile
  let alumnusProfile;
  if (alumniProfileId) {
    alumnusProfile = await AlumniProfile.findByPk(alumniProfileId);
  } else if (alumniId) {
    alumnusProfile = await AlumniProfile.findOne({ where: { userId: alumniId } });
  }

  if (!alumnusProfile) {
    const error = new Error('Alumni mentor profile not found');
    error.statusCode = 404;
    throw error;
  }

  const targetUserId = alumnusProfile.userId;

  // Cannot request mentorship from oneself
  if (studentUser.id === targetUserId) {
    const error = new Error('Cannot request mentorship from yourself');
    error.statusCode = 400;
    throw error;
  }

  // College isolation check
  if (alumnusProfile.collegeId !== studentUser.collegeId) {
    const error = new Error('Cross-college mentorship requests are not permitted');
    error.statusCode = 403;
    throw error;
  }

  // Check if target user or profile is suspended
  const targetUser = await User.findByPk(targetUserId);
  if (!targetUser || targetUser.accountStatus === 'suspended' || alumnusProfile.verificationStatus === 'SUSPENDED') {
    const error = new Error('Mentor is currently suspended');
    error.statusCode = 400;
    throw error;
  }

  // Verification status check
  if (alumnusProfile.verificationStatus !== 'VERIFIED') {
    const error = new Error('Cannot request mentorship from unverified alumni');
    error.statusCode = 400;
    throw error;
  }

  // Block check
  const blocked = await areUsersBlocked(studentUser.id, targetUserId);
  if (blocked) {
    const error = new Error('Cannot interact with this user');
    error.statusCode = 403;
    throw error;
  }

  // Duplicate active request check: PENDING, ACCEPTED, or ACTIVE
  const existingActive = await MentorshipRequest.findOne({
    where: {
      studentId: studentUser.id,
      alumniId: targetUserId,
      status: { [Op.in]: ['PENDING', 'ACCEPTED', 'ACTIVE'] },
    },
  });

  if (existingActive) {
    const error = new Error('You already have a pending or active mentorship request with this mentor');
    error.statusCode = 409;
    throw error;
  }

  const request = await MentorshipRequest.create({
    studentId: studentUser.id,
    alumniId: targetUserId,
    alumniProfileId: alumnusProfile.id,
    collegeId: studentUser.collegeId,
    topic: topic.trim(),
    message: message.trim(),
    goals: goals ? goals.trim() : null,
    preferredMode: preferredMode || 'FLEXIBLE',
    preferredFrequency: preferredFrequency || 'FLEXIBLE',
    preferredDuration: preferredDuration || '30 mins',
    status: 'PENDING',
  });

  // Notify Alumnus
  const studentName = studentUser.studentProfile?.fullName || 'A student';
  await notificationService.createNotification({
    userId: targetUserId,
    type: 'MENTORSHIP_REQUEST_RECEIVED',
    title: 'New Mentorship Request',
    message: `${studentName} requested mentorship on "${topic.trim()}"`,
    data: { mentorshipRequestId: request.id },
  });

  return getMentorshipRequestById(request.id, studentUser);
};

/**
 * Get Mentorship Request by ID with authorization and participant check
 */
const getMentorshipRequestById = async (requestId, user) => {
  const request = await MentorshipRequest.findByPk(requestId, {
    include: [
      {
        model: User,
        as: 'student',
        attributes: ['id', 'role', 'accountStatus'],
        include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName', 'profilePhoto', 'usn', 'department', 'semester'] }],
      },
      {
        model: User,
        as: 'alumnus',
        attributes: ['id', 'role', 'accountStatus'],
        include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName', 'profilePhoto', 'department'] }],
      },
      { model: AlumniProfile, as: 'alumniProfile' },
      { model: MentorshipSession, as: 'sessions', order: [['scheduledAt', 'ASC']] },
    ],
  });

  if (!request) {
    const error = new Error('Mentorship request not found');
    error.statusCode = 404;
    throw error;
  }

  // College check
  if (user && user.role !== 'admin' && request.collegeId !== user.collegeId) {
    const error = new Error('Unauthorized cross-college request access');
    error.statusCode = 403;
    throw error;
  }

  // Authorization check: Only student, alumnus, or admin can access
  if (user && user.role !== 'admin' && user.id !== request.studentId && user.id !== request.alumniId) {
    const error = new Error('Access denied: You are not a participant in this mentorship');
    error.statusCode = 403;
    throw error;
  }

  return request;
};

/**
 * Accept Mentorship Request (Alumni action)
 */
const acceptMentorshipRequest = async (alumniUser, requestId) => {
  const request = await MentorshipRequest.findByPk(requestId);
  if (!request) {
    const error = new Error('Mentorship request not found');
    error.statusCode = 404;
    throw error;
  }

  if (request.alumniId !== alumniUser.id) {
    const error = new Error('Unauthorized: Only the requested mentor can accept this request');
    error.statusCode = 403;
    throw error;
  }

  if (request.status !== 'PENDING') {
    const error = new Error(`Cannot accept request in status '${request.status}'`);
    error.statusCode = 400;
    throw error;
  }

  await request.update({
    status: 'ACCEPTED',
    acceptedAt: new Date(),
    respondedAt: new Date(),
  });

  // Notify student
  await notificationService.createNotification({
    userId: request.studentId,
    type: 'MENTORSHIP_REQUEST_ACCEPTED',
    title: 'Mentorship Request Accepted!',
    message: `Your mentor accepted your mentorship request on "${request.topic}". You can now start communicating!`,
    data: { mentorshipRequestId: request.id },
  });

  return getMentorshipRequestById(request.id, alumniUser);
};

/**
 * Decline Mentorship Request (Alumni action)
 */
const declineMentorshipRequest = async (alumniUser, requestId, reason) => {
  const request = await MentorshipRequest.findByPk(requestId);
  if (!request) {
    const error = new Error('Mentorship request not found');
    error.statusCode = 404;
    throw error;
  }

  if (request.alumniId !== alumniUser.id) {
    const error = new Error('Unauthorized: Only the requested mentor can decline this request');
    error.statusCode = 403;
    throw error;
  }

  if (request.status !== 'PENDING') {
    const error = new Error(`Cannot decline request in status '${request.status}'`);
    error.statusCode = 400;
    throw error;
  }

  await request.update({
    status: 'DECLINED',
    rejectionReason: reason ? reason.trim() : 'Mentor is unavailable at this time',
    respondedAt: new Date(),
  });

  // Notify student
  await notificationService.createNotification({
    userId: request.studentId,
    type: 'MENTORSHIP_REQUEST_DECLINED',
    title: 'Mentorship Request Declined',
    message: `Your mentorship request on "${request.topic}" was declined.`,
    data: { mentorshipRequestId: request.id },
  });

  return getMentorshipRequestById(request.id, alumniUser);
};

/**
 * Cancel Mentorship Request (Student action)
 */
const cancelMentorshipRequest = async (studentUser, requestId, reason) => {
  const request = await MentorshipRequest.findByPk(requestId);
  if (!request) {
    const error = new Error('Mentorship request not found');
    error.statusCode = 404;
    throw error;
  }

  if (request.studentId !== studentUser.id) {
    const error = new Error('Unauthorized: Only the requesting student can cancel this request');
    error.statusCode = 403;
    throw error;
  }

  if (request.status !== 'PENDING') {
    const error = new Error(`Cannot cancel request in status '${request.status}'. Only PENDING requests can be cancelled.`);
    error.statusCode = 400;
    throw error;
  }

  await request.update({
    status: 'CANCELLED',
    cancellationReason: reason ? reason.trim() : 'Cancelled by student',
  });

  return getMentorshipRequestById(request.id, studentUser);
};

/**
 * Start Mentorship (Transition from ACCEPTED to ACTIVE)
 */
const startMentorship = async (user, requestId) => {
  const request = await MentorshipRequest.findByPk(requestId);
  if (!request) {
    const error = new Error('Mentorship request not found');
    error.statusCode = 404;
    throw error;
  }

  if (request.studentId !== user.id && request.alumniId !== user.id && user.role !== 'admin') {
    const error = new Error('Unauthorized participant');
    error.statusCode = 403;
    throw error;
  }

  if (request.status !== 'ACCEPTED') {
    const error = new Error(`Cannot start mentorship with status '${request.status}'. Must be ACCEPTED.`);
    error.statusCode = 400;
    throw error;
  }

  await request.update({ status: 'ACTIVE' });
  return getMentorshipRequestById(request.id, user);
};

/**
 * Complete Mentorship (Transition from ACTIVE/ACCEPTED to COMPLETED)
 */
const completeMentorship = async (user, requestId) => {
  const request = await MentorshipRequest.findByPk(requestId);
  if (!request) {
    const error = new Error('Mentorship request not found');
    error.statusCode = 404;
    throw error;
  }

  if (request.studentId !== user.id && request.alumniId !== user.id && user.role !== 'admin') {
    const error = new Error('Unauthorized participant');
    error.statusCode = 403;
    throw error;
  }

  if (request.status !== 'ACTIVE' && request.status !== 'ACCEPTED') {
    const error = new Error(`Cannot complete mentorship in status '${request.status}'`);
    error.statusCode = 400;
    throw error;
  }

  await request.update({
    status: 'COMPLETED',
    completedAt: new Date(),
  });

  // Increment completed count on AlumniProfile
  if (request.alumniProfileId) {
    await AlumniProfile.increment('completedMentorshipsCount', {
      by: 1,
      where: { id: request.alumniProfileId },
    });
  }

  // Notify student and alumnus
  await notificationService.createNotification({
    userId: request.studentId,
    type: 'MENTORSHIP_COMPLETED',
    title: 'Mentorship Completed!',
    message: `Your mentorship on "${request.topic}" has been marked completed. Share your feedback!`,
    data: { mentorshipRequestId: request.id },
  });

  await notificationService.createNotification({
    userId: request.alumniId,
    type: 'MENTORSHIP_COMPLETED',
    title: 'Mentorship Completed!',
    message: `Mentorship on "${request.topic}" has concluded successfully.`,
    data: { mentorshipRequestId: request.id },
  });

  return getMentorshipRequestById(request.id, user);
};

/**
 * List Mentorship Requests for Student or Alumni
 */
const getUserMentorships = async (user, options = {}) => {
  const { role = 'student', status, page = 1, limit = 20 } = options;

  const where = { collegeId: user.collegeId };
  if (role === 'alumni') {
    where.alumniId = user.id;
  } else {
    where.studentId = user.id;
  }

  if (status) {
    where.status = status;
  }

  const offset = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(50, Math.max(1, parseInt(limit, 10)));
  const pageLimit = Math.min(50, Math.max(1, parseInt(limit, 10)));

  const { rows, count } = await MentorshipRequest.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'student',
        attributes: ['id', 'role'],
        include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName', 'profilePhoto', 'usn', 'department'] }],
      },
      {
        model: User,
        as: 'alumnus',
        attributes: ['id', 'role'],
        include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName', 'profilePhoto', 'department'] }],
      },
      { model: AlumniProfile, as: 'alumniProfile' },
      { model: MentorshipFeedback, as: 'feedbacks' },
    ],
    order: [['createdAt', 'DESC']],
    limit: pageLimit,
    offset,
  });

  return {
    requests: rows,
    total: count,
    page: parseInt(page, 10) || 1,
    totalPages: Math.ceil(count / pageLimit),
  };
};

// ── 4. Mentorship Sessions ───────────────────────────────────────────────────

/**
 * Schedule a mentorship session
 */
const scheduleSession = async (user, requestId, sessionData) => {
  const { scheduledAt, durationMinutes = 45, mode = 'CHAT', meetingLink, notes } = sessionData;

  const request = await MentorshipRequest.findByPk(requestId);
  if (!request) {
    const error = new Error('Mentorship request not found');
    error.statusCode = 404;
    throw error;
  }

  // Participant authorization
  if (request.studentId !== user.id && request.alumniId !== user.id && user.role !== 'admin') {
    const error = new Error('Unauthorized participant');
    error.statusCode = 403;
    throw error;
  }

  // Mentorship must be ACCEPTED or ACTIVE
  if (request.status !== 'ACCEPTED' && request.status !== 'ACTIVE') {
    const error = new Error(`Sessions can only be scheduled for ACCEPTED or ACTIVE mentorships (current: ${request.status})`);
    error.statusCode = 400;
    throw error;
  }

  if (!scheduledAt) {
    const error = new Error('scheduledAt date/time is required');
    error.statusCode = 400;
    throw error;
  }

  const session = await MentorshipSession.create({
    mentorshipRequestId: request.id,
    scheduledAt: new Date(scheduledAt),
    durationMinutes: Math.max(15, parseInt(durationMinutes, 10) || 45),
    mode: mode || 'CHAT',
    meetingLink: meetingLink || null,
    notes: notes || null,
    status: 'SCHEDULED',
    createdBy: user.id,
  });

  // Notify the counterpart
  const recipientId = user.id === request.studentId ? request.alumniId : request.studentId;
  await notificationService.createNotification({
    userId: recipientId,
    type: 'MENTORSHIP_SESSION_SCHEDULED',
    title: 'Mentorship Session Scheduled',
    message: `A new session was scheduled for "${request.topic}" on ${new Date(scheduledAt).toLocaleDateString()}`,
    data: { sessionId: session.id, mentorshipRequestId: request.id },
  });

  return session;
};

/**
 * Get sessions for a mentorship request
 */
const getSessions = async (user, requestId) => {
  const request = await MentorshipRequest.findByPk(requestId);
  if (!request) {
    const error = new Error('Mentorship request not found');
    error.statusCode = 404;
    throw error;
  }

  if (request.studentId !== user.id && request.alumniId !== user.id && user.role !== 'admin') {
    const error = new Error('Unauthorized: You are not a participant in this mentorship');
    error.statusCode = 403;
    throw error;
  }

  return await MentorshipSession.findAll({
    where: { mentorshipRequestId: requestId },
    order: [['scheduledAt', 'ASC']],
  });
};

/**
 * Update session status or details
 */
const updateSession = async (user, sessionId, data) => {
  const session = await MentorshipSession.findByPk(sessionId, {
    include: [{ model: MentorshipRequest, as: 'mentorshipRequest' }],
  });

  if (!session) {
    const error = new Error('Mentorship session not found');
    error.statusCode = 404;
    throw error;
  }

  const request = session.mentorshipRequest;
  if (request.studentId !== user.id && request.alumniId !== user.id && user.role !== 'admin') {
    const error = new Error('Unauthorized participant');
    error.statusCode = 403;
    throw error;
  }

  const updates = {};
  if (data.status) {
    updates.status = data.status;
  }
  if (data.scheduledAt) {
    updates.scheduledAt = new Date(data.scheduledAt);
  }
  if (data.meetingLink !== undefined) {
    updates.meetingLink = data.meetingLink;
  }
  if (data.notes !== undefined) {
    updates.notes = data.notes;
  }

  await session.update(updates);
  return session;
};

// ── 5. Private Messaging ─────────────────────────────────────────────────────

/**
 * Send a message inside an accepted mentorship channel
 */
const sendMessage = async (user, requestId, messageText) => {
  if (!messageText || !messageText.trim()) {
    const error = new Error('Message text cannot be empty');
    error.statusCode = 400;
    throw error;
  }

  const request = await MentorshipRequest.findByPk(requestId);
  if (!request) {
    const error = new Error('Mentorship request not found');
    error.statusCode = 404;
    throw error;
  }

  // Participant authorization
  if (request.studentId !== user.id && request.alumniId !== user.id) {
    const error = new Error('Access denied: You are not a participant in this mentorship chat');
    error.statusCode = 403;
    throw error;
  }

  // Communication only allowed if ACCEPTED or ACTIVE
  if (request.status !== 'ACCEPTED' && request.status !== 'ACTIVE') {
    const error = new Error(`Messaging is only allowed on ACCEPTED or ACTIVE mentorships (current: ${request.status})`);
    error.statusCode = 403;
    throw error;
  }

  // Block check
  const counterpartId = user.id === request.studentId ? request.alumniId : request.studentId;
  const blocked = await areUsersBlocked(user.id, counterpartId);
  if (blocked) {
    const error = new Error('Communication is blocked between participants');
    error.statusCode = 403;
    throw error;
  }

  const msg = await MentorshipMessage.create({
    mentorshipRequestId: requestId,
    senderId: user.id,
    message: messageText.trim(),
  });

  return msg;
};

/**
 * Get messages inside an accepted mentorship channel
 */
const getMessages = async (user, requestId) => {
  const request = await MentorshipRequest.findByPk(requestId);
  if (!request) {
    const error = new Error('Mentorship request not found');
    error.statusCode = 404;
    throw error;
  }

  if (request.studentId !== user.id && request.alumniId !== user.id && user.role !== 'admin') {
    const error = new Error('Access denied: You are not a participant in this mentorship');
    error.statusCode = 403;
    throw error;
  }

  return await MentorshipMessage.findAll({
    where: { mentorshipRequestId: requestId },
    include: [
      {
        model: User,
        as: 'sender',
        attributes: ['id', 'role'],
        include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName', 'profilePhoto'] }],
      },
    ],
    order: [['createdAt', 'ASC']],
  });
};

// ── 6. Feedback & Reputation ─────────────────────────────────────────────────

/**
 * Submit feedback for a completed mentorship
 */
const submitFeedback = async (user, requestId, feedbackData) => {
  const { rating, helpfulness, communication, review } = feedbackData;

  const request = await MentorshipRequest.findByPk(requestId);
  if (!request) {
    const error = new Error('Mentorship request not found');
    error.statusCode = 404;
    throw error;
  }

  if (request.studentId !== user.id && request.alumniId !== user.id) {
    const error = new Error('Only participants can submit feedback');
    error.statusCode = 403;
    throw error;
  }

  // Must be COMPLETED
  if (request.status !== 'COMPLETED') {
    const error = new Error('Feedback can only be submitted after the mentorship is COMPLETED');
    error.statusCode = 400;
    throw error;
  }

  const numRating = parseInt(rating, 10);
  if (!numRating || numRating < 1 || numRating > 5) {
    const error = new Error('Rating must be an integer between 1 and 5');
    error.statusCode = 400;
    throw error;
  }

  // Check duplicate feedback from this user
  const existing = await MentorshipFeedback.findOne({
    where: { mentorshipRequestId: requestId, reviewerId: user.id },
  });
  if (existing) {
    const error = new Error('Duplicate feedback: You have already submitted feedback for this mentorship');
    error.statusCode = 409;
    throw error;
  }

  const targetUserId = user.id === request.studentId ? request.alumniId : request.studentId;

  const feedback = await MentorshipFeedback.create({
    mentorshipRequestId: requestId,
    reviewerId: user.id,
    targetUserId,
    rating: numRating,
    helpfulness: helpfulness ? parseInt(helpfulness, 10) : numRating,
    communication: communication ? parseInt(communication, 10) : numRating,
    review: review ? review.trim() : null,
  });

  // Award Reputation (+15 points)
  try {
    await ReputationLog.create({
      userId: targetUserId,
      points: 15,
      actionType: 'mentorship_completed',
      reason: `Received ${numRating}-star mentorship review for topic: "${request.topic}"`,
      sourceId: request.id,
      actorId: user.id,
    });

    await StudentProfile.increment('reputationScore', {
      by: 15,
      where: { userId: targetUserId },
    });
  } catch (repErr) {
    logger.warn('Failed to award mentorship reputation score: ' + repErr.message);
  }

  // If rating is for alumni, update AlumniProfile average rating and feedback count
  if (targetUserId === request.alumniId && request.alumniProfileId) {
    try {
      const allAlumniFeedbacks = await MentorshipFeedback.findAll({
        where: { targetUserId: request.alumniId },
      });
      const avg = allAlumniFeedbacks.reduce((acc, f) => acc + f.rating, 0) / allAlumniFeedbacks.length;
      await AlumniProfile.update(
        {
          averageRating: parseFloat(avg.toFixed(2)),
          feedbackCount: allAlumniFeedbacks.length,
        },
        { where: { id: request.alumniProfileId } }
      );
    } catch (alumniErr) {
      logger.warn('Failed to update alumni feedback count: ' + alumniErr.message);
    }
  }

  // Notify recipient
  await notificationService.createNotification({
    userId: targetUserId,
    type: 'MENTORSHIP_FEEDBACK_RECEIVED',
    title: 'Mentorship Feedback Received',
    message: `You received a ${numRating}-star review for the mentorship on "${request.topic}".`,
    data: { feedbackId: feedback.id, mentorshipRequestId: request.id },
  });

  return feedback;
};

// ── 7. Bookmarks ─────────────────────────────────────────────────────────────

/**
 * Bookmark an alumni profile
 */
const bookmarkAlumni = async (studentUser, alumniProfileId) => {
  const profile = await AlumniProfile.findByPk(alumniProfileId);
  if (!profile) {
    const error = new Error('Alumni profile not found');
    error.statusCode = 404;
    throw error;
  }

  // Check duplicate
  const existing = await AlumniBookmark.findOne({
    where: { studentId: studentUser.id, alumniProfileId },
  });
  if (existing) {
    const error = new Error('Alumni profile already saved in bookmarks');
    error.statusCode = 409;
    throw error;
  }

  const bookmark = await AlumniBookmark.create({
    studentId: studentUser.id,
    alumniProfileId,
  });

  return bookmark;
};

/**
 * Remove an alumni bookmark
 */
const unbookmarkAlumni = async (studentUser, alumniProfileId) => {
  const deleted = await AlumniBookmark.destroy({
    where: { studentId: studentUser.id, alumniProfileId },
  });
  return { success: true, removedCount: deleted };
};

/**
 * Get all bookmarks for a student
 */
const getSavedAlumni = async (studentUser, options = {}) => {
  const { page = 1, limit = 20 } = options;
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(50, Math.max(1, parseInt(limit, 10)));
  const pageLimit = Math.min(50, Math.max(1, parseInt(limit, 10)));

  const { rows, count } = await AlumniBookmark.findAndCountAll({
    where: { studentId: studentUser.id },
    include: [
      {
        model: AlumniProfile,
        as: 'alumniProfile',
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'role'],
            include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName', 'profilePhoto', 'department'] }],
          },
          { model: Department, as: 'departmentRef', attributes: ['id', 'name', 'code'] },
        ],
      },
    ],
    order: [['createdAt', 'DESC']],
    limit: pageLimit,
    offset,
  });

  return {
    savedAlumni: rows.map((r) => r.alumniProfile).filter(Boolean),
    total: count,
    page: parseInt(page, 10) || 1,
    totalPages: Math.ceil(count / pageLimit),
  };
};

// ── 8. Admin Verification & Moderation ───────────────────────────────────────

/**
 * Admin: List alumni with filtering and verification state
 */
const getAdminAlumniList = async (adminUser, options = {}) => {
  const { search, status, departmentId, page = 1, limit = 20 } = options;

  const where = { collegeId: adminUser.collegeId };
  if (status) {
    where.verificationStatus = status;
  }
  if (departmentId) {
    where.departmentId = departmentId;
  }

  if (search && search.trim()) {
    const q = `%${search.trim()}%`;
    where[Op.or] = [
      { currentCompany: { [Op.like]: q } },
      { currentJobTitle: { [Op.like]: q } },
      { industry: { [Op.like]: q } },
    ];
  }

  const offset = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(50, Math.max(1, parseInt(limit, 10)));
  const pageLimit = Math.min(50, Math.max(1, parseInt(limit, 10)));

  const { rows, count } = await AlumniProfile.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'role', 'accountStatus', 'createdAt'],
        include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName', 'profilePhoto', 'usn', 'department'] }],
      },
      { model: Department, as: 'departmentRef', attributes: ['id', 'name', 'code'] },
      { model: User, as: 'verifiedByAdmin', attributes: ['id', 'email'] },
    ],
    order: [['createdAt', 'DESC']],
    limit: pageLimit,
    offset,
  });

  return {
    alumni: rows,
    total: count,
    page: parseInt(page, 10) || 1,
    totalPages: Math.ceil(count / pageLimit),
  };
};

/**
 * Admin: Verify an alumni profile
 */
const verifyAlumni = async (adminUser, alumniProfileId) => {
  const profile = await AlumniProfile.findByPk(alumniProfileId, {
    include: [{ model: User, as: 'user' }],
  });

  if (!profile) {
    const error = new Error('Alumni profile not found');
    error.statusCode = 404;
    throw error;
  }

  if (profile.collegeId !== adminUser.collegeId && adminUser.adminRole !== 'SUPER_ADMIN') {
    const error = new Error('Cross-college alumni moderation is forbidden');
    error.statusCode = 403;
    throw error;
  }

  await profile.update({
    verificationStatus: 'VERIFIED',
    verifiedAt: new Date(),
    verifiedById: adminUser.id,
    rejectionReason: null,
  });

  // Also ensure User is active and isAdminVerified
  if (profile.user) {
    await profile.user.update({
      isAdminVerified: true,
      accountStatus: 'active',
    });
  }

  // AuditLog
  await authService.logAuditEvent({
    actorId: adminUser.id,
    targetUserId: profile.userId,
    action: 'ALUMNI_VERIFIED',
    category: 'ALUMNI_MODERATION',
    ipAddress: null,
    details: { alumniProfileId: profile.id, graduationYear: profile.graduationYear },
  });

  // Notification to alumni
  await notificationService.createNotification({
    userId: profile.userId,
    type: 'ALUMNI_VERIFIED',
    title: 'Alumni Profile Verified!',
    message: 'Your alumni profile has been verified. You now appear in the alumni mentorship directory.',
    data: { alumniProfileId: profile.id },
  });

  return profile;
};

/**
 * Admin: Reject alumni verification request
 */
const rejectAlumni = async (adminUser, alumniProfileId, reason) => {
  if (!reason || !reason.trim()) {
    const error = new Error('Rejection reason is required');
    error.statusCode = 400;
    throw error;
  }

  const profile = await AlumniProfile.findByPk(alumniProfileId, {
    include: [{ model: User, as: 'user' }],
  });

  if (!profile) {
    const error = new Error('Alumni profile not found');
    error.statusCode = 404;
    throw error;
  }

  if (profile.collegeId !== adminUser.collegeId && adminUser.adminRole !== 'SUPER_ADMIN') {
    const error = new Error('Cross-college alumni moderation is forbidden');
    error.statusCode = 403;
    throw error;
  }

  await profile.update({
    verificationStatus: 'REJECTED',
    rejectionReason: reason.trim(),
    verifiedById: adminUser.id,
  });

  // AuditLog
  await authService.logAuditEvent({
    actorId: adminUser.id,
    targetUserId: profile.userId,
    action: 'ALUMNI_REJECTED',
    category: 'ALUMNI_MODERATION',
    ipAddress: null,
    details: { alumniProfileId: profile.id, reason: reason.trim() },
  });

  // Notification to user
  await notificationService.createNotification({
    userId: profile.userId,
    type: 'ALUMNI_REJECTED',
    title: 'Alumni Verification Rejected',
    message: `Your alumni verification request was rejected: ${reason.trim()}`,
    data: { alumniProfileId: profile.id, reason: reason.trim() },
  });

  return profile;
};

/**
 * Admin: Suspend alumni
 */
const suspendAlumni = async (adminUser, alumniProfileId, reason) => {
  const profile = await AlumniProfile.findByPk(alumniProfileId, {
    include: [{ model: User, as: 'user' }],
  });

  if (!profile) {
    const error = new Error('Alumni profile not found');
    error.statusCode = 404;
    throw error;
  }

  if (profile.collegeId !== adminUser.collegeId && adminUser.adminRole !== 'SUPER_ADMIN') {
    const error = new Error('Cross-college alumni moderation is forbidden');
    error.statusCode = 403;
    throw error;
  }

  await profile.update({
    verificationStatus: 'SUSPENDED',
    suspensionReason: reason ? reason.trim() : 'Suspended by admin',
  });

  // AuditLog
  await authService.logAuditEvent({
    actorId: adminUser.id,
    targetUserId: profile.userId,
    action: 'ALUMNI_SUSPENDED',
    category: 'ALUMNI_MODERATION',
    ipAddress: null,
    details: { alumniProfileId: profile.id, reason: reason || 'Suspended by admin' },
  });

  // Notification
  await notificationService.createNotification({
    userId: profile.userId,
    type: 'ALUMNI_SUSPENDED',
    title: 'Alumni Profile Suspended',
    message: 'Your alumni profile and mentorship activities have been suspended by college administration.',
    data: { alumniProfileId: profile.id },
  });

  return profile;
};

/**
 * Admin: Get Mentorship & Alumni Platform Statistics
 */
const getAdminAlumniStats = async (adminUser) => {
  const collegeId = adminUser.collegeId;

  const [
    totalAlumni,
    verifiedAlumni,
    pendingVerification,
    activeMentors,
    activeMentorships,
    completedMentorships,
    requestsAccepted,
    requestsDeclined,
  ] = await Promise.all([
    AlumniProfile.count({ where: { collegeId } }),
    AlumniProfile.count({ where: { collegeId, verificationStatus: 'VERIFIED' } }),
    AlumniProfile.count({ where: { collegeId, verificationStatus: 'PENDING' } }),
    AlumniProfile.count({
      where: {
        collegeId,
        verificationStatus: 'VERIFIED',
        availabilityStatus: { [Op.ne]: 'NOT_AVAILABLE' },
      },
    }),
    MentorshipRequest.count({
      where: {
        collegeId,
        status: { [Op.in]: ['ACCEPTED', 'ACTIVE'] },
      },
    }),
    MentorshipRequest.count({ where: { collegeId, status: 'COMPLETED' } }),
    MentorshipRequest.count({ where: { collegeId, status: { [Op.in]: ['ACCEPTED', 'ACTIVE', 'COMPLETED'] } } }),
    MentorshipRequest.count({ where: { collegeId, status: 'DECLINED' } }),
  ]);

  // Average Rating
  const verifiedWithRatings = await AlumniProfile.findAll({
    where: { collegeId, verificationStatus: 'VERIFIED', feedbackCount: { [Op.gt]: 0 } },
    attributes: ['averageRating'],
  });

  let averageRating = 0;
  if (verifiedWithRatings.length > 0) {
    const sum = verifiedWithRatings.reduce((acc, a) => acc + (a.averageRating || 0), 0);
    averageRating = parseFloat((sum / verifiedWithRatings.length).toFixed(2));
  }

  return {
    totalAlumni,
    verifiedAlumni,
    pendingVerification,
    activeMentors,
    activeMentorships,
    completedMentorships,
    requestsAccepted,
    requestsDeclined,
    averageRating,
  };
};

module.exports = {
  calculateMatchScore,
  areUsersBlocked,
  createOrUpdateProfile,
  getMyAlumniProfile,
  getAlumniProfileById,
  discoverAlumni,
  createMentorshipRequest,
  getMentorshipRequestById,
  acceptMentorshipRequest,
  declineMentorshipRequest,
  cancelMentorshipRequest,
  startMentorship,
  completeMentorship,
  getUserMentorships,
  scheduleSession,
  getSessions,
  updateSession,
  sendMessage,
  getMessages,
  submitFeedback,
  bookmarkAlumni,
  unbookmarkAlumni,
  getSavedAlumni,
  getAdminAlumniList,
  verifyAlumni,
  rejectAlumni,
  suspendAlumni,
  getAdminAlumniStats,
};
