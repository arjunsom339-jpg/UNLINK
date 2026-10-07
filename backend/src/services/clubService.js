'use strict';

const { Op, fn, col } = require('sequelize');
const {
  sequelize,
  Club,
  ClubMembership,
  ClubOfficer,
  ClubAnnouncement,
  ClubActivity,
  ClubElection,
  ClubElectionPosition,
  ClubCandidate,
  ClubVote,
  Event,
  Report,
  AuditLog,
  User,
  StudentProfile,
  TeacherProfile,
  Department,
  College,
} = require('../models');
const notificationService = require('./notificationService');

/**
 * CAMPUS CLUBS, STUDENT CHAPTERS & SOCIETIES SERVICE
 * Provides multi-college isolated operations for clubs, memberships,
 * leadership roles, announcements, internal activities, and elections.
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

const ALLOWED_CATEGORIES = [
  'TECHNICAL',
  'PROFESSIONAL',
  'CULTURAL',
  'SPORTS',
  'ACADEMIC',
  'SOCIAL_SERVICE',
  'ENTREPRENEURSHIP',
  'HOBBY',
  'DEPARTMENT',
  'OTHER',
];

const LEADERSHIP_ROLES = ['OFFICER', 'SECRETARY', 'TREASURER', 'VICE_PRESIDENT', 'PRESIDENT'];
const HIGH_LEADERSHIP_ROLES = ['VICE_PRESIDENT', 'PRESIDENT'];

/**
 * Get student's leadership role in a club
 */
const getClubUserRole = async (clubId, userId, userRole = null) => {
  if (!userId) return { isLeader: false, role: null, isPresident: false, isVP: false, isOfficer: false };

  // Admin has global leadership authority in their college
  if (userRole === 'admin') {
    return {
      isLeader: true,
      role: 'ADMIN',
      isPresident: true,
      isVP: true,
      isOfficer: true,
      isAdmin: true,
    };
  }

  const membership = await ClubMembership.findOne({
    where: { clubId, studentId: userId, status: 'ACTIVE' },
  });

  if (!membership) {
    return { isLeader: false, role: null, isPresident: false, isVP: false, isOfficer: false };
  }

  const role = membership.role;
  const isPresident = role === 'PRESIDENT';
  const isVP = role === 'VICE_PRESIDENT';
  const isOfficer = LEADERSHIP_ROLES.includes(role);

  return {
    isLeader: isOfficer,
    role,
    isPresident,
    isVP,
    isOfficer,
    isAdmin: false,
  };
};

/**
 * Assert user has minimum leadership authority in club
 */
const assertClubLeadership = async (user, clubId, minLevel = 'OFFICER') => {
  if (user.role === 'admin') return true;

  const auth = await getClubUserRole(clubId, user.id, user.role);

  if (minLevel === 'PRESIDENT' && !auth.isPresident) {
    const err = new Error('Only the club President or an Administrator can perform this action.');
    err.statusCode = 403;
    throw err;
  }

  if (minLevel === 'HIGH_LEADERSHIP' && !auth.isPresident && !auth.isVP) {
    const err = new Error('Only club executives (President / Vice President) or an Administrator can perform this action.');
    err.statusCode = 403;
    throw err;
  }

  if (minLevel === 'OFFICER' && !auth.isLeader) {
    const err = new Error('You do not have officer privileges in this club.');
    err.statusCode = 403;
    throw err;
  }

  return true;
};

// ── 1. CLUB PROPOSALS & LIFECYCLE ────────────────────────────────────────────

/**
 * Submit club proposal or direct creation by Admin
 */
