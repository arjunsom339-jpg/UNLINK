'use strict';

const { Op } = require('sequelize');
const {
  Opportunity,
  Company,
  OpportunityApplication,
  OpportunityBookmark,
  PlacementInterview,
  PlacementProfile,
  StudentProfile,
  User,
  Department,
  College,
  Notification,
  Report,
  AuditLog,
} = require('../models');
const storageService = require('./storageService');
const logger = require('../utils/logger');

/**
 * VALID APPLICATION STATE TRANSITIONS
 */
const VALID_TRANSITIONS = {
  APPLIED: ['UNDER_REVIEW', 'SHORTLISTED', 'REJECTED', 'WITHDRAWN'],
  UNDER_REVIEW: ['SHORTLISTED', 'REJECTED', 'WITHDRAWN'],
  SHORTLISTED: ['TEST', 'INTERVIEW', 'SELECTED', 'REJECTED'],
  TEST: ['INTERVIEW', 'SELECTED', 'REJECTED', 'SHORTLISTED'],
  INTERVIEW: ['TEST', 'SELECTED', 'REJECTED'],
  SELECTED: ['OFFER_ACCEPTED', 'OFFER_DECLINED'],
  REJECTED: [],
  WITHDRAWN: [],
  OFFER_ACCEPTED: [],
  OFFER_DECLINED: [],
};

/**
 * Check if an administrative user has TPC privileges
 */
const isAuthorizedTpc = (user) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return false;
};

// ── 1. COMPANY SERVICES ──────────────────────────────────────────────────────

/**
 * Register a new company for the college
 */
const createCompany = async (user, data) => {
  if (!isAuthorizedTpc(user)) {
    const err = new Error('Only authorized TPC staff or administrators can create company profiles.');
    err.statusCode = 403;
    throw err;
  }

  if (!data.name || !data.name.trim()) {
    const err = new Error('Company name is required.');
    err.statusCode = 400;
    throw err;
  }

  // Check duplicate company in the same college
  const existing = await Company.findOne({
    where: {
      collegeId: user.collegeId,
      name: { [Op.like]: data.name.trim() },
    },
  });

  if (existing) {
    const err = new Error(`A company named '${data.name.trim()}' already exists in your college.`);
    err.statusCode = 409;
    throw err;
  }

  const initialStatus = data.verificationStatus && ['VERIFIED', 'PENDING', 'REJECTED'].includes(data.verificationStatus)
    ? data.verificationStatus
    : 'VERIFIED'; // Default to VERIFIED when created directly by TPC/Admin

  const company = await Company.create({
    collegeId: user.collegeId,
    name: data.name.trim(),
    logo: data.logo || null,
    website: data.website || null,
    industry: data.industry || 'Technology',
    description: data.description || null,
    headquarters: data.headquarters || null,
    verificationStatus: initialStatus,
    verifiedById: user.id,
    verifiedAt: initialStatus === 'VERIFIED' ? new Date() : null,
  });

  await AuditLog.create({
    actorId: user.id,
    action: 'COMPANY_CREATED',
    category: 'ADMIN_MODERATION',
    details: { companyId: company.id, name: company.name, status: company.verificationStatus },
  });

  return company;
};

/**
 * List companies for user's college
 */
const getCompanies = async (user, query = {}) => {
  const { page = 1, limit = 20, search, status } = query;
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, Math.max(1, parseInt(limit, 10)));
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));

  const whereClause = { collegeId: user.collegeId };

  if (status) {
    whereClause.verificationStatus = status;
  }

  if (search && search.trim()) {
    whereClause[Op.or] = [
      { name: { [Op.like]: `%${search.trim()}%` } },
      { industry: { [Op.like]: `%${search.trim()}%` } },
    ];
  }

  const { count, rows } = await Company.findAndCountAll({
    where: whereClause,
    order: [['name', 'ASC']],
    limit: parsedLimit,
    offset,
  });

  return {
    companies: rows,
    total: count,
    page: parseInt(page, 10),
    totalPages: Math.ceil(count / parsedLimit),
  };
};

/**
 * Verify / moderate a company
 */
const verifyCompany = async (user, companyId, { status, notes }) => {
  if (!isAuthorizedTpc(user)) {
    const err = new Error('Administrative privileges required to verify companies.');
    err.statusCode = 403;
    throw err;
  }

  if (!['VERIFIED', 'REJECTED', 'PENDING'].includes(status)) {
    const err = new Error('Invalid verification status. Must be VERIFIED, REJECTED, or PENDING.');
    err.statusCode = 400;
    throw err;
  }

  const company = await Company.findOne({
    where: { id: companyId, collegeId: user.collegeId },
  });

  if (!company) {
    const err = new Error('Company not found.');
    err.statusCode = 404;
    throw err;
  }

  const prevStatus = company.verificationStatus;
  company.verificationStatus = status;
  company.verifiedById = user.id;
  company.verifiedAt = new Date();
  if (notes) company.verificationNotes = notes;
  await company.save();

  await AuditLog.create({
    actorId: user.id,
    action: 'COMPANY_VERIFIED',
    category: 'ADMIN_MODERATION',
    details: { companyId: company.id, name: company.name, prevStatus, newStatus: status, notes },
  });

  return company;
};

// ── 2. SERVER-SIDE ELIGIBILITY ENGINE ─────────────────────────────────────────

/**
 * Pure server-side eligibility evaluation engine.
 * Evaluates student department, semester, graduation year, CGPA, backlogs, and skills.
 */
