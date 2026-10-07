'use strict';

const { Op } = require('sequelize');
const { StudentProfile, User, Skill, StudentSkill, Connection, Block } = require('../models');
const connectionService = require('./connectionService');
const privacyService = require('./privacyService');

/**
 * Normalizes an array of strings or JSON
 */
const safeArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * Retrieves IDs of all users blocked by or who blocked the current user
 */
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

/**
 * DISCOVERY SEARCH & FILTERING
 * Search across students with multi-facet filters and pagination.
 */
const discoverStudents = async (currentUser, filters = {}, page = 1, limit = 12) => {
  const offset = (page - 1) * limit;
  const blockedIds = await getBlockedUserIds(currentUser.id);
  const excludedIds = [currentUser.id, ...blockedIds];
  const where = {
    userId: { [Op.notIn]: excludedIds },
  };

  // Department filter
  if (filters.department && filters.department !== 'all') {
    where.department = filters.department;
  }

  // Semester filter
  if (filters.semester && filters.semester !== 'all') {
    where.semester = parseInt(filters.semester, 10);
  }

  // Query search across full name, bio, and department
  if (filters.query && filters.query.trim()) {
    const q = filters.query.trim();
    where[Op.or] = [
      { fullName: { [Op.like]: `%${q}%` } },
      { bio: { [Op.like]: `%${q}%` } },
      { department: { [Op.like]: `%${q}%` } },
    ];
  }

  const { count, rows } = await StudentProfile.findAndCountAll({
    where,
    offset,
    limit,
    order: [['reputationScore', 'DESC'], ['createdAt', 'DESC']],
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'accountStatus'],
        where: { accountStatus: 'active' },
      },
      {
        model: StudentSkill,
        as: 'studentSkills',
        include: [{ model: Skill, as: 'skill', attributes: ['name', 'category'] }],
      },
    ],
  });

  // Post-filter in-memory for skills or interests if specified
  let results = rows;

  if (filters.skill && filters.skill.trim()) {
    const targetSkill = filters.skill.trim().toLowerCase();
    results = results.filter((p) => {
      // Check relational studentSkills or JSON skillsKnown
      const hasRelational = (p.studentSkills || []).some(
        (ss) => ss.skill && ss.skill.name.toLowerCase().includes(targetSkill) && ss.skillType === 'known'
      );
      const hasJson = safeArray(p.skillsKnown).some((s) => s.toLowerCase().includes(targetSkill));
      return hasRelational || hasJson;
    });
  }

  if (filters.proficiency && filters.proficiency !== 'all') {
    const targetProf = filters.proficiency.toLowerCase();
    results = results.filter((p) =>
      (p.studentSkills || []).some((ss) => ss.skillType === 'known' && ss.proficiency === targetProf)
    );
  }

  if (filters.interest && filters.interest.trim()) {
    const targetInterest = filters.interest.trim().toLowerCase();
    results = results.filter((p) =>
      safeArray(p.interests).some((i) => i.toLowerCase().includes(targetInterest))
    );
  }

  // Map each student with privacy sanitation and connection status
  const sanitizedStudents = await Promise.all(
    results.map(async (profile) => {
      const connStatus = await connectionService.getConnectionStatus(currentUser.id, profile.userId);
      return privacyService.sanitizeStudentProfile(profile, currentUser, connStatus);
    })
  );

  return {
    total: count,
    page,
    limit,
    students: sanitizedStudents,
  };
};

/**
 * LEARN FROM MATCHING
 * Finds students who know a target skill with intermediate/advanced proficiency
 * and willingness to teach.
 */
const findPeopleToLearnFrom = async (currentUser, targetSkillName, page = 1, limit = 10) => {
  const currentProfile = await StudentProfile.findOne({ where: { userId: currentUser.id } });
  const myInterests = safeArray(currentProfile?.interests);

  const whereSkill = {
    skillType: 'known',
    canTeach: true,
  };

  const skillInclude = {
    model: Skill,
    as: 'skill',
  };

  if (targetSkillName && targetSkillName.trim()) {
    skillInclude.where = {
      name: { [Op.like]: `%${targetSkillName.trim()}%` },
    };
  }

  const blockedIds = await getBlockedUserIds(currentUser.id);
  const excludedIds = [currentUser.id, ...blockedIds];

  const { count, rows } = await StudentSkill.findAndCountAll({
    where: whereSkill,
    limit,
    offset: (page - 1) * limit,
    include: [
      skillInclude,
      {
        model: StudentProfile,
        as: 'studentProfile',
        where: { userId: { [Op.notIn]: excludedIds } },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'accountStatus'],
            where: { accountStatus: 'active' },
          },
        ],
      },
    ],
  });

  const matches = await Promise.all(
    rows.map(async (item) => {
      const profile = item.studentProfile;
      const peerInterests = safeArray(profile.interests);
      const commonInterests = myInterests.filter((i) =>
        peerInterests.some((pi) => pi.toLowerCase() === i.toLowerCase())
      );

      const connStatus = await connectionService.getConnectionStatus(currentUser.id, profile.userId);
      const sanitized = await privacyService.sanitizeStudentProfile(profile, currentUser, connStatus);

      return {
        ...sanitized,
        matchedSkill: {
          name: item.skill.name,
          category: item.skill.category,
          proficiency: item.proficiency,
          canTeach: item.canTeach,
        },
        commonInterests,
      };
    })
  );

  return { total: count, page, limit, matches };
};