const createClub = async (user, data) => {
  const {
    name,
    shortName,
    description,
    category = 'OTHER',
    departmentId,
    logo,
    coverImage,
    foundedYear,
    facultyAdvisorId,
    contactEmail,
    contactPhone,
    meetingLocation,
    meetingSchedule,
    website,
    socialLinks,
    membershipApprovalRequired = true,
    electionsEnabled = true,
  } = data;

  if (!name || !name.trim()) {
    const err = new Error('Club name is required.');
    err.statusCode = 400;
    throw err;
  }

  if (!description || !description.trim()) {
    const err = new Error('Club description is required.');
    err.statusCode = 400;
    throw err;
  }

  if (!ALLOWED_CATEGORIES.includes(category)) {
    const err = new Error(`Invalid category. Allowed: ${ALLOWED_CATEGORIES.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  // College isolation: collegeId derived strictly from authenticated user
  const collegeId = user.collegeId;
  if (!collegeId) {
    const err = new Error('User is not associated with any college institution.');
    err.statusCode = 400;
    throw err;
  }

  // If departmentId provided, ensure it belongs to the same college
  if (departmentId) {
    const dept = await Department.findOne({ where: { id: departmentId, collegeId } });
    if (!dept) {
      const err = new Error('Department not found in your college.');
      err.statusCode = 400;
      throw err;
    }
  }

  // Students submit proposals with status PENDING_REVIEW; Admin can create ACTIVE directly
  const status = user.role === 'admin' ? 'ACTIVE' : 'PENDING_REVIEW';

  const club = await Club.create({
    collegeId,
    departmentId: departmentId || null,
    name: name.trim(),
    shortName: shortName ? shortName.trim() : null,
    description: description.trim(),
    category,
    logo: logo || null,
    coverImage: coverImage || null,
    foundedYear: foundedYear ? parseInt(foundedYear, 10) : null,
    facultyAdvisorId: facultyAdvisorId || null,
    contactEmail: contactEmail ? contactEmail.trim() : null,
    contactPhone: contactPhone ? contactPhone.trim() : null,
    meetingLocation: meetingLocation ? meetingLocation.trim() : null,
    meetingSchedule: meetingSchedule ? meetingSchedule.trim() : null,
    website: website ? website.trim() : null,
    socialLinks: socialLinks || {},
    status,
    membershipApprovalRequired: !!membershipApprovalRequired,
    electionsEnabled: !!electionsEnabled,
    createdBy: user.id,
  });

  // If user is a student proposing the club, register them as the founding President candidate/member
  await ClubMembership.create({
    clubId: club.id,
    studentId: user.id,
    status: status === 'ACTIVE' ? 'ACTIVE' : 'PENDING',
    role: 'PRESIDENT',
    joinedAt: new Date(),
    approvedAt: status === 'ACTIVE' ? new Date() : null,
    approvedBy: status === 'ACTIVE' ? user.id : null,
    isCurrent: true,
  });

  if (status === 'ACTIVE') {
    await ClubOfficer.create({
      clubId: club.id,
      studentId: user.id,
      position: 'President',
      startDate: new Date(),
      appointedBy: user.id,
      status: 'ACTIVE',
    });
  }

  await AuditLog.create({
    actorId: user.id,
    action: status === 'ACTIVE' ? 'CLUB_CREATED_DIRECTLY' : 'CLUB_PROPOSAL_SUBMITTED',
    category: 'COMMUNITY',
    details: { clubId: club.id, name: club.name, status },
  });

  return club;
};

/**
 * Approve a pending club proposal (Admin only)
 */
const approveClub = async (adminUser, clubId) => {
  const where = { id: clubId };
  if (adminUser.adminRole !== 'SUPER_ADMIN') {
    where.collegeId = adminUser.collegeId;
  }

  const club = await Club.findOne({ where });
  if (!club) {
    const err = new Error('Club proposal not found.');
    err.statusCode = 404;
    throw err;
  }

  if (club.status === 'ACTIVE') {
    return club;
  }

  club.status = 'ACTIVE';
  await club.save();

  // Activate creator membership as President
  const membership = await ClubMembership.findOne({
    where: { clubId: club.id, studentId: club.createdBy },
  });

  if (membership) {
    membership.status = 'ACTIVE';
    membership.role = 'PRESIDENT';
    membership.approvedAt = new Date();
    membership.approvedBy = adminUser.id;
    await membership.save();
  }

  // Create active officer record
  await ClubOfficer.findOrCreate({
    where: { clubId: club.id, studentId: club.createdBy, position: 'President' },
    defaults: {
      startDate: new Date(),
      appointedBy: adminUser.id,
      status: 'ACTIVE',
    },
  });

  // Notify club creator
  await notificationService.createNotification({
    userId: club.createdBy,
    type: 'CLUB_APPROVED',
    title: 'Club Proposal Approved!',
    message: `Congratulations! Your club proposal for "${club.name}" has been approved and is now active.`,
    data: { clubId: club.id },
  });

  await AuditLog.create({
    actorId: adminUser.id,
    targetUserId: club.createdBy,
    action: 'CLUB_APPROVED',
    category: 'ADMIN_MODERATION',
    details: { clubId: club.id, name: club.name },
  });

  return club;
};

/**
 * Reject a club proposal (Admin only)
 */
const rejectClub = async (adminUser, clubId, { reason }) => {
  const where = { id: clubId };
  if (adminUser.adminRole !== 'SUPER_ADMIN') {
    where.collegeId = adminUser.collegeId;
  }

  const club = await Club.findOne({ where });
  if (!club) {
    const err = new Error('Club proposal not found.');
    err.statusCode = 404;
    throw err;
  }

  club.status = 'ARCHIVED';
  await club.save();

  await notificationService.createNotification({
    userId: club.createdBy,
    type: 'CLUB_REJECTED',
    title: 'Club Proposal Update',
    message: `Your club proposal for "${club.name}" was not approved.${reason ? ` Reason: ${reason}` : ''}`,
    data: { clubId: club.id, reason },
  });

  await AuditLog.create({
    actorId: adminUser.id,
    targetUserId: club.createdBy,
    action: 'CLUB_REJECTED',
    category: 'ADMIN_MODERATION',
    details: { clubId: club.id, name: club.name, reason },
  });

  return club;
};

/**
 * Suspend a club (Admin only)
 */
const suspendClub = async (adminUser, clubId, { reason }) => {
  const where = { id: clubId };
  if (adminUser.adminRole !== 'SUPER_ADMIN') {
    where.collegeId = adminUser.collegeId;
  }

  const club = await Club.findOne({ where });
  if (!club) {
    const err = new Error('Club not found.');
    err.statusCode = 404;
    throw err;
  }

  club.status = 'SUSPENDED';
  await club.save();

  await AuditLog.create({
    actorId: adminUser.id,
    action: 'CLUB_SUSPENDED',
    category: 'ADMIN_MODERATION',
    details: { clubId: club.id, name: club.name, reason },
  });

  return club;
};

/**
 * Archive a club (Admin only)
 */
const archiveClub = async (adminUser, clubId) => {
  const where = { id: clubId };
  if (adminUser.adminRole !== 'SUPER_ADMIN') {
    where.collegeId = adminUser.collegeId;
  }

  const club = await Club.findOne({ where });
  if (!club) {
    const err = new Error('Club not found.');
    err.statusCode = 404;
    throw err;
  }

  club.status = 'ARCHIVED';
  await club.save();

  await AuditLog.create({
    actorId: adminUser.id,
    action: 'CLUB_ARCHIVED',
    category: 'ADMIN_MODERATION',
    details: { clubId: club.id, name: club.name },
  });

  return club;
};

/**
 * Update club profile/settings (Admin or President/VP)
 */
const updateClub = async (user, clubId, data) => {
  const club = await Club.findOne({
    where: { id: clubId, collegeId: user.collegeId },
  });

  if (!club) {
    const err = new Error('Club not found.');
    err.statusCode = 404;
    throw err;
  }

  await assertClubLeadership(user, clubId, 'HIGH_LEADERSHIP');

  const allowedFields = [
    'name',
    'shortName',
    'description',
    'category',
    'departmentId',
    'logo',
    'coverImage',
    'foundedYear',
    'facultyAdvisorId',
    'contactEmail',
    'contactPhone',
    'meetingLocation',
    'meetingSchedule',
    'website',
    'socialLinks',
    'membershipApprovalRequired',
    'electionsEnabled',
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      club[field] = data[field];
    }
  }

  await club.save();

  await AuditLog.create({
    actorId: user.id,
    action: 'CLUB_UPDATED',
    category: 'COMMUNITY',
    details: { clubId: club.id, name: club.name },
  });

  return club;
};

// ── 2. CLUB DISCOVERY & DETAILS ──────────────────────────────────────────────

/**
 * Discover clubs with search, category, department, and pagination
 */
const getClubs = async (user, query = {}) => {
  const {
    search,
    category,
    departmentId,
    status = 'ACTIVE',
    page = 1,
    limit = 20,
    sortBy = 'newest',
  } = query;

  const where = { collegeId: user.collegeId };

  // Status filtering: students can only discover ACTIVE clubs
  if (user.role === 'admin' && status) {
    if (status !== 'all') {
      where.status = status;
    }
  } else {
    where.status = 'ACTIVE';
  }

  if (category && ALLOWED_CATEGORIES.includes(category)) {
    where.category = category;
  }

  if (departmentId) {
    where.departmentId = departmentId;
  }

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    where[Op.or] = [
      { name: { [Op.like]: term } },
      { shortName: { [Op.like]: term } },
      { description: { [Op.like]: term } },
    ];
  }

  let order = [['createdAt', 'DESC']];
  if (sortBy === 'name') {
    order = [['name', 'ASC']];
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const { count, rows } = await Club.findAndCountAll({
    where,
    order,
    offset,
    limit: limitNum,
    include: [
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name', 'code'],
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'email', 'role'],
        include: [
          {
            model: StudentProfile,
            as: 'studentProfile',
            attributes: ['fullName', 'profilePhoto'],
          },
        ],
      },
    ],
  });

  // Calculate active members count & user's current status for each club
  const clubIds = rows.map((c) => c.id);
  const membershipCounts = await ClubMembership.findAll({
    where: { clubId: { [Op.in]: clubIds }, status: 'ACTIVE' },
    attributes: ['clubId', [fn('COUNT', col('id')), 'memberCount']],
    group: ['clubId'],
    raw: true,
  });

  const memberCountMap = {};
  membershipCounts.forEach((m) => {
    memberCountMap[m.clubId] = parseInt(m.memberCount, 10);
  });

  let userMembershipMap = {};
  if (user && user.id) {
    const userMemberships = await ClubMembership.findAll({
      where: { clubId: { [Op.in]: clubIds }, studentId: user.id },
      attributes: ['clubId', 'status', 'role'],
      raw: true,
    });
    userMemberships.forEach((um) => {
      userMembershipMap[um.clubId] = { status: um.status, role: um.role };
    });
  }

  const clubsWithMeta = rows.map((club) => {
    const cJson = club.toJSON();
    cJson.memberCount = memberCountMap[club.id] || 0;
    cJson.myMembership = userMembershipMap[club.id] || null;
    return cJson;
  });

  return {
    clubs: clubsWithMeta,
    total: count,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(count / limitNum),
  };
};

/**
 * Get detailed club profile
 */
const getClubById = async (user, clubId) => {
  const club = await Club.findOne({
    where: { id: clubId, collegeId: user.collegeId },
    include: [
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name', 'code'],
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'email', 'role'],
        include: [
          {
            model: StudentProfile,
            as: 'studentProfile',
            attributes: ['fullName', 'profilePhoto'],
          },
        ],
      },
      {
        model: User,
        as: 'facultyAdvisor',
        attributes: ['id', 'email', 'role'],
        include: [
          {
            model: TeacherProfile,
            as: 'teacherProfile',
            attributes: ['fullName', 'designation', 'department'],
          },
        ],
      },
    ],
  });

  if (!club) {
    const err = new Error('Club not found in your college.');
    err.statusCode = 404;
    throw err;
  }

  // Access control for inactive clubs
  if (club.status !== 'ACTIVE') {
    const isOwner = club.createdBy === user.id;
    const isAdmin = user.role === 'admin';
    if (!isOwner && !isAdmin) {
      const err = new Error('This club is currently not active or under review.');
      err.statusCode = 404;
      throw err;
    }
  }

  const memberCount = await ClubMembership.count({
    where: { clubId: club.id, status: 'ACTIVE' },
  });

  const leadershipAuth = await getClubUserRole(club.id, user.id, user.role);

  let myMembership = null;
  if (user && user.id) {
    const mem = await ClubMembership.findOne({
      where: { clubId: club.id, studentId: user.id },
    });
    if (mem) {
      myMembership = {
        id: mem.id,
        status: mem.status,
        role: mem.role,
        joinedAt: mem.joinedAt,
      };
    }
  }

  const result = club.toJSON();
  result.memberCount = memberCount;
  result.myMembership = myMembership;
  result.permissions = leadershipAuth;

  return result;
};

// ── 3. MEMBERSHIP WORKFLOW ───────────────────────────────────────────────────

/**
 * Join club or submit membership request
 */
const joinClub = async (user, clubId) => {
  const club = await Club.findOne({
    where: { id: clubId, collegeId: user.collegeId },
  });

  if (!club) {
    const err = new Error('Club not found.');
    err.statusCode = 404;
    throw err;
  }

  if (club.status !== 'ACTIVE') {
    const err = new Error('Cannot join an inactive club.');
    err.statusCode = 400;
    throw err;
  }

  // Check existing membership
  const existing = await ClubMembership.findOne({
    where: { clubId, studentId: user.id },
  });

  if (existing) {
    if (existing.status === 'ACTIVE') {
      const err = new Error('You are already an active member of this club.');
      err.statusCode = 409;
      throw err;
    }
    if (existing.status === 'PENDING') {
      const err = new Error('You already have a pending membership request for this club.');
      err.statusCode = 409;
      throw err;
    }
    if (existing.status === 'SUSPENDED') {
      const err = new Error('Your membership in this club has been suspended.');
      err.statusCode = 403;
      throw err;
    }

    // If previously LEFT or REJECTED, re-apply
    const autoApprove = !club.membershipApprovalRequired;
    existing.status = autoApprove ? 'ACTIVE' : 'PENDING';
    existing.joinedAt = new Date();
    existing.leftAt = null;
    existing.role = 'MEMBER';
    existing.isCurrent = true;
    existing.approvedAt = autoApprove ? new Date() : null;
    await existing.save();

    if (!autoApprove) {
      // Notify club leaders
      const leaders = await ClubMembership.findAll({
        where: { clubId, status: 'ACTIVE', role: { [Op.in]: HIGH_LEADERSHIP_ROLES } },
      });
      for (const leader of leaders) {
        await notificationService.createNotification({
          userId: leader.studentId,
          type: 'CLUB_MEMBERSHIP_REQUEST',
          title: `New Membership Request: ${club.name}`,
          message: `A student has requested to join ${club.name}.`,
          data: { clubId, studentId: user.id },
        });
      }
    }

    return existing;
  }

  const autoApprove = !club.membershipApprovalRequired;
  const membership = await ClubMembership.create({
    clubId,
    studentId: user.id,
    status: autoApprove ? 'ACTIVE' : 'PENDING',
    role: 'MEMBER',
    joinedAt: new Date(),
    approvedAt: autoApprove ? new Date() : null,
    isCurrent: true,
  });

  if (!autoApprove) {
    const leaders = await ClubMembership.findAll({
      where: { clubId, status: 'ACTIVE', role: { [Op.in]: HIGH_LEADERSHIP_ROLES } },
    });
    for (const leader of leaders) {
      await notificationService.createNotification({
        userId: leader.studentId,
        type: 'CLUB_MEMBERSHIP_REQUEST',
        title: `New Membership Request: ${club.name}`,
        message: `A student has requested to join ${club.name}.`,
        data: { clubId, studentId: user.id },
      });
    }
  }

  return membership;
};

/**
 * Leave club or cancel pending membership request
 */
const leaveClub = async (user, clubId) => {
  const membership = await ClubMembership.findOne({
    where: { clubId, studentId: user.id, isCurrent: true },
  });

  if (!membership || membership.status === 'LEFT') {
    const err = new Error('You do not have an active or pending membership in this club.');
    err.statusCode = 404;
    throw err;
  }

  membership.status = 'LEFT';
  membership.leftAt = new Date();
  membership.isCurrent = false;
  await membership.save();

  // Also inactivate any officer position
  await ClubOfficer.update(
    { status: 'INACTIVE', endDate: new Date() },
    { where: { clubId, studentId: user.id, status: 'ACTIVE' } }
  );

  return { success: true, message: 'You have left the club.' };
};

/**
 * Get authenticated user's clubs
 */
const getMyClubs = async (user) => {
  const memberships = await ClubMembership.findAll({
    where: { studentId: user.id, isCurrent: true },
    include: [
      {
        model: Club,
        as: 'club',
        where: { collegeId: user.collegeId },
        include: [
          {
            model: Department,
            as: 'department',
            attributes: ['id', 'name', 'code'],
          },
        ],
      },
    ],
    order: [['joinedAt', 'DESC']],
  });

  return memberships;
};

/**
 * Get club members list (with privacy filtering)
 */
const getClubMembers = async (user, clubId, query = {}) => {
  const club = await Club.findOne({
    where: { id: clubId, collegeId: user.collegeId },
  });

  if (!club) {
    const err = new Error('Club not found.');
    err.statusCode = 404;
    throw err;
  }

  const { status = 'ACTIVE', page = 1, limit = 20, search } = query;
  const where = { clubId, status };

  // Only leaders/admin can view PENDING requests
  if (status === 'PENDING') {
    await assertClubLeadership(user, clubId, 'OFFICER');
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const { count, rows } = await ClubMembership.findAndCountAll({
    where,
    order: [
      ['role', 'DESC'],
      ['joinedAt', 'ASC'],
    ],
    offset,
    limit: limitNum,
    include: [
      {
        model: User,
        as: 'student',
        attributes: ['id', 'email', 'role'],
        include: [
          {
            model: StudentProfile,
            as: 'studentProfile',
            attributes: ['fullName', 'department', 'semester', 'profilePhoto'],
          },
        ],
      },
    ],
  });

  return {
    members: rows,
    total: count,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(count / limitNum),
  };
};

/**
 * Get pending membership requests for a club
 */
const getClubMembershipRequests = async (user, clubId) => {
  const club = await Club.findOne({
    where: { id: clubId, collegeId: user.collegeId },
  });

  if (!club) {
    const err = new Error('Club not found.');
    err.statusCode = 404;
    throw err;
  }

  await assertClubLeadership(user, clubId, 'OFFICER');

  const requests = await ClubMembership.findAll({
    where: { clubId, status: 'PENDING' },
    order: [['joinedAt', 'ASC']],
    include: [
      {
        model: User,
        as: 'student',
        attributes: ['id', 'email'],
        include: [
          {
            model: StudentProfile,
            as: 'studentProfile',
            attributes: ['fullName', 'department', 'semester', 'profilePhoto'],
          },
        ],
      },
    ],
  });

  return requests;
};

/**
 * Approve membership request
 */
const approveMembershipRequest = async (user, requestId) => {
  const membership = await ClubMembership.findOne({
    where: { id: requestId, status: 'PENDING' },
    include: [{ model: Club, as: 'club' }],
  });

  if (!membership) {
    const err = new Error('Pending membership request not found.');
    err.statusCode = 404;
    throw err;
  }

  // Enforce college isolation & officer leadership
  if (membership.club.collegeId !== user.collegeId) {
    const err = new Error('Forbidden. Cross-college membership cannot be modified.');
    err.statusCode = 403;
    throw err;
  }

  await assertClubLeadership(user, membership.clubId, 'OFFICER');

  membership.status = 'ACTIVE';
  membership.approvedAt = new Date();
  membership.approvedBy = user.id;
  await membership.save();

  await notificationService.createNotification({
    userId: membership.studentId,
    type: 'CLUB_MEMBERSHIP_APPROVED',
    title: `Membership Approved: ${membership.club.name}`,
    message: `Your membership request for ${membership.club.name} has been approved!`,
    data: { clubId: membership.clubId },
  });

  await AuditLog.create({
    actorId: user.id,
    targetUserId: membership.studentId,
    action: 'CLUB_MEMBER_APPROVED',
    category: 'COMMUNITY',
    details: { clubId: membership.clubId, membershipId: membership.id },
  });

  return membership;
};

/**
 * Reject membership request
 */
const rejectMembershipRequest = async (user, requestId, { reason } = {}) => {
  const membership = await ClubMembership.findOne({
    where: { id: requestId, status: 'PENDING' },
    include: [{ model: Club, as: 'club' }],
  });

  if (!membership) {
    const err = new Error('Pending membership request not found.');
    err.statusCode = 404;
    throw err;
  }

  if (membership.club.collegeId !== user.collegeId) {
    const err = new Error('Forbidden. Cross-college membership cannot be modified.');
    err.statusCode = 403;
    throw err;
  }

  await assertClubLeadership(user, membership.clubId, 'OFFICER');

  membership.status = 'REJECTED';
  membership.isCurrent = false;
  await membership.save();

  await notificationService.createNotification({
    userId: membership.studentId,
    type: 'CLUB_MEMBERSHIP_REJECTED',
    title: `Membership Update: ${membership.club.name}`,
    message: `Your membership request for ${membership.club.name} was not accepted.${reason ? ` Reason: ${reason}` : ''}`,
    data: { clubId: membership.clubId },
  });

  await AuditLog.create({
    actorId: user.id,
    targetUserId: membership.studentId,
    action: 'CLUB_MEMBER_REJECTED',
    category: 'COMMUNITY',
    details: { clubId: membership.clubId, membershipId: membership.id, reason },
  });

  return membership;
};

/**
 * Suspend club member
 */
const suspendMember = async (user, membershipId, { reason } = {}) => {
  const membership = await ClubMembership.findOne({
    where: { id: membershipId },
    include: [{ model: Club, as: 'club' }],
  });

  if (!membership) {
    const err = new Error('Member record not found.');
    err.statusCode = 404;
    throw err;
  }

  if (membership.club.collegeId !== user.collegeId) {
    const err = new Error('Forbidden.');
    err.statusCode = 403;
    throw err;
  }

  await assertClubLeadership(user, membership.clubId, 'HIGH_LEADERSHIP');

  membership.status = 'SUSPENDED';
  await membership.save();

  await ClubOfficer.update(
    { status: 'INACTIVE', endDate: new Date() },
    { where: { clubId: membership.clubId, studentId: membership.studentId, status: 'ACTIVE' } }
  );

  await notificationService.createNotification({
    userId: membership.studentId,
    type: 'CLUB_MEMBERSHIP_SUSPENDED',
    title: `Membership Suspended: ${membership.club.name}`,
    message: `Your membership in ${membership.club.name} has been suspended.${reason ? ` Reason: ${reason}` : ''}`,
    data: { clubId: membership.clubId },
  });

  await AuditLog.create({
    actorId: user.id,
    targetUserId: membership.studentId,
    action: 'CLUB_MEMBER_SUSPENDED',
    category: 'COMMUNITY',
    details: { clubId: membership.clubId, membershipId: membership.id, reason },
  });

  return membership;
};

/**
 * Promote member or update club leadership role (Self-promotion blocked)
 */
const promoteMember = async (user, membershipId, { newRole, positionTitle }) => {
  const membership = await ClubMembership.findOne({
    where: { id: membershipId, status: 'ACTIVE' },
    include: [{ model: Club, as: 'club' }],
  });

  if (!membership) {
    const err = new Error('Active member record not found.');
    err.statusCode = 404;
    throw err;
  }

  if (membership.club.collegeId !== user.collegeId) {
    const err = new Error('Forbidden.');
    err.statusCode = 403;
    throw err;
  }

  // Enforce self-promotion block
  if (user.role !== 'admin' && user.id === membership.studentId) {
    const err = new Error('Students are not permitted to promote themselves.');
    err.statusCode = 403;
    throw err;
  }

  await assertClubLeadership(user, membership.clubId, 'HIGH_LEADERSHIP');

  const VALID_ROLES = ['MEMBER', 'OFFICER', 'SECRETARY', 'TREASURER', 'VICE_PRESIDENT', 'PRESIDENT'];
  if (!VALID_ROLES.includes(newRole)) {
    const err = new Error(`Invalid role. Valid roles are: ${VALID_ROLES.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  membership.role = newRole;
  await membership.save();

  const title = positionTitle || (newRole === 'MEMBER' ? 'Member' : newRole.replace('_', ' '));

  if (newRole !== 'MEMBER') {
    await ClubOfficer.create({
      clubId: membership.clubId,
      studentId: membership.studentId,
      position: title,
      startDate: new Date(),
      appointedBy: user.id,
      status: 'ACTIVE',
    });
  }

  await notificationService.createNotification({
    userId: membership.studentId,
    type: 'CLUB_OFFICER_APPOINTED',
    title: `Role Update in ${membership.club.name}`,
    message: `You have been appointed as ${title} in ${membership.club.name}!`,
    data: { clubId: membership.clubId, role: newRole },
  });

  await AuditLog.create({
    actorId: user.id,
    targetUserId: membership.studentId,
    action: 'CLUB_OFFICER_APPOINTED',
    category: 'COMMUNITY',
    details: { clubId: membership.clubId, newRole, positionTitle: title },
  });

  return membership;
};

// ── 4. LEADERSHIP & OFFICERS ─────────────────────────────────────────────────

/**
 * Get club leadership and officers list
 */
const getClubLeadership = async (user, clubId) => {
  const club = await Club.findOne({
    where: { id: clubId, collegeId: user.collegeId },
  });

  if (!club) {
    const err = new Error('Club not found.');
    err.statusCode = 404;
    throw err;
  }

  const officers = await ClubOfficer.findAll({
    where: { clubId, status: 'ACTIVE' },
    order: [['startDate', 'ASC']],
    include: [
      {
        model: User,
        as: 'student',
        attributes: ['id', 'email'],
        include: [
          {
            model: StudentProfile,
            as: 'studentProfile',
            attributes: ['fullName', 'department', 'semester', 'profilePhoto'],
          },
        ],
      },
    ],
  });

  return officers;
};

/**
 * Appoint an officer
 */
const appointOfficer = async (user, clubId, { studentId, position }) => {
  const club = await Club.findOne({
    where: { id: clubId, collegeId: user.collegeId },
  });

  if (!club) {
    const err = new Error('Club not found.');
    err.statusCode = 404;
    throw err;
  }

  await assertClubLeadership(user, clubId, 'HIGH_LEADERSHIP');

  if (!studentId || !position || !position.trim()) {
    const err = new Error('Student ID and position title are required.');
    err.statusCode = 400;
    throw err;
  }

  // Student must be an active member
  const membership = await ClubMembership.findOne({
    where: { clubId, studentId, status: 'ACTIVE' },
  });

  if (!membership) {
    const err = new Error('Student must be an active member of the club before appointment.');
    err.statusCode = 400;
    throw err;
  }

  const officer = await ClubOfficer.create({
    clubId,
    studentId,
    position: position.trim(),
    startDate: new Date(),
    appointedBy: user.id,
    status: 'ACTIVE',
  });

  if (membership.role === 'MEMBER') {
    membership.role = 'OFFICER';
    await membership.save();
  }

  await notificationService.createNotification({
    userId: studentId,
    type: 'CLUB_OFFICER_APPOINTED',
    title: `Appointed to Leadership: ${club.name}`,
    message: `You have been appointed as ${position.trim()} of ${club.name}.`,
    data: { clubId, position: position.trim() },
  });

  return officer;
};

/**
 * Remove an officer
 */
const removeOfficer = async (user, officerId) => {
  const officer = await ClubOfficer.findOne({
    where: { id: officerId, status: 'ACTIVE' },
    include: [{ model: Club, as: 'club' }],
  });

  if (!officer) {
    const err = new Error('Active officer record not found.');
    err.statusCode = 404;
    throw err;
  }

  if (officer.club.collegeId !== user.collegeId) {
    const err = new Error('Forbidden.');
    err.statusCode = 403;
    throw err;
  }

  await assertClubLeadership(user, officer.clubId, 'HIGH_LEADERSHIP');

  officer.status = 'INACTIVE';
  officer.endDate = new Date();
  await officer.save();

  return { success: true, message: 'Officer position removed.' };
};

// ── 5. ANNOUNCEMENTS ─────────────────────────────────────────────────────────

/**
 * Get club announcements
 */
const getClubAnnouncements = async (user, clubId, query = {}) => {
  const club = await Club.findOne({
    where: { id: clubId, collegeId: user.collegeId },
  });

  if (!club) {
    const err = new Error('Club not found.');
    err.statusCode = 404;
    throw err;
  }

  const { page = 1, limit = 20 } = query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const { count, rows } = await ClubAnnouncement.findAndCountAll({
    where: { clubId, status: 'PUBLISHED' },
    order: [
      ['pinned', 'DESC'],
      ['publishedAt', 'DESC'],
    ],
    offset,
    limit: limitNum,
    include: [
      {
        model: User,
        as: 'author',
        attributes: ['id', 'email'],
        include: [
          {
            model: StudentProfile,
            as: 'studentProfile',
            attributes: ['fullName', 'profilePhoto'],
          },
        ],
      },
    ],
  });

  return {
    announcements: rows,
    total: count,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(count / limitNum),
  };
};

/**
 * Create club announcement (Officers or Admin)
 */
const createClubAnnouncement = async (user, clubId, data) => {
  const club = await Club.findOne({
    where: { id: clubId, collegeId: user.collegeId },
  });

  if (!club) {
    const err = new Error('Club not found.');
    err.statusCode = 404;
    throw err;
  }

  await assertClubLeadership(user, clubId, 'OFFICER');

  const { title, content, pinned = false } = data;

  if (!title || !title.trim()) {
    const err = new Error('Announcement title is required.');
    err.statusCode = 400;
    throw err;
  }

  if (!content || !content.trim()) {
    const err = new Error('Announcement content is required.');
    err.statusCode = 400;
    throw err;
  }

  const announcement = await ClubAnnouncement.create({
    clubId,
    authorId: user.id,
    title: title.trim(),
    content: content.trim(),
    pinned: !!pinned,
    publishedAt: new Date(),
    status: 'PUBLISHED',
  });

  // Notify all active club members
  const members = await ClubMembership.findAll({
    where: { clubId, status: 'ACTIVE' },
    attributes: ['studentId'],
  });

  for (const m of members) {
    if (m.studentId !== user.id) {
      await notificationService.createNotification({
        userId: m.studentId,
        type: 'CLUB_ANNOUNCEMENT',
        title: `${club.name}: ${title.trim()}`,
        message: content.trim().slice(0, 150) + (content.length > 150 ? '...' : ''),
        data: { clubId, announcementId: announcement.id },
      });
    }
  }

  return announcement;
};

/**
 * Update club announcement
 */
const updateClubAnnouncement = async (user, announcementId, data) => {
  const announcement = await ClubAnnouncement.findOne({
    where: { id: announcementId },
    include: [{ model: Club, as: 'club' }],
  });

  if (!announcement) {
    const err = new Error('Announcement not found.');
    err.statusCode = 404;
    throw err;
  }

  if (announcement.club.collegeId !== user.collegeId) {
    const err = new Error('Forbidden.');
    err.statusCode = 403;
    throw err;
  }

  // Author, President/VP, or Admin can edit
  const auth = await getClubUserRole(announcement.clubId, user.id, user.role);
  if (user.id !== announcement.authorId && !auth.isPresident && !auth.isVP && !auth.isAdmin) {
    const err = new Error('You do not have authorization to edit this announcement.');
    err.statusCode = 403;
    throw err;
  }

  if (data.title) announcement.title = data.title.trim();
  if (data.content) announcement.content = data.content.trim();
  if (data.pinned !== undefined) announcement.pinned = !!data.pinned;
  if (data.status) announcement.status = data.status;

  await announcement.save();
  return announcement;
};

/**
 * Delete club announcement
 */
const deleteClubAnnouncement = async (user, announcementId) => {
  const announcement = await ClubAnnouncement.findOne({
    where: { id: announcementId },
    include: [{ model: Club, as: 'club' }],
  });

  if (!announcement) {
    const err = new Error('Announcement not found.');
    err.statusCode = 404;
    throw err;
  }

  if (announcement.club.collegeId !== user.collegeId) {
    const err = new Error('Forbidden.');
    err.statusCode = 403;
    throw err;
  }

  const auth = await getClubUserRole(announcement.clubId, user.id, user.role);
  if (user.id !== announcement.authorId && !auth.isPresident && !auth.isVP && !auth.isAdmin) {
    const err = new Error('You do not have authorization to delete this announcement.');
    err.statusCode = 403;
    throw err;
  }

  await announcement.destroy();
  return { success: true, message: 'Announcement deleted.' };
};

// ── 6. CLUB ACTIVITIES ───────────────────────────────────────────────────────

/**
 * Get club activities (strictly enforces CLUB_ONLY privacy)
 */
const getClubActivities = async (user, clubId, query = {}) => {
  const club = await Club.findOne({
    where: { id: clubId, collegeId: user.collegeId },
  });

  if (!club) {
    const err = new Error('Club not found.');
    err.statusCode = 404;
    throw err;
  }

  // Check if current user is an active member or admin
  let isMemberOrAdmin = user.role === 'admin';
  if (!isMemberOrAdmin && user.id) {
    const mem = await ClubMembership.findOne({
      where: { clubId, studentId: user.id, status: 'ACTIVE' },
    });
    if (mem) isMemberOrAdmin = true;
  }

  const where = { clubId };

  // PRIVACY RULE: If non-member, ONLY return visibility = COLLEGE
  if (!isMemberOrAdmin) {
    where.visibility = 'COLLEGE';
  }

  const activities = await ClubActivity.findAll({
    where,
    order: [['startAt', 'ASC']],
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'email'],
        include: [
          {
            model: StudentProfile,
            as: 'studentProfile',
            attributes: ['fullName', 'profilePhoto'],
          },
        ],
      },
    ],
  });

  return activities;
};