const evaluateEligibility = async (studentUser, opportunity) => {
  const reasons = [];
  const missingCriteria = [];

  const studentProfile = await StudentProfile.findOne({
    where: { userId: studentUser.id },
  });

  const placementProfile = await PlacementProfile.findOne({
    where: { userId: studentUser.id },
  });

  const rule = opportunity.eligibility || {};

  // 1. Department eligibility
  if (Array.isArray(rule.eligibleDepartments) && rule.eligibleDepartments.length > 0) {
    const studentDept = studentProfile ? (studentProfile.department || '').trim().toLowerCase() : '';
    const deptMatches = rule.eligibleDepartments.some(
      (d) => d && d.trim().toLowerCase() === studentDept
    );

    if (deptMatches) {
      reasons.push(`Department (${studentProfile?.department || 'N/A'}) satisfies requirement`);
    } else {
      missingCriteria.push(`Department (${studentProfile?.department || 'N/A'}) is not in eligible departments list: [${rule.eligibleDepartments.join(', ')}]`);
    }
  }

  // 2. Semester eligibility
  if (Array.isArray(rule.eligibleSemesters) && rule.eligibleSemesters.length > 0) {
    const sem = studentProfile ? studentProfile.semester : null;
    const semMatches = sem != null && rule.eligibleSemesters.map(Number).includes(Number(sem));

    if (semMatches) {
      reasons.push(`Semester ${sem} satisfies criteria`);
    } else {
      missingCriteria.push(`Semester ${sem || 'N/A'} is not in eligible semesters: [${rule.eligibleSemesters.join(', ')}]`);
    }
  }

  // 3. Graduation Year eligibility
  if (Array.isArray(rule.eligibleGraduationYears) && rule.eligibleGraduationYears.length > 0) {
    const gradYear = placementProfile?.graduationYear;
    const yearMatches = gradYear != null && rule.eligibleGraduationYears.map(Number).includes(Number(gradYear));

    if (yearMatches) {
      reasons.push(`Graduation year ${gradYear} satisfies requirement`);
    } else {
      missingCriteria.push(`Graduation year ${gradYear || 'Not Specified'} is not in eligible years: [${rule.eligibleGraduationYears.join(', ')}]`);
    }
  }

  // 4. Minimum CGPA eligibility
  if (rule.minimumCgpa != null && rule.minimumCgpa !== '') {
    const minCgpa = Number(rule.minimumCgpa);
    const studentCgpa = placementProfile?.cgpa != null ? Number(placementProfile.cgpa) : null;

    if (studentCgpa == null) {
      missingCriteria.push(`CGPA is missing in placement profile. Minimum required: ${minCgpa.toFixed(2)}`);
    } else if (studentCgpa < minCgpa) {
      missingCriteria.push(`CGPA ${studentCgpa.toFixed(2)} is below minimum requirement of ${minCgpa.toFixed(2)}`);
    } else {
      reasons.push(`CGPA ${studentCgpa.toFixed(2)} satisfies minimum requirement of ${minCgpa.toFixed(2)}`);
    }
  }

  // 5. Maximum Active Backlogs
  if (rule.maxActiveBacklogs != null && rule.maxActiveBacklogs !== '') {
    const maxActive = Number(rule.maxActiveBacklogs);
    const activeBacklogs = placementProfile?.activeBacklogs != null ? Number(placementProfile.activeBacklogs) : 0;

    if (activeBacklogs > maxActive) {
      missingCriteria.push(`Active backlogs (${activeBacklogs}) exceeds maximum allowed (${maxActive})`);
    } else {
      reasons.push(`Active backlogs (${activeBacklogs}) within allowed limit (max ${maxActive})`);
    }
  }

  // 6. Maximum Total Backlogs
  if (rule.maxTotalBacklogs != null && rule.maxTotalBacklogs !== '') {
    const maxTotal = Number(rule.maxTotalBacklogs);
    const totalBacklogs = placementProfile?.totalBacklogs != null ? Number(placementProfile.totalBacklogs) : 0;

    if (totalBacklogs > maxTotal) {
      missingCriteria.push(`Total backlogs (${totalBacklogs}) exceeds maximum allowed (${maxTotal})`);
    } else {
      reasons.push(`Total backlogs (${totalBacklogs}) within allowed limit (max ${maxTotal})`);
    }
  }

  // 7. Required Skills
  if (Array.isArray(rule.requiredSkills) && rule.requiredSkills.length > 0) {
    const studentSkillsRaw = studentProfile?.skillsKnown || [];
    const studentSkills = studentSkillsRaw.map((s) => {
      if (typeof s === 'string') return s.trim().toLowerCase();
      if (s && s.skillName) return s.skillName.trim().toLowerCase();
      return '';
    }).filter(Boolean);

    const missingSkills = [];
    for (const reqSkill of rule.requiredSkills) {
      const cleanReq = reqSkill.trim().toLowerCase();
      if (!studentSkills.some((s) => s === cleanReq || s.includes(cleanReq) || cleanReq.includes(s))) {
        missingSkills.push(reqSkill);
      }
    }

    if (missingSkills.length > 0) {
      missingCriteria.push(`Missing required skill(s): ${missingSkills.join(', ')}`);
    } else {
      reasons.push(`Satisfies all ${rule.requiredSkills.length} required skill(s)`);
    }
  }

  const isEligible = missingCriteria.length === 0;

  return {
    isEligible,
    reasons,
    missingCriteria,
  };
};

// ── 3. OPPORTUNITY MANAGEMENT & LIFECYCLE ─────────────────────────────────────

/**
 * Create a new Opportunity or Placement Drive
 */
const createOpportunity = async (user, data) => {
  if (!isAuthorizedTpc(user)) {
    const err = new Error('Access denied. Placement opportunities may only be created by authorized TPC staff or administrators.');
    err.statusCode = 403;
    throw err;
  }

  if (!data.companyName || !data.companyName.trim()) {
    const err = new Error('Company name is required.');
    err.statusCode = 400;
    throw err;
  }

  if (!data.title || !data.title.trim()) {
    const err = new Error('Opportunity title is required.');
    err.statusCode = 400;
    throw err;
  }

  if (!data.description || !data.description.trim()) {
    const err = new Error('Opportunity description is required.');
    err.statusCode = 400;
    throw err;
  }

  if (!data.applicationDeadline) {
    const err = new Error('Application deadline is required.');
    err.statusCode = 400;
    throw err;
  }

  const deadlineDate = new Date(data.applicationDeadline);
  if (isNaN(deadlineDate.getTime())) {
    const err = new Error('Invalid application deadline date format.');
    err.statusCode = 400;
    throw err;
  }

  // Company linking and verification check
  let companyId = data.companyId || null;
  let companyLogo = data.companyLogo || null;

  if (companyId) {
    const comp = await Company.findOne({
      where: { id: companyId, collegeId: user.collegeId },
    });
    if (!comp) {
      const err = new Error('Associated company not found in your college.');
      err.statusCode = 404;
      throw err;
    }
    if (comp.verificationStatus === 'REJECTED') {
      const err = new Error('Cannot create an opportunity for a rejected company record.');
      err.statusCode = 400;
      throw err;
    }
    if (!companyLogo && comp.logo) companyLogo = comp.logo;
  }

  // Clean eligibility object
  const cleanEligibility = {
    eligibleDepartments: Array.isArray(data.eligibility?.eligibleDepartments)
      ? data.eligibility.eligibleDepartments
      : (Array.isArray(data.eligibleDepartments) ? data.eligibleDepartments : []),
    eligibleSemesters: Array.isArray(data.eligibility?.eligibleSemesters)
      ? data.eligibility.eligibleSemesters
      : (Array.isArray(data.eligibleSemesters) ? data.eligibleSemesters : []),
    eligibleGraduationYears: Array.isArray(data.eligibility?.eligibleGraduationYears)
      ? data.eligibility.eligibleGraduationYears
      : (Array.isArray(data.eligibleGraduationYears) ? data.eligibleGraduationYears : []),
    minimumCgpa: data.eligibility?.minimumCgpa != null
      ? Number(data.eligibility.minimumCgpa)
      : (data.minimumCgpa != null ? Number(data.minimumCgpa) : null),
    maxActiveBacklogs: data.eligibility?.maxActiveBacklogs != null
      ? Number(data.eligibility.maxActiveBacklogs)
      : (data.maxActiveBacklogs != null ? Number(data.maxActiveBacklogs) : null),
    maxTotalBacklogs: data.eligibility?.maxTotalBacklogs != null
      ? Number(data.eligibility.maxTotalBacklogs)
      : (data.maxTotalBacklogs != null ? Number(data.maxTotalBacklogs) : null),
    requiredSkills: Array.isArray(data.eligibility?.requiredSkills)
      ? data.eligibility.requiredSkills
      : (Array.isArray(data.requiredSkills) ? data.requiredSkills : []),
  };

  const status = data.status || 'DRAFT';

  const opportunity = await Opportunity.create({
    collegeId: user.collegeId,
    createdBy: user.id,
    companyId,
    companyName: data.companyName.trim(),
    companyLogo,
    title: data.title.trim(),
    description: data.description.trim(),
    opportunityType: data.opportunityType || 'INTERNSHIP',
    category: data.category || 'SOFTWARE',
    location: data.location || null,
    workMode: data.workMode || 'ONSITE',
    stipend: data.stipend || null,
    salaryMin: data.salaryMin != null ? data.salaryMin : null,
    salaryMax: data.salaryMax != null ? data.salaryMax : null,
    currency: data.currency || 'INR',
    duration: data.duration || null,
    startDate: data.startDate ? new Date(data.startDate) : null,
    applicationDeadline: deadlineDate,
    driveDate: data.driveDate ? new Date(data.driveDate) : null,
    venue: data.venue || null,
    applicationMethod: data.applicationMethod || 'DIRECT',
    applicationUrl: data.applicationUrl || null,
    contactEmail: data.contactEmail || null,
    eligibility: cleanEligibility,
    status,
    visibility: data.visibility || 'COLLEGE_ONLY',
    sourceType: 'TPC',
  });

  await AuditLog.create({
    actorId: user.id,
    action: 'OPPORTUNITY_CREATED',
    category: 'ADMIN_MODERATION',
    details: { opportunityId: opportunity.id, title: opportunity.title, status: opportunity.status },
  });

  return opportunity;
};