/**
 * SKILL EXCHANGE MATCHING ALGORITHM
 * Evaluates two-way reciprocal skill matches between current user and peers.
 */
const getSkillExchangeMatches = async (currentUser, limit = 10) => {
  const myProfile = await StudentProfile.findOne({
    where: { userId: currentUser.id },
    include: [
      {
        model: StudentSkill,
        as: 'studentSkills',
        include: [{ model: Skill, as: 'skill' }],
      },
    ],
  });

  if (!myProfile) return [];

  // Extract my known skills (that I can teach) and wanted skills
  const myKnownSkills = (myProfile.studentSkills || [])
    .filter((s) => s.skillType === 'known')
    .map((s) => s.skill.name.toLowerCase());

  // Also include JSON fallback
  const myKnownAll = Array.from(
    new Set([...myKnownSkills, ...safeArray(myProfile.skillsKnown).map((s) => s.toLowerCase())])
  );

  const myWantedSkills = (myProfile.studentSkills || [])
    .filter((s) => s.skillType === 'wanted')
    .map((s) => s.skill.name.toLowerCase());

  const myWantedAll = Array.from(
    new Set([...myWantedSkills, ...safeArray(myProfile.skillsWanted).map((s) => s.toLowerCase())])
  );

  const myInterests = safeArray(myProfile.interests).map((i) => i.toLowerCase());

  // Fetch candidate active student profiles
  const blockedIds = await getBlockedUserIds(currentUser.id);
  const excludedIds = [currentUser.id, ...blockedIds];

  const candidates = await StudentProfile.findAll({
    where: {
      userId: { [Op.notIn]: excludedIds },
    },
    limit: 50,
    order: [['reputationScore', 'DESC']],
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'accountStatus'],
        where: { accountStatus: 'active' },
      },
      {
        model: StudentSkill,
        as: 'studentSkills',
        include: [{ model: Skill, as: 'skill' }],
      },
    ],
  });

  const scoredMatches = [];

  for (const peer of candidates) {
    const peerKnown = (peer.studentSkills || [])
      .filter((s) => s.skillType === 'known')
      .map((s) => s.skill.name.toLowerCase());
    const peerKnownAll = Array.from(
      new Set([...peerKnown, ...safeArray(peer.skillsKnown).map((s) => s.toLowerCase())])
    );

    const peerWanted = (peer.studentSkills || [])
      .filter((s) => s.skillType === 'wanted')
      .map((s) => s.skill.name.toLowerCase());
    const peerWantedAll = Array.from(
      new Set([...peerWanted, ...safeArray(peer.skillsWanted).map((s) => s.toLowerCase())])
    );

    const peerInterests = safeArray(peer.interests).map((i) => i.toLowerCase());

    // 1. Skills I want that peer knows
    const iLearn = myWantedAll.filter((wanted) =>
      peerKnownAll.some((known) => known === wanted || known.includes(wanted) || wanted.includes(known))
    );

    // 2. Skills peer wants that I know (reciprocal!)
    const theyLearn = peerWantedAll.filter((wanted) =>
      myKnownAll.some((known) => known === wanted || known.includes(wanted) || wanted.includes(known))
    );

    // If there is no overlap in either direction, skip
    if (iLearn.length === 0 && theyLearn.length === 0) continue;

    let score = 0;
    const isReciprocal = iLearn.length > 0 && theyLearn.length > 0;

    if (isReciprocal) {
      score += 55; // Base high weight for reciprocal exchange
      score += Math.min(iLearn.length * 8, 16);
      score += Math.min(theyLearn.length * 8, 16);
    } else {
      score += 30; // One-way match
      score += Math.min((iLearn.length || theyLearn.length) * 8, 16);
    }

    // Common interests
    const commonInterests = myInterests.filter((i) => peerInterests.includes(i));
    score += Math.min(commonInterests.length * 4, 12);

    // Same department bonus
    if (myProfile.department && peer.department && myProfile.department === peer.department) {
      score += 5;
    }

    // Cap score at 98%
    score = Math.min(98, score);

    // Label assignment
    let matchLabel = 'Potential Skill Match';
    if (score >= 80 && isReciprocal) {
      matchLabel = 'Strong Match';
    } else if (score >= 60) {
      matchLabel = 'Good Skill Exchange Match';
    }

    const connStatus = await connectionService.getConnectionStatus(currentUser.id, peer.userId);
    const sanitized = await privacyService.sanitizeStudentProfile(peer, currentUser, connStatus);

    scoredMatches.push({
      student: sanitized,
      matchScore: score,
      matchLabel,
      isReciprocal,
      iLearn,
      theyLearn,
      commonInterests,
    });
  }

  // Sort descending by matchScore
  scoredMatches.sort((a, b) => b.matchScore - a.matchScore);

  return scoredMatches.slice(0, limit);
};

module.exports = {
  discoverStudents,
  findPeopleToLearnFrom,
  getSkillExchangeMatches,
};