/**
 * Create club activity
 */
const createClubActivity = async (user, clubId, data) => {
  const club = await Club.findOne({
    where: { id: clubId, collegeId: user.collegeId },
  });

  if (!club) {
    const err = new Error('Club not found.');
    err.statusCode = 404;
    throw err;
  }

  await assertClubLeadership(user, clubId, 'OFFICER');

  const {
    title,
    description,
    activityType = 'MEETING',
    location,
    startAt,
    endAt,
    capacity,
    registrationRequired = false,
    visibility = 'CLUB_ONLY',
  } = data;

  if (!title || !title.trim()) {
    const err = new Error('Activity title is required.');
    err.statusCode = 400;
    throw err;
  }

  if (!description || !description.trim()) {
    const err = new Error('Activity description is required.');
    err.statusCode = 400;
    throw err;
  }

  if (!startAt) {
    const err = new Error('Activity start date/time is required.');
    err.statusCode = 400;
    throw err;
  }

  const activity = await ClubActivity.create({
    clubId,
    title: title.trim(),
    description: description.trim(),
    activityType,
    location: location ? location.trim() : null,
    startAt: new Date(startAt),
    endAt: endAt ? new Date(endAt) : null,
    capacity: capacity ? parseInt(capacity, 10) : null,
    registrationRequired: !!registrationRequired,
    visibility,
    status: 'UPCOMING',
    createdBy: user.id,
  });

  return activity;
};