/**
 * Update an existing opportunity
 */
const updateOpportunity = async (user, opportunityId, data) => {
  if (!isAuthorizedTpc(user)) {
    const err = new Error('Only authorized TPC staff or administrators can update opportunities.');
    err.statusCode = 403;
    throw err;
  }

  const opportunity = await Opportunity.findOne({
    where: { id: opportunityId, collegeId: user.collegeId },
  });

  if (!opportunity) {
    const err = new Error('Opportunity not found.');
    err.statusCode = 404;
    throw err;
  }

  if (data.title) opportunity.title = data.title.trim();
  if (data.description) opportunity.description = data.description.trim();
  if (data.companyName) opportunity.companyName = data.companyName.trim();
  if (data.companyLogo !== undefined) opportunity.companyLogo = data.companyLogo;
  if (data.opportunityType) opportunity.opportunityType = data.opportunityType;
  if (data.category) opportunity.category = data.category;
  if (data.location !== undefined) opportunity.location = data.location;
  if (data.workMode) opportunity.workMode = data.workMode;
  if (data.stipend !== undefined) opportunity.stipend = data.stipend;
  if (data.salaryMin !== undefined) opportunity.salaryMin = data.salaryMin;
  if (data.salaryMax !== undefined) opportunity.salaryMax = data.salaryMax;
  if (data.duration !== undefined) opportunity.duration = data.duration;
  if (data.venue !== undefined) opportunity.venue = data.venue;
  if (data.driveDate !== undefined) opportunity.driveDate = data.driveDate ? new Date(data.driveDate) : null;
  if (data.applicationDeadline) opportunity.applicationDeadline = new Date(data.applicationDeadline);
  if (data.eligibility) {
    opportunity.eligibility = {
      ...opportunity.eligibility,
      ...data.eligibility,
    };
  }

  await opportunity.save();

  await AuditLog.create({
    actorId: user.id,
    action: 'OPPORTUNITY_UPDATED',
    category: 'ADMIN_MODERATION',
    details: { opportunityId: opportunity.id, title: opportunity.title },
  });

  return opportunity;
};

/**
 * Publish an opportunity (makes it discoverable to eligible students)
 */
const publishOpportunity = async (user, opportunityId) => {
  if (!isAuthorizedTpc(user)) {
    const err = new Error('Only authorized TPC staff or administrators can publish opportunities.');
    err.statusCode = 403;
    throw err;
  }

  const opportunity = await Opportunity.findOne({
    where: { id: opportunityId, collegeId: user.collegeId },
  });

  if (!opportunity) {
    const err = new Error('Opportunity not found.');
    err.statusCode = 404;
    throw err;
  }

  // Check company verification if company attached
  if (opportunity.companyId) {
    const comp = await Company.findByPk(opportunity.companyId);
    if (comp && comp.verificationStatus === 'REJECTED') {
      const err = new Error('Cannot publish opportunity linked to a rejected company.');
      err.statusCode = 400;
      throw err;
    }
  }

  opportunity.status = 'PUBLISHED';
  await opportunity.save();

  await AuditLog.create({
    actorId: user.id,
    action: 'OPPORTUNITY_PUBLISHED',
    category: 'ADMIN_MODERATION',
    details: { opportunityId: opportunity.id, title: opportunity.title },
  });

  // Notify students in the college
  try {
    const eligibleStudents = await User.findAll({
      where: { collegeId: user.collegeId, role: 'student', accountStatus: 'active' },
      limit: 100, // Batch notification limit for safety
    });

    for (const s of eligibleStudents) {
      await Notification.create({
        userId: s.id,
        type: 'OPPORTUNITY_PUBLISHED',
        title: `New Opportunity: ${opportunity.title}`,
        message: `${opportunity.companyName} is hiring for ${opportunity.title}. Check your eligibility and apply before ${new Date(opportunity.applicationDeadline).toLocaleDateString()}.`,
        data: { opportunityId: opportunity.id, companyName: opportunity.companyName },
      });
    }
  } catch (notifyErr) {
    logger.warn(`Failed to broadcast opportunity notification: ${notifyErr.message}`);
  }

  return opportunity;
};

/**
 * Close applications for an opportunity
 */
const closeOpportunity = async (user, opportunityId) => {
  if (!isAuthorizedTpc(user)) {
    const err = new Error('Only authorized TPC staff or administrators can close opportunities.');
    err.statusCode = 403;
    throw err;
  }

  const opportunity = await Opportunity.findOne({
    where: { id: opportunityId, collegeId: user.collegeId },
  });

  if (!opportunity) {
    const err = new Error('Opportunity not found.');
    err.statusCode = 404;
    throw err;
  }

  opportunity.status = 'APPLICATION_CLOSED';
  await opportunity.save();

  await AuditLog.create({
    actorId: user.id,
    action: 'OPPORTUNITY_CLOSED',
    category: 'ADMIN_MODERATION',
    details: { opportunityId: opportunity.id },
  });

  return opportunity;
};

/**
 * Cancel an opportunity
 */
const cancelOpportunity = async (user, opportunityId, reason) => {
  if (!isAuthorizedTpc(user)) {
    const err = new Error('Only authorized TPC staff or administrators can cancel opportunities.');
    err.statusCode = 403;
    throw err;
  }

  const opportunity = await Opportunity.findOne({
    where: { id: opportunityId, collegeId: user.collegeId },
  });

  if (!opportunity) {
    const err = new Error('Opportunity not found.');
    err.statusCode = 404;
    throw err;
  }

  opportunity.status = 'CANCELLED';
  await opportunity.save();

  await AuditLog.create({
    actorId: user.id,
    action: 'OPPORTUNITY_CANCELLED',
    category: 'ADMIN_MODERATION',
    details: { opportunityId: opportunity.id, reason },
  });

  // Notify registered applicants
  try {
    const applications = await OpportunityApplication.findAll({
      where: { opportunityId: opportunity.id },
    });

    for (const app of applications) {
      await Notification.create({
        userId: app.studentId,
        type: 'OPPORTUNITY_CANCELLED',
        title: `Opportunity Cancelled: ${opportunity.title}`,
        message: `The recruitment opportunity for ${opportunity.title} at ${opportunity.companyName} has been cancelled by the Placement Cell.`,
        data: { opportunityId: opportunity.id, reason },
      });
    }
  } catch (notifyErr) {
    logger.warn(`Failed to notify applicants of cancellation: ${notifyErr.message}`);
  }

  return opportunity;
};

/**
 * Discover opportunities with server-side filtering, sorting, pagination, and student eligibility decoration
 */