/**
 * Update club activity
 */
const updateClubActivity = async (user, activityId, data) => {
  const activity = await ClubActivity.findOne({
    where: { id: activityId },
    include: [{ model: Club, as: 'club' }],
  });

  if (!activity) {
    const err = new Error('Activity not found.');
    err.statusCode = 404;
    throw err;
  }

  if (activity.club.collegeId !== user.collegeId) {
    const err = new Error('Forbidden.');
    err.statusCode = 403;
    throw err;
  }

  await assertClubLeadership(user, activity.clubId, 'OFFICER');

  const fields = ['title', 'description', 'activityType', 'location', 'startAt', 'endAt', 'capacity', 'registrationRequired', 'status', 'visibility'];
  for (const f of fields) {
    if (data[f] !== undefined) {
      activity[f] = data[f];
    }
  }

  await activity.save();
  return activity;
};

/**
 * Delete club activity
 */
const deleteClubActivity = async (user, activityId) => {
  const activity = await ClubActivity.findOne({
    where: { id: activityId },
    include: [{ model: Club, as: 'club' }],
  });

  if (!activity) {
    const err = new Error('Activity not found.');
    err.statusCode = 404;
    throw err;
  }

  if (activity.club.collegeId !== user.collegeId) {
    const err = new Error('Forbidden.');
    err.statusCode = 403;
    throw err;
  }

  await assertClubLeadership(user, activity.clubId, 'OFFICER');

  await activity.destroy();
  return { success: true, message: 'Activity deleted.' };
};

// ── 7. CLUB ELECTIONS & VOTING ───────────────────────────────────────────────

/**
 * Create club election (President, VP, or Admin)
 */
const createClubElection = async (user, clubId, data) => {
  const club = await Club.findOne({
    where: { id: clubId, collegeId: user.collegeId },
  });

  if (!club) {
    const err = new Error('Club not found.');
    err.statusCode = 404;
    throw err;
  }

  if (!club.electionsEnabled) {
    const err = new Error('Elections are not enabled for this club.');
    err.statusCode = 400;
    throw err;
  }

  await assertClubLeadership(user, clubId, 'HIGH_LEADERSHIP');

  const { title, description, startAt, endAt, eligibleMembershipRule = {} } = data;

  if (!title || !title.trim()) {
    const err = new Error('Election title is required.');
    err.statusCode = 400;
    throw err;
  }

  if (!startAt || !endAt) {
    const err = new Error('Election start and end dates are required.');
    err.statusCode = 400;
    throw err;
  }

  const startDate = new Date(startAt);
  const endDate = new Date(endAt);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    const err = new Error('Invalid election date format.');
    err.statusCode = 400;
    throw err;
  }

  if (endDate <= startDate) {
    const err = new Error('Election end date must be after the start date.');
    err.statusCode = 400;
    throw err;
  }

  const election = await ClubElection.create({
    clubId,
    title: title.trim(),
    description: description ? description.trim() : 'Club leadership election',
    startAt: startDate,
    endAt: endDate,
    status: 'DRAFT',
    eligibleMembershipRule,
    createdBy: user.id,
  });

  await AuditLog.create({
    actorId: user.id,
    action: 'CLUB_ELECTION_CREATED',
    category: 'COMMUNITY',
    details: { clubId, electionId: election.id, title: election.title },
  });

  return election;
};