const getOpportunities = async (user, query = {}) => {
  const {
    page = 1,
    limit = 12,
    search,
    type,
    category,
    workMode,
    status,
    sortBy = 'newest',
    eligibleOnly = 'false',
    department,
  } = query;

  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parsedLimit;

  // Enforce college isolation
  const whereClause = {
    collegeId: user.collegeId,
  };

  // Visibility and status rules
  if (user.role === 'student' || user.role === 'teacher' || user.role === 'alumni') {
    // Non-admins never see DRAFT opportunities
    whereClause.status = {
      [Op.in]: ['PUBLISHED', 'APPLICATION_OPEN', 'APPLICATION_CLOSED', 'SHORTLISTING', 'INTERVIEWING', 'SELECTED', 'COMPLETED'],
    };
  } else if (status) {
    whereClause.status = status;
  }

  if (type) {
    whereClause.opportunityType = type;
  }

  if (category) {
    whereClause.category = category;
  }

  if (workMode) {
    whereClause.workMode = workMode;
  }

  if (search && search.trim()) {
    whereClause[Op.or] = [
      { title: { [Op.like]: `%${search.trim()}%` } },
      { companyName: { [Op.like]: `%${search.trim()}%` } },
      { description: { [Op.like]: `%${search.trim()}%` } },
      { location: { [Op.like]: `%${search.trim()}%` } },
    ];
  }

  // Sorting
  let order = [['createdAt', 'DESC']];
  if (sortBy === 'deadline') {
    order = [['applicationDeadline', 'ASC']];
  } else if (sortBy === 'company') {
    order = [['companyName', 'ASC']];
  } else if (sortBy === 'salary') {
    order = [['salaryMax', 'DESC']];
  }

  const { count, rows } = await Opportunity.findAndCountAll({
    where: whereClause,
    order,
    limit: parsedLimit,
    offset,
    include: [
      {
        model: Company,
        as: 'company',
        attributes: ['id', 'name', 'logo', 'verificationStatus', 'industry', 'website'],
      },
    ],
  });

  // If student, decorate each opportunity with their application state, bookmark state, and eligibility evaluation
  let decoratedRows = rows;

  if (user.role === 'student') {
    const oppIds = rows.map((r) => r.id);

    const [userApplications, userBookmarks] = await Promise.all([
      OpportunityApplication.findAll({
        where: { studentId: user.id, opportunityId: { [Op.in]: oppIds } },
      }),
      OpportunityBookmark.findAll({
        where: { studentId: user.id, opportunityId: { [Op.in]: oppIds } },
      }),
    ]);

    const appMap = new Map();
    userApplications.forEach((app) => appMap.set(app.opportunityId, app));

    const bookmarkSet = new Set(userBookmarks.map((b) => b.opportunityId));

    decoratedRows = await Promise.all(
      rows.map(async (opp) => {
        const plain = opp.toJSON();
        const existingApp = appMap.get(opp.id);
        plain.hasApplied = !!existingApp;
        plain.applicationStatus = existingApp ? existingApp.status : null;
        plain.applicationStage = existingApp ? existingApp.currentStage : null;
        plain.applicationId = existingApp ? existingApp.id : null;
        plain.isBookmarked = bookmarkSet.has(opp.id);

        const evalResult = await evaluateEligibility(user, opp);
        plain.isEligible = evalResult.isEligible;
        plain.eligibilityResult = evalResult;

        return plain;
      })
    );

    // If eligibleOnly filter is requested
    if (eligibleOnly === 'true' || eligibleOnly === true) {
      decoratedRows = decoratedRows.filter((r) => r.isEligible);
    }
  }

  return {
    opportunities: decoratedRows,
    total: eligibleOnly === 'true' || eligibleOnly === true ? decoratedRows.length : count,
    page: parseInt(page, 10),
    totalPages: Math.ceil((eligibleOnly === 'true' || eligibleOnly === true ? decoratedRows.length : count) / parsedLimit) || 1,
  };
};

/**
 * Get opportunity details by ID
 */
const getOpportunityById = async (user, opportunityId) => {
  const opportunity = await Opportunity.findOne({
    where: { id: opportunityId, collegeId: user.collegeId },
    include: [
      {
        model: Company,
        as: 'company',
        attributes: ['id', 'name', 'logo', 'verificationStatus', 'industry', 'website', 'description'],
      },
    ],
  });

  if (!opportunity) {
    const err = new Error('Opportunity not found.');
    err.statusCode = 404;
    throw err;
  }

  // Students and non-admins cannot view DRAFT opportunities
  if ((user.role === 'student' || user.role === 'teacher') && opportunity.status === 'DRAFT') {
    const err = new Error('Opportunity not found or not published.');
    err.statusCode = 404;
    throw err;
  }

  // Increment views count safely
  await opportunity.increment('viewsCount', { by: 1 }).catch(() => {});

  const plain = opportunity.toJSON();

  if (user.role === 'student') {
    const existingApp = await OpportunityApplication.findOne({
      where: { opportunityId, studentId: user.id },
    });
    const bookmark = await OpportunityBookmark.findOne({
      where: { opportunityId, studentId: user.id },
    });

    plain.hasApplied = !!existingApp;
    plain.applicationStatus = existingApp ? existingApp.status : null;
    plain.applicationStage = existingApp ? existingApp.currentStage : null;
    plain.applicationId = existingApp ? existingApp.id : null;
    plain.isBookmarked = !!bookmark;

    const evalResult = await evaluateEligibility(user, opportunity);
    plain.isEligible = evalResult.isEligible;
    plain.eligibilityResult = evalResult;
  }

  return plain;
};

// ── 4. APPLICATION STATE MACHINE & LIFECYCLE ──────────────────────────────────

/**
 * Student applies for an opportunity
 */
const applyOpportunity = async (studentUser, opportunityId, { coverLetter, resumeUrl, resumeFilename } = {}) => {
  if (studentUser.role !== 'student') {
    const err = new Error('Only verified students can submit applications for placement opportunities.');
    err.statusCode = 403;
    throw err;
  }

  // 1. Fetch opportunity with college isolation
  const opportunity = await Opportunity.findOne({
    where: { id: opportunityId, collegeId: studentUser.collegeId },
  });

  if (!opportunity) {
    const err = new Error('Opportunity not found in your college.');
    err.statusCode = 404;
    throw err;
  }

  // 2. Verify opportunity status
  if (!['PUBLISHED', 'APPLICATION_OPEN'].includes(opportunity.status)) {
    const err = new Error(`Applications are currently closed for this opportunity (Status: ${opportunity.status}).`);
    err.statusCode = 400;
    throw err;
  }

  // 3. Verify application deadline
  const now = new Date();
  if (now > new Date(opportunity.applicationDeadline)) {
    const err = new Error('Application deadline has passed. Late submissions are not accepted.');
    err.statusCode = 400;
    throw err;
  }

  // 4. Duplicate application check
  const existingApp = await OpportunityApplication.findOne({
    where: { opportunityId, studentId: studentUser.id },
  });

  if (existingApp) {
    const err = new Error('You have already applied for this opportunity.');
    err.statusCode = 409;
    throw err;
  }

  // 5. Server-side eligibility evaluation
  const evalResult = await evaluateEligibility(studentUser, opportunity);
  if (!evalResult.isEligible) {
    const err = new Error(`You do not meet the eligibility requirements for this opportunity: ${evalResult.missingCriteria.join('; ')}`);
    err.statusCode = 400;
    err.missingCriteria = evalResult.missingCriteria;
    throw err;
  }

  // 6. Resume resolution
  let finalResumeUrl = resumeUrl || null;
  let finalResumeFilename = resumeFilename || null;

  if (!finalResumeUrl) {
    const profile = await PlacementProfile.findOne({
      where: { userId: studentUser.id },
    });
    if (profile && profile.resumeUrl) {
      finalResumeUrl = profile.resumeUrl;
      finalResumeFilename = profile.resumeFilename;
    }
  }

  // 7. Create application record
  const application = await OpportunityApplication.create({
    opportunityId,
    studentId: studentUser.id,
    collegeId: studentUser.collegeId,
    status: 'APPLIED',
    currentStage: 'Application Submitted',
    appliedAt: new Date(),
    eligibilitySnapshot: {
      isEligible: evalResult.isEligible,
      reasons: evalResult.reasons,
      evaluatedAt: new Date().toISOString(),
    },
    resumeUrl: finalResumeUrl,
    resumeFilename: finalResumeFilename,
    coverLetter: coverLetter || null,
  });

  // Increment application counter on opportunity
  await opportunity.increment('applicationsCount', { by: 1 }).catch(() => {});

  // Create in-app student notification
  await Notification.create({
    userId: studentUser.id,
    type: 'APPLICATION_SUBMITTED',
    title: `Applied to ${opportunity.title}`,
    message: `Your application to ${opportunity.companyName} for ${opportunity.title} was successfully submitted.`,
    data: { opportunityId: opportunity.id, applicationId: application.id },
  });

  await AuditLog.create({
    actorId: studentUser.id,
    action: 'APPLICATION_SUBMITTED',
    category: 'STUDENT_ACTION',
    details: { opportunityId: opportunity.id, applicationId: application.id },
  });

  return application;
};