/**
 * Add an election position (e.g. President, Vice President)
 */
const addElectionPosition = async (user, electionId, data) => {
  const election = await ClubElection.findOne({
    where: { id: electionId },
    include: [{ model: Club, as: 'club' }],
  });

  if (!election) {
    const err = new Error('Election not found.');
    err.statusCode = 404;
    throw err;
  }

  if (election.club.collegeId !== user.collegeId) {
    const err = new Error('Forbidden.');
    err.statusCode = 403;
    throw err;
  }

  await assertClubLeadership(user, election.clubId, 'HIGH_LEADERSHIP');

  if (['OPEN', 'CLOSED', 'RESULTS_PUBLISHED'].includes(election.status)) {
    const err = new Error('Cannot add positions to an ongoing or completed election.');
    err.statusCode = 400;
    throw err;
  }

  const { title, maxWinners = 1, description } = data;

  if (!title || !title.trim()) {
    const err = new Error('Position title is required.');
    err.statusCode = 400;
    throw err;
  }

  const position = await ClubElectionPosition.create({
    electionId,
    title: title.trim(),
    maxWinners: parseInt(maxWinners, 10) || 1,
    description: description ? description.trim() : null,
  });

  return position;
};

/**
 * Nominate candidate for an election position
 */
const nominateCandidate = async (user, positionId, { manifesto }) => {
  const position = await ClubElectionPosition.findOne({
    where: { id: positionId },
    include: [
      {
        model: ClubElection,
        as: 'election',
        include: [{ model: Club, as: 'club' }],
      },
    ],
  });

  if (!position) {
    const err = new Error('Election position not found.');
    err.statusCode = 404;
    throw err;
  }

  const election = position.election;
  const club = election.club;

  // College isolation
  if (club.collegeId !== user.collegeId) {
    const err = new Error('Forbidden. Cross-college nomination blocked.');
    err.statusCode = 403;
    throw err;
  }

  if (['CLOSED', 'RESULTS_PUBLISHED', 'CANCELLED'].includes(election.status)) {
    const err = new Error('Nominations are closed for this election.');
    err.statusCode = 400;
    throw err;
  }

  // Candidate must be an ACTIVE member of the club!
  const membership = await ClubMembership.findOne({
    where: { clubId: club.id, studentId: user.id, status: 'ACTIVE' },
  });

  if (!membership) {
    const err = new Error('You must be an active member of this club to stand as a candidate.');
    err.statusCode = 403;
    throw err;
  }

  // Check duplicate nomination
  const existing = await ClubCandidate.findOne({
    where: { electionPositionId: positionId, studentId: user.id },
  });

  if (existing) {
    const err = new Error('You have already submitted a candidacy for this position.');
    err.statusCode = 409;
    throw err;
  }

  if (!manifesto || !manifesto.trim()) {
    const err = new Error('Candidate manifesto is required.');
    err.statusCode = 400;
    throw err;
  }

  const candidate = await ClubCandidate.create({
    electionPositionId: positionId,
    studentId: user.id,
    manifesto: manifesto.trim(),
    approved: false,
    approvedBy: null,
  });

  return candidate;
};

/**
 * Approve or verify candidate
 */
const approveCandidate = async (user, candidateId) => {
  const candidate = await ClubCandidate.findOne({
    where: { id: candidateId },
    include: [
      {
        model: ClubElectionPosition,
        as: 'position',
        include: [
          {
            model: ClubElection,
            as: 'election',
            include: [{ model: Club, as: 'club' }],
          },
        ],
      },
    ],
  });

  if (!candidate) {
    const err = new Error('Candidate nomination not found.');
    err.statusCode = 404;
    throw err;
  }

  const clubId = candidate.position.election.clubId;
  const collegeId = candidate.position.election.club.collegeId;

  if (collegeId !== user.collegeId) {
    const err = new Error('Forbidden.');
    err.statusCode = 403;
    throw err;
  }

  await assertClubLeadership(user, clubId, 'HIGH_LEADERSHIP');

  candidate.approved = true;
  candidate.approvedBy = user.id;
  await candidate.save();

  await notificationService.createNotification({
    userId: candidate.studentId,
    type: 'CLUB_CANDIDATE_APPROVED',
    title: 'Candidacy Approved!',
    message: `Your candidacy for "${candidate.position.title}" has been approved!`,
    data: { candidateId: candidate.id, positionId: candidate.electionPositionId },
  });

  return candidate;
};

/**
 * Open election for voting (Validates positions and approved candidates)
 */
const openElection = async (user, electionId) => {
  const election = await ClubElection.findOne({
    where: { id: electionId },
    include: [
      { model: Club, as: 'club' },
      {
        model: ClubElectionPosition,
        as: 'positions',
        include: [{ model: ClubCandidate, as: 'candidates' }],
      },
    ],
  });

  if (!election) {
    const err = new Error('Election not found.');
    err.statusCode = 404;
    throw err;
  }

  if (election.club.collegeId !== user.collegeId) {
    const err = new Error('Forbidden.');
    err.statusCode = 403;
    throw err;
  }

  await assertClubLeadership(user, election.clubId, 'HIGH_LEADERSHIP');

  if (election.status === 'OPEN') {
    return election;
  }

  // Pre-requisite validation
  if (!election.positions || election.positions.length === 0) {
    const err = new Error('Election must have at least one position before opening.');
    err.statusCode = 400;
    throw err;
  }

  const approvedCandidates = election.positions.flatMap((p) => p.candidates).filter((c) => c.approved);
  if (approvedCandidates.length === 0) {
    const err = new Error('Election must have at least one approved candidate before opening.');
    err.statusCode = 400;
    throw err;
  }

  election.status = 'OPEN';
  await election.save();

  // Notify active members that election is OPEN
  const members = await ClubMembership.findAll({
    where: { clubId: election.clubId, status: 'ACTIVE' },
  });

  for (const m of members) {
    await notificationService.createNotification({
      userId: m.studentId,
      type: 'CLUB_ELECTION_OPEN',
      title: `Voting is Open: ${election.title}`,
      message: `Cast your vote for leadership in ${election.club.name}!`,
      data: { electionId: election.id, clubId: election.clubId },
    });
  }

  await AuditLog.create({
    actorId: user.id,
    action: 'CLUB_ELECTION_OPENED',
    category: 'COMMUNITY',
    details: { clubId: election.clubId, electionId: election.id },
  });

  return election;
};

/**
 * Close election
 */
const closeElection = async (user, electionId) => {
  const election = await ClubElection.findOne({
    where: { id: electionId },
    include: [{ model: Club, as: 'club' }],
  });

  if (!election) {
    const err = new Error('Election not found.');
    err.statusCode = 404;
    throw err;
  }

  if (election.club.collegeId !== user.collegeId) {
    const err = new Error('Forbidden.');
    err.statusCode = 403;
    throw err;
  }

  await assertClubLeadership(user, election.clubId, 'HIGH_LEADERSHIP');

  election.status = 'CLOSED';
  await election.save();

  await AuditLog.create({
    actorId: user.id,
    action: 'CLUB_ELECTION_CLOSED',
    category: 'COMMUNITY',
    details: { clubId: election.clubId, electionId: election.id },
  });

  return election;
};

/**
 * Cast a vote in an open election
 * STRICT REQUIREMENTS:
 * - Election must be OPEN and within date window
 * - Voter must be an ACTIVE club member from the same college
 * - Exactly one vote per position per student (database unique constraint)
 * - Candidate must be APPROVED for that position
 * - Voter privacy: Choices are never revealed in public reports
 */
const voteInElection = async (user, electionId, { positionId, candidateId }) => {
  const election = await ClubElection.findOne({
    where: { id: electionId },
    include: [{ model: Club, as: 'club' }],
  });

  if (!election) {
    const err = new Error('Election not found.');
    err.statusCode = 404;
    throw err;
  }

  // Cross-college check
  if (election.club.collegeId !== user.collegeId) {
    const err = new Error('Forbidden. Cross-college voting is strictly prohibited.');
    err.statusCode = 403;
    throw err;
  }

  // Election status validation
  if (election.status !== 'OPEN') {
    const err = new Error('Election is not currently open for voting.');
    err.statusCode = 400;
    throw err;
  }

  const now = new Date();
  if (now < election.startAt) {
    const err = new Error('Voting has not yet started for this election.');
    err.statusCode = 400;
    throw err;
  }

  if (now > election.endAt) {
    const err = new Error('Voting deadline has passed for this election.');
    err.statusCode = 400;
    throw err;
  }

  // Voter must be an active club member
  const membership = await ClubMembership.findOne({
    where: { clubId: election.clubId, studentId: user.id, status: 'ACTIVE' },
  });

  if (!membership) {
    const err = new Error('Only active members of this club are eligible to vote.');
    err.statusCode = 403;
    throw err;
  }

  // Candidate validation
  const candidate = await ClubCandidate.findOne({
    where: { id: candidateId, electionPositionId: positionId },
  });

  if (!candidate) {
    const err = new Error('Candidate not found for this election position.');
    err.statusCode = 404;
    throw err;
  }

  if (!candidate.approved) {
    const err = new Error('Cannot vote for an unapproved candidate.');
    err.statusCode = 400;
    throw err;
  }

  // Duplicate vote check
  const existingVote = await ClubVote.findOne({
    where: { electionId, positionId, voterStudentId: user.id },
  });

  if (existingVote) {
    const err = new Error('You have already cast your vote for this position.');
    err.statusCode = 409;
    throw err;
  }

  // Record vote with database-level uniqueness
  await ClubVote.create({
    electionId,
    positionId,
    voterStudentId: user.id,
    candidateId,
  });

  return {
    success: true,
    message: 'Your vote has been securely and privately cast.',
  };
};

/**
 * Get election results (Shields individual voter identities)
 */