/**
 * Student withdraws their pending application
 */
const withdrawApplication = async (studentUser, applicationId) => {
  if (studentUser.role !== 'student') {
    const err = new Error('Only student applicants can withdraw their applications.');
    err.statusCode = 403;
    throw err;
  }

  const application = await OpportunityApplication.findOne({
    where: { id: applicationId, studentId: studentUser.id, collegeId: studentUser.collegeId },
    include: [{ model: Opportunity, as: 'opportunity' }],
  });

  if (!application) {
    const err = new Error('Application not found.');
    err.statusCode = 404;
    throw err;
  }

  // Student can only withdraw early stages: APPLIED, UNDER_REVIEW
  if (!['APPLIED', 'UNDER_REVIEW'].includes(application.status)) {
    const err = new Error(`Cannot withdraw application in '${application.status}' stage. Please contact your TPC administrator.`);
    err.statusCode = 400;
    throw err;
  }

  application.status = 'WITHDRAWN';
  application.currentStage = 'Withdrawn by Candidate';
  application.withdrawnAt = new Date();
  await application.save();

  if (application.opportunity) {
    await application.opportunity.decrement('applicationsCount', { by: 1 }).catch(() => {});
  }

  await AuditLog.create({
    actorId: studentUser.id,
    action: 'APPLICATION_WITHDRAWN',
    category: 'STUDENT_ACTION',
    details: { applicationId: application.id, opportunityId: application.opportunityId },
  });

  return application;
};

/**
 * Update application recruitment stage (Strict State Machine)
 */
const updateApplicationStage = async (user, applicationId, { status, currentStage, notes, finalResult }) => {
  const application = await OpportunityApplication.findOne({
    where: { id: applicationId, collegeId: user.collegeId },
    include: [
      {
        model: Opportunity,
        as: 'opportunity',
        attributes: ['id', 'title', 'companyName'],
      },
    ],
  });

  if (!application) {
    const err = new Error('Application not found.');
    err.statusCode = 404;
    throw err;
  }

  const currentStatus = application.status;
  const targetStatus = status;

  if (!targetStatus) {
    const err = new Error('Target status is required.');
    err.statusCode = 400;
    throw err;
  }

  // 1. RBAC check on status transition
  if (user.role === 'student') {
    if (application.studentId !== user.id) {
      const err = new Error('Access denied. You cannot modify another student\'s application.');
      err.statusCode = 403;
      throw err;
    }

    // Student can ONLY transition to WITHDRAWN (from APPLIED/UNDER_REVIEW) or OFFER_ACCEPTED/OFFER_DECLINED (from SELECTED)
    const allowedForStudent = {
      APPLIED: ['WITHDRAWN'],
      UNDER_REVIEW: ['WITHDRAWN'],
      SELECTED: ['OFFER_ACCEPTED', 'OFFER_DECLINED'],
    };

    if (!allowedForStudent[currentStatus]?.includes(targetStatus)) {
      const err = new Error(`Students are not permitted to change application status to '${targetStatus}'.`);
      err.statusCode = 403;
      throw err;
    }
  } else if (!isAuthorizedTpc(user)) {
    // Teachers or other roles cannot modify recruitment status
    const err = new Error('Only authorized TPC staff or administrators can update application recruitment stages.');
    err.statusCode = 403;
    throw err;
  }

  // 2. Check valid state transitions in the state machine
  const allowedNext = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowedNext.includes(targetStatus)) {
    const err = new Error(`Invalid application status transition from '${currentStatus}' to '${targetStatus}'.`);
    err.statusCode = 400;
    throw err;
  }

  // 3. Apply state transition
  application.status = targetStatus;
  if (currentStage) {
    application.currentStage = currentStage;
  } else {
    // Default stages
    const defaultStages = {
      UNDER_REVIEW: 'Under Review by TPC',
      SHORTLISTED: 'Shortlisted for Next Round',
      TEST: 'Assessment / Online Test',
      INTERVIEW: 'Interview Round',
      SELECTED: 'Selected for Placement',
      REJECTED: 'Application Not Shortlisted',
      WITHDRAWN: 'Withdrawn by Candidate',
      OFFER_ACCEPTED: 'Job Offer Accepted',
      OFFER_DECLINED: 'Job Offer Declined',
    };
    application.currentStage = defaultStages[targetStatus] || targetStatus;
  }

  if (notes !== undefined) application.notes = notes;
  if (finalResult !== undefined) application.finalResult = finalResult;
  if (targetStatus === 'WITHDRAWN') application.withdrawnAt = new Date();

  await application.save();

  // If student accepted offer, mark student placedStatus in PlacementProfile
  if (targetStatus === 'OFFER_ACCEPTED') {
    await PlacementProfile.update(
      { placedStatus: 'PLACED' },
      { where: { userId: application.studentId } }
    ).catch(() => {});
  }

  // 4. Send targeted student notification for recruitment updates
  const notificationTitles = {
    SHORTLISTED: `Congratulations! Shortlisted for ${application.opportunity?.title}`,
    TEST: `Assessment Scheduled: ${application.opportunity?.title}`,
    INTERVIEW: `Interview Scheduled: ${application.opportunity?.title}`,
    SELECTED: `Offer Extended! Selected for ${application.opportunity?.title}`,
    REJECTED: `Application Status Update: ${application.opportunity?.title}`,
    OFFER_ACCEPTED: `Offer Accepted Confirmed`,
  };

  if (notificationTitles[targetStatus]) {
    await Notification.create({
      userId: application.studentId,
      type: `APPLICATION_${targetStatus}`,
      title: notificationTitles[targetStatus],
      message: `Your application status for ${application.opportunity?.title} at ${application.opportunity?.companyName} is now: ${application.currentStage}.`,
      data: { applicationId: application.id, status: targetStatus },
    }).catch(() => {});
  }

  // 5. Audit sensitive administrative decisions
  const auditActions = {
    SHORTLISTED: 'APPLICATION_SHORTLISTED',
    SELECTED: 'STUDENT_SELECTED',
    REJECTED: 'APPLICATION_REJECTED',
    OFFER_ACCEPTED: 'OFFER_ACCEPTED',
  };

  await AuditLog.create({
    actorId: user.id,
    targetUserId: application.studentId,
    action: auditActions[targetStatus] || 'APPLICATION_STAGE_UPDATED',
    category: 'ADMIN_MODERATION',
    details: {
      applicationId: application.id,
      opportunityId: application.opportunityId,
      prevStatus: currentStatus,
      newStatus: targetStatus,
      notes,
    },
  });

  return application;
};