const getElectionResults = async (user, electionId) => {
  const election = await ClubElection.findOne({
    where: { id: electionId },
    include: [
      { model: Club, as: 'club' },
      {
        model: ClubElectionPosition,
        as: 'positions',
        include: [
          {
            model: ClubCandidate,
            as: 'candidates',
            where: { approved: true },
            required: false,
            include: [
              {
                model: User,
                as: 'student',
                attributes: ['id', 'email'],
                include: [
                  {
                    model: StudentProfile,
                    as: 'studentProfile',
                    attributes: ['fullName', 'department', 'semester', 'profilePhoto'],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });

  if (!election) {
    const err = new Error('Election not found.');
    err.statusCode = 404;
    throw err;
  }

  if (election.club.collegeId !== user.collegeId) {
    const err = new Error('Forbidden.');
    err.statusCode = 403;
    throw err;
  }

  const auth = await getClubUserRole(election.clubId, user.id, user.role);

  // If results not published yet, only club leadership or Admin can preview
  if (election.status !== 'RESULTS_PUBLISHED' && !auth.isLeader && !auth.isAdmin) {
    const err = new Error('Election results have not been published yet.');
    err.statusCode = 403;
    throw err;
  }

  // Tally votes per candidate
  const votes = await ClubVote.findAll({
    where: { electionId },
    attributes: ['positionId', 'candidateId', [fn('COUNT', col('id')), 'voteCount']],
    group: ['positionId', 'candidateId'],
    raw: true,
  });

  const voteCountMap = {};
  votes.forEach((v) => {
    voteCountMap[v.candidateId] = parseInt(v.voteCount, 10);
  });

  // Calculate distinct voter turnout
  const distinctVoters = await ClubVote.count({
    where: { electionId },
    distinct: true,
    col: 'voterStudentId',
  });

  const eligibleVoters = await ClubMembership.count({
    where: { clubId: election.clubId, status: 'ACTIVE' },
  });

  const turnoutPercentage = eligibleVoters > 0 ? Math.round((distinctVoters / eligibleVoters) * 100) : 0;

  const positionsResult = election.positions.map((pos) => {
    const candidatesWithCounts = pos.candidates.map((cand) => {
      const cJson = cand.toJSON();
      cJson.voteCount = voteCountMap[cand.id] || 0;
      return cJson;
    });

    // Sort descending by vote count
    candidatesWithCounts.sort((a, b) => b.voteCount - a.voteCount);

    // Identify winners up to maxWinners
    const winners = candidatesWithCounts.slice(0, pos.maxWinners);

    return {
      positionId: pos.id,
      positionTitle: pos.title,
      maxWinners: pos.maxWinners,
      candidates: candidatesWithCounts,
      winners: winners.filter((w) => w.voteCount > 0),
    };
  });

  return {
    electionId: election.id,
    title: election.title,
    status: election.status,
    totalVoters: distinctVoters,
    eligibleVoters,
    turnoutPercentage,
    positions: positionsResult,
  };
};

/**
 * Publish election results
 */
const publishElectionResults = async (user, electionId) => {
  const election = await ClubElection.findOne({
    where: { id: electionId },
    include: [{ model: Club, as: 'club' }],
  });

  if (!election) {
    const err = new Error('Election not found.');
    err.statusCode = 404;
    throw err;
  }

  if (election.club.collegeId !== user.collegeId) {
    const err = new Error('Forbidden.');
    err.statusCode = 403;
    throw err;
  }

  await assertClubLeadership(user, election.clubId, 'HIGH_LEADERSHIP');

  election.status = 'RESULTS_PUBLISHED';
  await election.save();

  // Notify members
  const members = await ClubMembership.findAll({
    where: { clubId: election.clubId, status: 'ACTIVE' },
  });

  for (const m of members) {
    await notificationService.createNotification({
      userId: m.studentId,
      type: 'CLUB_ELECTION_RESULTS',
      title: `Election Results Published: ${election.title}`,
      message: `The results for ${election.title} are now officially published.`,
      data: { electionId: election.id, clubId: election.clubId },
    });
  }

  await AuditLog.create({
    actorId: user.id,
    action: 'CLUB_RESULTS_PUBLISHED',
    category: 'COMMUNITY',
    details: { clubId: election.clubId, electionId: election.id },
  });

  return election;
};

/**
 * Cancel election (Admin or President/VP)
 */
const cancelElection = async (user, electionId, { reason } = {}) => {
  const election = await ClubElection.findOne({
    where: { id: electionId },
    include: [{ model: Club, as: 'club' }],
  });

  if (!election) {
    const err = new Error('Election not found.');
    err.statusCode = 404;
    throw err;
  }

  if (election.club.collegeId !== user.collegeId && user.adminRole !== 'SUPER_ADMIN') {
    const err = new Error('Forbidden.');
    err.statusCode = 403;
    throw err;
  }

  // Admin can always intervene!
  if (user.role !== 'admin') {
    await assertClubLeadership(user, election.clubId, 'HIGH_LEADERSHIP');
  }

  election.status = 'CANCELLED';
  await election.save();

  await AuditLog.create({
    actorId: user.id,
    action: 'CLUB_ELECTION_CANCELLED',
    category: 'ADMIN_MODERATION',
    details: { clubId: election.clubId, electionId: election.id, reason },
  });

  return election;
};

/**
 * Get elections for a club
 */
const getClubElections = async (user, clubId) => {
  const club = await Club.findOne({
    where: { id: clubId, collegeId: user.collegeId },
  });

  if (!club) {
    const err = new Error('Club not found.');
    err.statusCode = 404;
    throw err;
  }

  const auth = await getClubUserRole(clubId, user.id, user.role);

  const where = { clubId };
  // Normal students only see non-draft elections
  if (!auth.isLeader && !auth.isAdmin) {
    where.status = { [Op.ne]: 'DRAFT' };
  }

  const elections = await ClubElection.findAll({
    where,
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: ClubElectionPosition,
        as: 'positions',
        include: [
          {
            model: ClubCandidate,
            as: 'candidates',
            include: [
              {
                model: User,
                as: 'student',
                attributes: ['id', 'email'],
                include: [
                  {
                    model: StudentProfile,
                    as: 'studentProfile',
                    attributes: ['fullName', 'profilePhoto'],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });

  return elections;
};

/**
 * Get single election by ID
 */
const getElectionById = async (user, electionId) => {
  const election = await ClubElection.findOne({
    where: { id: electionId },
    include: [
      { model: Club, as: 'club' },
      {
        model: ClubElectionPosition,
        as: 'positions',
        include: [
          {
            model: ClubCandidate,
            as: 'candidates',
            include: [
              {
                model: User,
                as: 'student',
                attributes: ['id', 'email'],
                include: [
                  {
                    model: StudentProfile,
                    as: 'studentProfile',
                    attributes: ['fullName', 'department', 'semester', 'profilePhoto'],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });

  if (!election) {
    const err = new Error('Election not found.');
    err.statusCode = 404;
    throw err;
  }

  if (election.club.collegeId !== user.collegeId) {
    const err = new Error('Forbidden.');
    err.statusCode = 403;
    throw err;
  }

  // Check if voter has cast votes for positions
  let userVotes = [];
  if (user && user.id) {
    const votes = await ClubVote.findAll({
      where: { electionId, voterStudentId: user.id },
      attributes: ['positionId'],
    });
    userVotes = votes.map((v) => v.positionId);
  }

  const result = election.toJSON();
  result.userVotedPositions = userVotes;
  return result;
};

// ── 8. REPORTING & MODERATION ────────────────────────────────────────────────

/**
 * Report a club or inappropriate club content
 */
const reportClub = async (user, clubId, { category, description }) => {
  const club = await Club.findOne({
    where: { id: clubId, collegeId: user.collegeId },
  });

  if (!club) {
    const err = new Error('Club not found.');
    err.statusCode = 404;
    throw err;
  }

  const report = await Report.create({
    reporterId: user.id,
    clubId: club.id,
    category: category || 'club_violation',
    description: description || 'Flagged for moderation by student',
    status: 'pending',
  });

  await AuditLog.create({
    actorId: user.id,
    action: 'CLUB_REPORTED',
    category: 'SAFETY',
    details: { clubId: club.id, category, description },
  });

  return report;
};

// ── 9. ANALYTICS ─────────────────────────────────────────────────────────────

/**
 * Admin Club Analytics (Real database calculations)
 */
const getAdminClubAnalytics = async (adminUser) => {
  const collegeId = adminUser.collegeId;
  const whereCollege = adminUser.adminRole === 'SUPER_ADMIN' ? {} : { collegeId };

  const [
    totalClubs,
    activeClubs,
    pendingReviewClubs,
    suspendedClubs,
    totalMemberships,
    activeMembers,
    pendingRequests,
    activeElections,
    totalVotes,
  ] = await Promise.all([
    Club.count({ where: whereCollege }),
    Club.count({ where: { ...whereCollege, status: 'ACTIVE' } }),
    Club.count({ where: { ...whereCollege, status: 'PENDING_REVIEW' } }),
    Club.count({ where: { ...whereCollege, status: 'SUSPENDED' } }),
    ClubMembership.count({
      include: [{ model: Club, as: 'club', where: whereCollege, attributes: [] }],
    }),
    ClubMembership.count({
      where: { status: 'ACTIVE' },
      include: [{ model: Club, as: 'club', where: whereCollege, attributes: [] }],
    }),
    ClubMembership.count({
      where: { status: 'PENDING' },
      include: [{ model: Club, as: 'club', where: whereCollege, attributes: [] }],
    }),
    ClubElection.count({
      where: { status: 'OPEN' },
      include: [{ model: Club, as: 'club', where: whereCollege, attributes: [] }],
    }),
    ClubVote.count({
      include: [{
        model: ClubElection,
        as: 'election',
        include: [{ model: Club, as: 'club', where: whereCollege, attributes: [] }],
        attributes: [],
      }],
    }),
  ]);

  // Breakdown by category
  const categoryCounts = await Club.findAll({
    where: { ...whereCollege, status: 'ACTIVE' },
    attributes: ['category', [fn('COUNT', col('id')), 'count']],
    group: ['category'],
    raw: true,
  });

  return {
    totalClubs,
    activeClubs,
    pendingReviewClubs,
    suspendedClubs,
    totalMemberships,
    activeMembers,
    pendingRequests,
    activeElections,
    totalVotes,
    categories: categoryCounts.map((c) => ({ category: c.category, count: parseInt(c.count, 10) })),
  };
};

module.exports = {
  createClub,
  approveClub,
  rejectClub,
  suspendClub,
  archiveClub,
  updateClub,
  getClubs,
  getClubById,
  joinClub,
  leaveClub,
  getMyClubs,
  getClubMembers,
  getClubMembershipRequests,
  approveMembershipRequest,
  rejectMembershipRequest,
  suspendMember,
  promoteMember,
  getClubLeadership,
  appointOfficer,
  removeOfficer,
  getClubAnnouncements,
  createClubAnnouncement,
  updateClubAnnouncement,
  deleteClubAnnouncement,
  getClubActivities,
  createClubActivity,
  updateClubActivity,
  deleteClubActivity,
  createClubElection,
  addElectionPosition,
  nominateCandidate,
  approveCandidate,
  openElection,
  closeElection,
  voteInElection,
  getElectionResults,
  publishElectionResults,
  cancelElection,
  getClubElections,
  getElectionById,
  reportClub,
  getAdminClubAnalytics,
  getClubUserRole,
  assertClubLeadership,
};