/**
 * Get applications list (Student sees own, TPC/Admin sees college applicants)
 */
const getApplications = async (user, query = {}) => {
  const { page = 1, limit = 20, status, opportunityId, search } = query;
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parsedLimit;

  const whereClause = { collegeId: user.collegeId };

  if (user.role === 'student') {
    whereClause.studentId = user.id;
  } else if (!isAuthorizedTpc(user)) {
    const err = new Error('Access denied to applicant lists.');
    err.statusCode = 403;
    throw err;
  }

  if (status) {
    whereClause.status = status;
  }

  if (opportunityId) {
    whereClause.opportunityId = opportunityId;
  }

  const { count, rows } = await OpportunityApplication.findAndCountAll({
    where: whereClause,
    order: [['appliedAt', 'DESC']],
    limit: parsedLimit,
    offset,
    include: [
      {
        model: Opportunity,
        as: 'opportunity',
        attributes: ['id', 'title', 'companyName', 'opportunityType', 'location', 'workMode', 'applicationDeadline'],
      },
      {
        model: User,
        as: 'student',
        attributes: ['id', 'email'],
        include: [
          {
            model: StudentProfile,
            as: 'studentProfile',
            attributes: ['fullName', 'usn', 'department', 'semester', 'skillsKnown'],
          },
          {
            model: PlacementProfile,
            as: 'placementProfile',
            attributes: ['cgpa', 'activeBacklogs', 'totalBacklogs', 'graduationYear', 'resumeUrl', 'resumeFilename'],
          },
        ],
      },
    ],
  });

  return {
    applications: rows,
    total: count,
    page: parseInt(page, 10),
    totalPages: Math.ceil(count / parsedLimit),
  };
};

/**
 * Get single application by ID with IDOR protection
 */
const getApplicationById = async (user, applicationId) => {
  const application = await OpportunityApplication.findOne({
    where: { id: applicationId, collegeId: user.collegeId },
    include: [
      {
        model: Opportunity,
        as: 'opportunity',
      },
      {
        model: User,
        as: 'student',
        attributes: ['id', 'email'],
        include: [
          {
            model: StudentProfile,
            as: 'studentProfile',
          },
          {
            model: PlacementProfile,
            as: 'placementProfile',
          },
        ],
      },
      {
        model: PlacementInterview,
        as: 'interviews',
      },
    ],
  });

  if (!application) {
    const err = new Error('Application not found.');
    err.statusCode = 404;
    throw err;
  }

  // IDOR check: student can only view their own application
  if (user.role === 'student' && application.studentId !== user.id) {
    const err = new Error('Access denied. You do not have permission to view another student\'s application.');
    err.statusCode = 403;
    throw err;
  }

  return application;
};

// ── 5. TEST & INTERVIEW SCHEDULING ────────────────────────────────────────────

/**
 * Schedule test or interview for an applicant
 */
const scheduleInterview = async (user, data) => {
  if (!isAuthorizedTpc(user)) {
    const err = new Error('Only authorized TPC staff or administrators can schedule tests and interviews.');
    err.statusCode = 403;
    throw err;
  }

  const {
    applicationId,
    type = 'TECHNICAL_INTERVIEW',
    title,
    scheduledAt,
    durationMinutes = 45,
    venue,
    meetingLink,
    instructions,
  } = data;

  if (!applicationId || !scheduledAt) {
    const err = new Error('Application ID and scheduled date/time are required.');
    err.statusCode = 400;
    throw err;
  }

  const application = await OpportunityApplication.findOne({
    where: { id: applicationId, collegeId: user.collegeId },
    include: [{ model: Opportunity, as: 'opportunity' }],
  });

  if (!application) {
    const err = new Error('Application not found in your college.');
    err.statusCode = 404;
    throw err;
  }

  const interview = await PlacementInterview.create({
    applicationId,
    opportunityId: application.opportunityId,
    studentId: application.studentId,
    collegeId: user.collegeId,
    type,
    title: title || `${type.replace(/_/g, ' ')} for ${application.opportunity?.title}`,
    scheduledAt: new Date(scheduledAt),
    durationMinutes: parseInt(durationMinutes, 10) || 45,
    venue: venue || null,
    meetingLink: meetingLink || null,
    instructions: instructions || null,
    status: 'SCHEDULED',
    result: 'PENDING',
    createdBy: user.id,
  });

  // Automatically update application status if not already on test/interview
  if (['ONLINE_TEST', 'OFFLINE_TEST'].includes(type) && !['TEST', 'INTERVIEW'].includes(application.status)) {
    application.status = 'TEST';
    application.currentStage = 'Assessment Scheduled';
    await application.save();
  } else if (!['TEST', 'INTERVIEW'].includes(application.status)) {
    application.status = 'INTERVIEW';
    application.currentStage = 'Interview Scheduled';
    await application.save();
  }

  // Notify student
  await Notification.create({
    userId: application.studentId,
    type: 'INTERVIEW_SCHEDULED',
    title: `Scheduled: ${interview.title}`,
    message: `A ${type.replace(/_/g, ' ')} has been scheduled on ${new Date(scheduledAt).toLocaleString()}. Venue/Link: ${meetingLink || venue || 'TBD'}`,
    data: { interviewId: interview.id, applicationId: application.id },
  });

  await AuditLog.create({
    actorId: user.id,
    targetUserId: application.studentId,
    action: 'INTERVIEW_SCHEDULED',
    category: 'ADMIN_MODERATION',
    details: { interviewId: interview.id, type, scheduledAt },
  });

  return interview;
};

/**
 * Update interview result or status
 */
const updateInterview = async (user, interviewId, data) => {
  if (!isAuthorizedTpc(user)) {
    const err = new Error('Only authorized TPC staff or administrators can update interviews.');
    err.statusCode = 403;
    throw err;
  }

  const interview = await PlacementInterview.findOne({
    where: { id: interviewId, collegeId: user.collegeId },
  });

  if (!interview) {
    const err = new Error('Interview not found.');
    err.statusCode = 404;
    throw err;
  }

  if (data.status) interview.status = data.status;
  if (data.result) interview.result = data.result;
  if (data.feedback !== undefined) interview.feedback = data.feedback;
  if (data.scheduledAt) interview.scheduledAt = new Date(data.scheduledAt);
  if (data.venue !== undefined) interview.venue = data.venue;
  if (data.meetingLink !== undefined) interview.meetingLink = data.meetingLink;
  if (data.instructions !== undefined) interview.instructions = data.instructions;

  await interview.save();

  await AuditLog.create({
    actorId: user.id,
    targetUserId: interview.studentId,
    action: 'INTERVIEW_UPDATED',
    category: 'ADMIN_MODERATION',
    details: { interviewId: interview.id, status: interview.status, result: interview.result },
  });

  return interview;
};

/**
 * Get interviews for user (Student sees own, TPC sees college schedule)
 */
const getInterviews = async (user, query = {}) => {
  const { page = 1, limit = 20, status, type } = query;
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parsedLimit;

  const whereClause = { collegeId: user.collegeId };

  if (user.role === 'student') {
    whereClause.studentId = user.id;
  }

  if (status) whereClause.status = status;
  if (type) whereClause.type = type;

  const { count, rows } = await PlacementInterview.findAndCountAll({
    where: whereClause,
    order: [['scheduledAt', 'ASC']],
    limit: parsedLimit,
    offset,
    include: [
      {
        model: Opportunity,
        as: 'opportunity',
        attributes: ['id', 'title', 'companyName', 'location', 'workMode'],
      },
      {
        model: User,
        as: 'student',
        attributes: ['id', 'email'],
        include: [
          {
            model: StudentProfile,
            as: 'studentProfile',
            attributes: ['fullName', 'usn', 'department'],
          },
        ],
      },
    ],
  });

  return {
    interviews: rows,
    total: count,
    page: parseInt(page, 10),
    totalPages: Math.ceil(count / parsedLimit),
  };
};

// ── 6. PLACEMENT PROFILE & RESUME HANDLING ────────────────────────────────────

/**
 * Get placement profile for authenticated student or for admin reviewing student
 */
const getPlacementProfile = async (user, targetUserId = null) => {
  const userId = targetUserId && isAuthorizedTpc(user) ? targetUserId : user.id;

  let profile = await PlacementProfile.findOne({
    where: { userId, collegeId: user.collegeId },
  });

  if (!profile) {
    if (user.role === 'student') {
      profile = await PlacementProfile.create({
        userId: user.id,
        collegeId: user.collegeId,
      });
    } else {
      const err = new Error('Placement profile not found.');
      err.statusCode = 404;
      throw err;
    }
  }

  const studentProfile = await StudentProfile.findOne({
    where: { userId },
  });

  return {
    ...profile.toJSON(),
    studentAcademicInfo: studentProfile ? {
      fullName: studentProfile.fullName,
      usn: studentProfile.usn,
      department: studentProfile.department,
      semester: studentProfile.semester,
      academicYear: studentProfile.academicYear,
      skillsKnown: studentProfile.skillsKnown,
      skillsWanted: studentProfile.skillsWanted,
      projects: studentProfile.projects,
      certifications: studentProfile.certifications,
    } : null,
  };
};

/**
 * Update student placement profile
 */
const updatePlacementProfile = async (user, data) => {
  if (user.role !== 'student') {
    const err = new Error('Only students can maintain placement profiles.');
    err.statusCode = 403;
    throw err;
  }

  let profile = await PlacementProfile.findOne({
    where: { userId: user.id, collegeId: user.collegeId },
  });

  if (!profile) {
    profile = await PlacementProfile.create({
      userId: user.id,
      collegeId: user.collegeId,
    });
  }

  if (data.cgpa !== undefined) {
    const cgpaNum = Number(data.cgpa);
    if (isNaN(cgpaNum) || cgpaNum < 0 || cgpaNum > 10) {
      const err = new Error('CGPA must be a valid number between 0.0 and 10.0.');
      err.statusCode = 400;
      throw err;
    }
    profile.cgpa = cgpaNum;
  }

  if (data.activeBacklogs !== undefined) {
    profile.activeBacklogs = Math.max(0, parseInt(data.activeBacklogs, 10) || 0);
  }

  if (data.totalBacklogs !== undefined) {
    profile.totalBacklogs = Math.max(0, parseInt(data.totalBacklogs, 10) || 0);
  }

  if (data.graduationYear !== undefined) {
    profile.graduationYear = data.graduationYear ? parseInt(data.graduationYear, 10) : null;
  }

  if (data.preferredRoles !== undefined) profile.preferredRoles = data.preferredRoles;
  if (data.preferredLocations !== undefined) profile.preferredLocations = data.preferredLocations;
  if (data.preferredWorkMode !== undefined) profile.preferredWorkMode = data.preferredWorkMode;
  if (data.linkedinUrl !== undefined) profile.linkedinUrl = data.linkedinUrl;
  if (data.githubUrl !== undefined) profile.githubUrl = data.githubUrl;
  if (data.portfolioUrl !== undefined) profile.portfolioUrl = data.portfolioUrl;
  if (data.isWillingToRelocate !== undefined) profile.isWillingToRelocate = !!data.isWillingToRelocate;
  if (data.placedStatus !== undefined) profile.placedStatus = data.placedStatus;

  await profile.save();
  return profile;
};

/**
 * Upload student resume securely
 */
const uploadResume = async (user, file) => {
  if (user.role !== 'student') {
    const err = new Error('Only students can upload resumes.');
    err.statusCode = 403;
    throw err;
  }

  if (!file) {
    const err = new Error('Resume file is required.');
    err.statusCode = 400;
    throw err;
  }

  const stored = await storageService.saveResume({
    buffer: file.buffer,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
  });

  let profile = await PlacementProfile.findOne({
    where: { userId: user.id, collegeId: user.collegeId },
  });

  if (!profile) {
    profile = await PlacementProfile.create({
      userId: user.id,
      collegeId: user.collegeId,
    });
  }

  // If old resume exists, optionally remove it
  if (profile.resumeFilename && profile.resumeFilename !== stored.fileName) {
    await storageService.deleteResume(profile.resumeFilename).catch(() => {});
  }

  profile.resumeUrl = stored.fileUrl;
  profile.resumeFilename = stored.fileName;
  profile.resumeUploadedAt = new Date();
  await profile.save();

  return {
    message: 'Resume uploaded successfully.',
    resumeUrl: stored.fileUrl,
    resumeFilename: stored.fileName,
  };
};

/**
 * Stream/download resume with strict IDOR access control
 */
const getResumeAccess = async (user, filename) => {
  if (!filename) {
    const err = new Error('Resume filename is required.');
    err.statusCode = 400;
    throw err;
  }

  // 1. Check if user is the student owner of this resume
  const ownProfile = await PlacementProfile.findOne({
    where: { userId: user.id, resumeFilename: filename },
  });

  const ownApplication = await OpportunityApplication.findOne({
    where: { studentId: user.id, resumeFilename: filename },
  });

  const isOwner = !!(ownProfile || ownApplication);

  // 2. Check if user is authorized TPC/Admin in the SAME college
  let isAuthorizedAdmin = false;
  if (isAuthorizedTpc(user)) {
    const collegeProfile = await PlacementProfile.findOne({
      where: { collegeId: user.collegeId, resumeFilename: filename },
    });
    const collegeApp = await OpportunityApplication.findOne({
      where: { collegeId: user.collegeId, resumeFilename: filename },
    });
    if (collegeProfile || collegeApp) {
      isAuthorizedAdmin = true;
    }
  }

  if (!isOwner && !isAuthorizedAdmin) {
    const err = new Error('Access denied. You do not have authorization to view this private resume document.');
    err.statusCode = 403;
    throw err;
  }

  const physicalPath = storageService.getResumeFilePath(filename);
  return { physicalPath, filename };
};

// ── 7. BOOKMARKS ──────────────────────────────────────────────────────────────

/**
 * Bookmark an opportunity
 */
const bookmarkOpportunity = async (studentUser, opportunityId) => {
  if (studentUser.role !== 'student') {
    const err = new Error('Only students can bookmark opportunities.');
    err.statusCode = 403;
    throw err;
  }

  const opp = await Opportunity.findOne({
    where: { id: opportunityId, collegeId: studentUser.collegeId },
  });

  if (!opp) {
    const err = new Error('Opportunity not found.');
    err.statusCode = 404;
    throw err;
  }

  const existing = await OpportunityBookmark.findOne({
    where: { opportunityId, studentId: studentUser.id },
  });

  if (existing) {
    const err = new Error('Opportunity already bookmarked.');
    err.statusCode = 409;
    throw err;
  }

  return await OpportunityBookmark.create({
    opportunityId,
    studentId: studentUser.id,
  });
};

/**
 * Unbookmark an opportunity
 */
const unbookmarkOpportunity = async (studentUser, opportunityId) => {
  if (studentUser.role !== 'student') {
    const err = new Error('Only students can manage bookmarks.');
    err.statusCode = 403;
    throw err;
  }

  const deleted = await OpportunityBookmark.destroy({
    where: { opportunityId, studentId: studentUser.id },
  });

  if (!deleted) {
    const err = new Error('Bookmark not found.');
    err.statusCode = 404;
    throw err;
  }

  return { message: 'Opportunity removed from bookmarks.' };
};

/**
 * List student's saved opportunities
 */
const getSavedOpportunities = async (studentUser, query = {}) => {
  const bookmarks = await OpportunityBookmark.findAll({
    where: { studentId: studentUser.id },
    include: [
      {
        model: Opportunity,
        as: 'opportunity',
        where: { collegeId: studentUser.collegeId },
        include: [
          {
            model: Company,
            as: 'company',
            attributes: ['id', 'name', 'logo'],
          },
        ],
      },
    ],
  });

  return bookmarks.map((b) => b.opportunity).filter(Boolean);
};

// ── 8. REPORTING ──────────────────────────────────────────────────────────────

/**
 * Report suspicious or scam opportunity
 */
const reportOpportunity = async (user, opportunityId, { category, description }) => {
  const opportunity = await Opportunity.findOne({
    where: { id: opportunityId, collegeId: user.collegeId },
  });

  if (!opportunity) {
    const err = new Error('Opportunity not found.');
    err.statusCode = 404;
    throw err;
  }

  const report = await Report.create({
    reporterId: user.id,
    opportunityId: opportunity.id,
    category: category || 'fake_opportunity',
    description: description || 'Flagged for moderation by user',
    status: 'pending',
  });

  await AuditLog.create({
    actorId: user.id,
    action: 'OPPORTUNITY_REPORTED',
    category: 'SAFETY',
    details: { opportunityId: opportunity.id, category, description },
  });

  return report;
};

// ── 9. PLACEMENT ANALYTICS ────────────────────────────────────────────────────

/**
 * Placement Analytics for Dashboard
 */
const getPlacementStats = async (user) => {
  if (isAuthorizedTpc(user)) {
    // Admin / TPC comprehensive analytics
    const [
      totalOpportunities,
      publishedOpportunities,
      internships,
      fullTime,
      campusDrives,
      totalApplications,
      shortlistedCount,
      interviewCount,
      selectedCount,
      acceptedCount,
      allApplications,
    ] = await Promise.all([
      Opportunity.count({ where: { collegeId: user.collegeId } }),
      Opportunity.count({ where: { collegeId: user.collegeId, status: { [Op.in]: ['PUBLISHED', 'APPLICATION_OPEN'] } } }),
      Opportunity.count({ where: { collegeId: user.collegeId, opportunityType: 'INTERNSHIP' } }),
      Opportunity.count({ where: { collegeId: user.collegeId, opportunityType: 'FULL_TIME' } }),
      Opportunity.count({ where: { collegeId: user.collegeId, opportunityType: 'CAMPUS_DRIVE' } }),
      OpportunityApplication.count({ where: { collegeId: user.collegeId } }),
      OpportunityApplication.count({ where: { collegeId: user.collegeId, status: 'SHORTLISTED' } }),
      OpportunityApplication.count({ where: { collegeId: user.collegeId, status: { [Op.in]: ['TEST', 'INTERVIEW'] } } }),
      OpportunityApplication.count({ where: { collegeId: user.collegeId, status: 'SELECTED' } }),
      OpportunityApplication.count({ where: { collegeId: user.collegeId, status: 'OFFER_ACCEPTED' } }),
      OpportunityApplication.findAll({
        where: { collegeId: user.collegeId },
        include: [
          {
            model: Opportunity,
            as: 'opportunity',
            attributes: ['companyName', 'opportunityType'],
          },
          {
            model: User,
            as: 'student',
            attributes: ['id'],
            include: [
              {
                model: StudentProfile,
                as: 'studentProfile',
                attributes: ['department'],
              },
            ],
          },
        ],
      }),
    ]);

    // Department breakdown
    const deptBreakdown = {};
    const companySelections = {};

    allApplications.forEach((app) => {
      const dept = app.student?.studentProfile?.department || 'General';
      if (!deptBreakdown[dept]) deptBreakdown[dept] = { applications: 0, selections: 0 };
      deptBreakdown[dept].applications++;
      if (['SELECTED', 'OFFER_ACCEPTED'].includes(app.status)) {
        deptBreakdown[dept].selections++;
      }

      if (['SELECTED', 'OFFER_ACCEPTED'].includes(app.status) && app.opportunity?.companyName) {
        const cName = app.opportunity.companyName;
        companySelections[cName] = (companySelections[cName] || 0) + 1;
      }
    });

    const uniqueApplicantsCount = new Set(allApplications.map((a) => a.studentId)).size;
    const placementRate = uniqueApplicantsCount > 0
      ? Math.round(((selectedCount + acceptedCount) / uniqueApplicantsCount) * 100)
      : 0;

    return {
      totalOpportunities,
      publishedOpportunities,
      internships,
      fullTime,
      campusDrives,
      totalApplications,
      shortlistedCount,
      interviewCount,
      selectedCount,
      acceptedCount,
      uniqueApplicantsCount,
      placementRate,
      deptBreakdown,
      companySelections,
    };
  }

  // Student personal stats
  const [
    myApplicationsCount,
    myShortlistedCount,
    myInterviewsCount,
    mySelectedCount,
    mySavedCount,
  ] = await Promise.all([
    OpportunityApplication.count({ where: { studentId: user.id, collegeId: user.collegeId } }),
    OpportunityApplication.count({ where: { studentId: user.id, collegeId: user.collegeId, status: 'SHORTLISTED' } }),
    PlacementInterview.count({ where: { studentId: user.id, collegeId: user.collegeId } }),
    OpportunityApplication.count({ where: { studentId: user.id, collegeId: user.collegeId, status: { [Op.in]: ['SELECTED', 'OFFER_ACCEPTED'] } } }),
    OpportunityBookmark.count({ where: { studentId: user.id } }),
  ]);

  return {
    myApplicationsCount,
    myShortlistedCount,
    myInterviewsCount,
    mySelectedCount,
    mySavedCount,
  };
};

module.exports = {
  createCompany,
  getCompanies,
  verifyCompany,
  evaluateEligibility,
  createOpportunity,
  updateOpportunity,
  publishOpportunity,
  closeOpportunity,
  cancelOpportunity,
  getOpportunities,
  getOpportunityById,
  applyOpportunity,
  withdrawApplication,
  updateApplicationStage,
  getApplications,
  getApplicationById,
  scheduleInterview,
  updateInterview,
  getInterviews,
  getPlacementProfile,
  updatePlacementProfile,
  uploadResume,
  getResumeAccess,
  bookmarkOpportunity,
  unbookmarkOpportunity,
  getSavedOpportunities,
  reportOpportunity,
  getPlacementStats,
};
