'use strict';

const { Op } = require('sequelize');
const {
  Resource,
  ResourceBookmark,
  User,
  TeacherProfile,
  StudentProfile,
  Department,
  College,
  Report,
  AuditLog,
  Notification,
} = require('../models');
const storageService = require('./storageService');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

// In-memory anti-abuse debouncing maps: key -> timestamp
const viewDebounceMap = new Map();
const downloadDebounceMap = new Map();

// Periodic cleanup of debounce maps every 10 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of viewDebounceMap.entries()) {
    if (now - timestamp > 5 * 60 * 1000) viewDebounceMap.delete(key);
  }
  for (const [key, timestamp] of downloadDebounceMap.entries()) {
    if (now - timestamp > 5 * 60 * 1000) downloadDebounceMap.delete(key);
  }
}, 10 * 60 * 1000).unref();

const REPORT_REASONS = [
  'Incorrect content',
  'Copyright concern',
  'Wrong subject',
  'Duplicate',
  'Inappropriate',
  'Broken file',
  'Misleading information',
  'Other',
];

/**
 * RESOURCE SERVICE
 * Core business logic for Academic Resource Vault.
 */

/**
 * Create a new academic resource
 */
const createResource = async (user, data, file = null) => {
  // 1. Role validation: Only teachers and admins can upload official resources
  if (user.role !== 'teacher' && user.role !== 'admin') {
    const err = new Error('Students cannot upload official campus resources directly.');
    err.statusCode = 403;
    throw err;
  }

  // 2. Validate essential metadata
  const {
    title,
    description,
    resourceType,
    subject,
    subjectCode,
    departmentId,
    semester,
    academicYear,
    university,
    tags,
    visibility = 'COLLEGE',
    isDraft = false,
  } = data;

  if (!title || !title.trim()) {
    const err = new Error('Resource title is required.');
    err.statusCode = 400;
    throw err;
  }

  if (!subject || !subject.trim()) {
    const err = new Error('Subject name is required.');
    err.statusCode = 400;
    throw err;
  }

  if (!subjectCode || !subjectCode.trim()) {
    const err = new Error('Subject code is required.');
    err.statusCode = 400;
    throw err;
  }

  if (!resourceType || !Resource.RESOURCE_TYPES.includes(resourceType)) {
    const err = new Error(`Invalid resource type '${resourceType}'. Supported: ${Resource.RESOURCE_TYPES.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  if (semester !== undefined && semester !== null && semester !== '') {
    const semNum = parseInt(semester, 10);
    if (isNaN(semNum) || semNum < 1 || semNum > 10) {
      const err = new Error('Semester must be an integer between 1 and 10.');
      err.statusCode = 400;
      throw err;
    }
  }

  // 3. File processing
  let fileMetadata = {};
  if (file) {
    fileMetadata = await storageService.saveFile(file);
  } else if (data.fileUrl && data.fileName) {
    storageService.validateFile({
      originalname: data.fileName,
      mimetype: data.fileType,
      size: data.fileSize || 1024,
    });
    fileMetadata = {
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      fileType: data.fileType || 'application/pdf',
      fileSize: data.fileSize || null,
    };
  } else {
    const err = new Error('A resource file or valid file attachment is required.');
    err.statusCode = 400;
    throw err;
  }

  // 4. Determine status based on role and request
  let status = 'PENDING_REVIEW';
  if (user.role === 'admin') {
    status = data.status || 'PUBLISHED';
  } else if (isDraft || data.status === 'DRAFT') {
    status = 'DRAFT';
  } else if (data.status === 'PENDING_REVIEW') {
    status = 'PENDING_REVIEW';
  }

  // 5. Parse tags
  let parsedTags = [];
  if (Array.isArray(tags)) {
    parsedTags = tags;
  } else if (typeof tags === 'string') {
    parsedTags = tags.split(',').map((t) => t.trim()).filter(Boolean);
  }

  // 6. Persist resource
  const resource = await Resource.create({
    collegeId: user.collegeId,
    uploadedBy: user.id,
    title: title.trim(),
    description: description ? description.trim() : null,
    resourceType,
    subject: subject.trim(),
    subjectCode: subjectCode.trim().toUpperCase(),
    departmentId: departmentId || (user.teacherProfile ? user.teacherProfile.departmentId : null),
    semester: semester ? parseInt(semester, 10) : null,
    academicYear: academicYear || null,
    university: university || 'Visvesvaraya Technological University (VTU)',
    tags: parsedTags,
    fileUrl: fileMetadata.fileUrl,
    fileName: fileMetadata.fileName,
    fileType: fileMetadata.fileType,
    fileSize: fileMetadata.fileSize,
    thumbnailUrl: data.thumbnailUrl || null,
    visibility: Resource.RESOURCE_VISIBILITIES.includes(visibility) ? visibility : 'COLLEGE',
    status,
  });

  // Increment teacher's totalResourcesShared
  if (user.role === 'teacher' && user.teacherProfile) {
    await user.teacherProfile.increment('totalResourcesShared');
  }

  return resource;
};

/**
 * Verify if a user is eligible to view/download a resource
 */
const canUserAccessResource = (user, resource) => {
  // 1. Cross-college isolation
  if (resource.collegeId !== user.collegeId) {
    const err = new Error('Cross-college access denied. Resource belongs to another institution.');
    err.statusCode = 403;
    throw err;
  }

  // 2. Admins and uploader have full access
  if (user.role === 'admin' || resource.uploadedBy === user.id) {
    return true;
  }

  // 3. Status check: Only PUBLISHED resources can be accessed by students / peers
  if (resource.status !== 'PUBLISHED') {
    const err = new Error(`Resource is not accessible (current status: ${resource.status}).`);
    err.statusCode = 403;
    throw err;
  }

  // 4. Target visibility enforcement
  if (resource.visibility === 'PRIVATE') {
    const err = new Error('This resource is marked as private by the uploader.');
    err.statusCode = 403;
    throw err;
  }

  if (resource.visibility === 'DEPARTMENT') {
    const studentDeptId = user.studentProfile?.departmentId;
    if (resource.departmentId && studentDeptId && resource.departmentId !== studentDeptId) {
      const err = new Error('Access restricted: This resource is targeted for another department.');
      err.statusCode = 403;
      throw err;
    }
  }

  if (resource.visibility === 'SEMESTER') {
    const studentSem = user.studentProfile?.semester;
    if (resource.semester && studentSem && resource.semester !== studentSem) {
      const err = new Error(`Access restricted: This resource is targeted for Semester ${resource.semester}.`);
      err.statusCode = 403;
      throw err;
    }
  }

  return true;
};

/**
 * Get paginated list of resources with DB-level filtering and sorting
 */
const getResources = async (user, query = {}) => {
  const {
    search,
    q,
    resourceType,
    departmentId,
    semester,
    subject,
    subjectCode,
    academicYear,
    uploaderId,
    sortBy = 'newest',
    page = 1,
    limit = 12,
  } = query;

  const where = {
    collegeId: user.collegeId,
  };

  // For students, strictly enforce PUBLISHED status and visibility rules
  if (user.role === 'student') {
    where.status = 'PUBLISHED';

    const visibilityOrConditions = [{ visibility: 'COLLEGE' }];

    if (user.studentProfile?.departmentId) {
      visibilityOrConditions.push({
        [Op.and]: [
          { visibility: 'DEPARTMENT' },
          { departmentId: user.studentProfile.departmentId },
        ],
      });
    }

    if (user.studentProfile?.semester) {
      visibilityOrConditions.push({
        [Op.and]: [
          { visibility: 'SEMESTER' },
          { semester: user.studentProfile.semester },
        ],
      });
    }

    where[Op.or] = visibilityOrConditions;
  } else if (user.role === 'teacher') {
    // Teachers in discovery view see published resources or their own
    if (query.status && query.status !== 'all') {
      where.status = query.status;
    } else {
      where[Op.or] = [
        { status: 'PUBLISHED' },
        { uploadedBy: user.id },
      ];
    }
  } else if (user.role === 'admin') {
    if (query.status && query.status !== 'all') {
      where.status = query.status;
    }
  }

  // Filter by resourceType
  if (resourceType && resourceType !== 'all') {
    where.resourceType = resourceType;
  }

  // Filter by departmentId
  if (departmentId && departmentId !== 'all') {
    where.departmentId = departmentId;
  }

  // Filter by semester
  if (semester && semester !== 'all') {
    const semNum = parseInt(semester, 10);
    if (!isNaN(semNum)) where.semester = semNum;
  }

  // Filter by subject
  if (subject && subject.trim()) {
    where.subject = { [Op.like]: `%${subject.trim()}%` };
  }

  // Filter by subjectCode
  if (subjectCode && subjectCode.trim()) {
    where.subjectCode = subjectCode.trim().toUpperCase();
  }

  // Filter by academicYear
  if (academicYear && academicYear !== 'all') {
    where.academicYear = academicYear;
  }

  // Filter by uploader
  if (uploaderId) {
    where.uploadedBy = uploaderId;
  }

  // Full-text / Multi-field search
  const searchTerm = (search || q || '').trim();
  if (searchTerm) {
    const searchClause = [
      { title: { [Op.like]: `%${searchTerm}%` } },
      { description: { [Op.like]: `%${searchTerm}%` } },
      { subject: { [Op.like]: `%${searchTerm}%` } },
      { subjectCode: { [Op.like]: `%${searchTerm}%` } },
    ];

    if (where[Op.or]) {
      // Combine visibility or-clause with search
      where[Op.and] = [
        { [Op.or]: where[Op.or] },
        { [Op.or]: searchClause },
      ];
      delete where[Op.or];
    } else {
      where[Op.or] = searchClause;
    }
  }

  // Sorting
  let order = [['createdAt', 'DESC']];
  if (sortBy === 'most_downloaded') {
    order = [['downloadCount', 'DESC'], ['createdAt', 'DESC']];
  } else if (sortBy === 'most_viewed') {
    order = [['viewCount', 'DESC'], ['createdAt', 'DESC']];
  }

  // Pagination
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
  const offset = (pageNum - 1) * pageSize;

  const { rows, count } = await Resource.findAndCountAll({
    where,
    order,
    limit: pageSize,
    offset,
    include: [
      {
        model: User,
        as: 'uploader',
        attributes: ['id', 'email', 'role', 'isAdminVerified'],
        include: [
          {
            model: TeacherProfile,
            as: 'teacherProfile',
            attributes: ['fullName', 'designation', 'department', 'profilePhoto'],
          },
        ],
      },
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name', 'code'],
      },
    ],
  });

  return {
    resources: rows,
    total: count,
    page: pageNum,
    totalPages: Math.ceil(count / pageSize),
  };
};

/**
 * Retrieve resource by ID with access control
 */
const getResourceById = async (user, resourceId) => {
  const resource = await Resource.findByPk(resourceId, {
    include: [
      {
        model: User,
        as: 'uploader',
        attributes: ['id', 'email', 'role', 'isAdminVerified'],
        include: [
          {
            model: TeacherProfile,
            as: 'teacherProfile',
            attributes: ['fullName', 'designation', 'department', 'cabinLocation', 'profilePhoto'],
          },
        ],
      },
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name', 'code'],
      },
    ],
  });

  if (!resource) {
    const err = new Error('Resource not found.');
    err.statusCode = 404;
    throw err;
  }

  // Verify access eligibility
  canUserAccessResource(user, resource);

  // Check if saved by this user
  let isSaved = false;
  const bookmark = await ResourceBookmark.findOne({
    where: { resourceId: resource.id, studentId: user.id },
  });
  if (bookmark) isSaved = true;

  const plainResource = resource.toJSON();
  plainResource.isSaved = isSaved;

  return plainResource;
};

/**
 * Update resource metadata (IDOR protected)
 */
const updateResource = async (user, resourceId, updates, file = null) => {
  const resource = await Resource.findByPk(resourceId);
  if (!resource) {
    const err = new Error('Resource not found.');
    err.statusCode = 404;
    throw err;
  }

  // College check
  if (resource.collegeId !== user.collegeId) {
    const err = new Error('Cross-college access forbidden.');
    err.statusCode = 403;
    throw err;
  }

  // IDOR protection: Teachers can only edit their own resources
  if (user.role === 'teacher' && resource.uploadedBy !== user.id) {
    const err = new Error('You cannot modify another teacher\'s resource.');
    err.statusCode = 403;
    throw err;
  }

  // Students cannot modify official resources
  if (user.role === 'student') {
    const err = new Error('Access denied.');
    err.statusCode = 403;
    throw err;
  }

  // Replace file if provided
  if (file) {
    const fileMetadata = await storageService.saveFile(file);
    await storageService.deleteFile(resource.fileUrl);
    resource.fileUrl = fileMetadata.fileUrl;
    resource.fileName = fileMetadata.fileName;
    resource.fileType = fileMetadata.fileType;
    resource.fileSize = fileMetadata.fileSize;
  }

  // Updatable fields
  const allowedFields = [
    'title',
    'description',
    'resourceType',
    'subject',
    'subjectCode',
    'departmentId',
    'semester',
    'academicYear',
    'university',
    'tags',
    'visibility',
  ];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      if (field === 'subjectCode') {
        resource[field] = updates[field].trim().toUpperCase();
      } else if (field === 'tags' && typeof updates[field] === 'string') {
        resource[field] = updates[field].split(',').map((t) => t.trim()).filter(Boolean);
      } else {
        resource[field] = updates[field];
      }
    }
  }

  // If resource was rejected, editing resets it to PENDING_REVIEW
  if (resource.status === 'REJECTED' && updates.resubmit) {
    resource.status = 'PENDING_REVIEW';
    resource.moderationReason = null;
  }

  await resource.save();
  return resource;
};

/**
 * Submit draft or rejected resource for administrative review
 */
const submitForReview = async (user, resourceId) => {
  const resource = await Resource.findByPk(resourceId);
  if (!resource) {
    const err = new Error('Resource not found.');
    err.statusCode = 404;
    throw err;
  }

  if (resource.uploadedBy !== user.id && user.role !== 'admin') {
    const err = new Error('You cannot submit another user\'s resource for review.');
    err.statusCode = 403;
    throw err;
  }

  if (resource.status !== 'DRAFT' && resource.status !== 'REJECTED') {
    const err = new Error(`Resource is currently '${resource.status}' and cannot be submitted for review.`);
    err.statusCode = 400;
    throw err;
  }

  resource.status = 'PENDING_REVIEW';
  resource.moderationReason = null;
  await resource.save();

  return resource;
};

/**
 * Admin: Approve and publish resource
 */
const publishResource = async (adminUser, resourceId) => {
  if (adminUser.role !== 'admin') {
    const err = new Error('Only administrators can approve and publish resources.');
    err.statusCode = 403;
    throw err;
  }

  const resource = await Resource.findByPk(resourceId);
  if (!resource) {
    const err = new Error('Resource not found.');
    err.statusCode = 404;
    throw err;
  }

  if (resource.collegeId !== adminUser.collegeId) {
    const err = new Error('Cross-college resource moderation is forbidden.');
    err.statusCode = 403;
    throw err;
  }

  resource.status = 'PUBLISHED';
  resource.moderationReason = null;
  resource.moderatedById = adminUser.id;
  resource.moderatedAt = new Date();
  await resource.save();

  // In-app notification to uploader
  await notificationService.createNotification({
    userId: resource.uploadedBy,
    type: 'RESOURCE_APPROVED',
    title: 'Resource Approved & Published',
    message: `Your resource "${resource.title}" (${resource.subjectCode}) has been verified and published to the Resource Vault.`,
    data: { resourceId: resource.id },
  });

  return resource;
};

/**
 * Admin: Reject resource with mandatory moderation reason
 */
const rejectResource = async (adminUser, resourceId, reason) => {
  if (adminUser.role !== 'admin') {
    const err = new Error('Only administrators can reject resources.');
    err.statusCode = 403;
    throw err;
  }

  if (!reason || !reason.trim()) {
    const err = new Error('A moderation reason is required when rejecting a resource.');
    err.statusCode = 400;
    throw err;
  }

  const resource = await Resource.findByPk(resourceId);
  if (!resource) {
    const err = new Error('Resource not found.');
    err.statusCode = 404;
    throw err;
  }

  if (resource.collegeId !== adminUser.collegeId) {
    const err = new Error('Cross-college resource moderation is forbidden.');
    err.statusCode = 403;
    throw err;
  }

  resource.status = 'REJECTED';
  resource.moderationReason = reason.trim();
  resource.moderatedById = adminUser.id;
  resource.moderatedAt = new Date();
  await resource.save();

  // In-app notification to uploader
  await notificationService.createNotification({
    userId: resource.uploadedBy,
    type: 'RESOURCE_REJECTED',
    title: 'Resource Review Notice',
    message: `Your resource "${resource.title}" was not approved. Reason: ${reason.trim()}`,
    data: { resourceId: resource.id, reason: reason.trim() },
  });

  return resource;
};

/**
 * Archive a resource
 */
const archiveResource = async (user, resourceId) => {
  const resource = await Resource.findByPk(resourceId);
  if (!resource) {
    const err = new Error('Resource not found.');
    err.statusCode = 404;
    throw err;
  }

  if (resource.collegeId !== user.collegeId) {
    const err = new Error('Cross-college access denied.');
    err.statusCode = 403;
    throw err;
  }

  if (user.role !== 'admin' && resource.uploadedBy !== user.id) {
    const err = new Error('You cannot archive another user\'s resource.');
    err.statusCode = 403;
    throw err;
  }

  resource.status = 'ARCHIVED';
  await resource.save();

  return resource;
};

/**
 * Permanently delete a resource
 */
const deleteResource = async (user, resourceId) => {
  const resource = await Resource.findByPk(resourceId);
  if (!resource) {
    const err = new Error('Resource not found.');
    err.statusCode = 404;
    throw err;
  }

  if (resource.collegeId !== user.collegeId) {
    const err = new Error('Cross-college access denied.');
    err.statusCode = 403;
    throw err;
  }

  // Only admin or the uploader of a DRAFT resource can permanently delete
  if (user.role !== 'admin' && !(resource.uploadedBy === user.id && resource.status === 'DRAFT')) {
    const err = new Error('Only administrators can permanently delete published or reviewed resources.');
    err.statusCode = 403;
    throw err;
  }

  // Delete physical file
  await storageService.deleteFile(resource.fileUrl);

  // Delete DB record
  await resource.destroy();

  return true;
};

/**
 * Anti-abuse debounced view counter
 */
const recordView = async (user, resourceId, ip = '') => {
  const resource = await Resource.findByPk(resourceId);
  if (!resource) {
    const err = new Error('Resource not found.');
    err.statusCode = 404;
    throw err;
  }

  canUserAccessResource(user, resource);

  // Debounce key: user ID or IP + resource ID within 60 seconds
  const debounceKey = `${user.id || ip}:${resourceId}`;
  const lastViewTime = viewDebounceMap.get(debounceKey);
  const now = Date.now();

  if (!lastViewTime || now - lastViewTime > 60 * 1000) {
    await resource.increment('viewCount');
    viewDebounceMap.set(debounceKey, now);
    resource.viewCount += 1;
  }

  return { viewCount: resource.viewCount };
};

/**
 * Track download and retrieve physical file path
 */
const trackDownloadAndGetPath = async (user, resourceId, ip = '') => {
  const resource = await Resource.findByPk(resourceId);
  if (!resource) {
    const err = new Error('Resource not found.');
    err.statusCode = 404;
    throw err;
  }

  canUserAccessResource(user, resource);

  // Debounce key for download count: 30 seconds
  const debounceKey = `${user.id || ip}:${resourceId}`;
  const lastDownload = downloadDebounceMap.get(debounceKey);
  const now = Date.now();

  if (!lastDownload || now - lastDownload > 30 * 1000) {
    await resource.increment('downloadCount');
    downloadDebounceMap.set(debounceKey, now);
    resource.downloadCount += 1;
  }

  const physicalPath = storageService.getFilePath(resource.fileUrl);

  return {
    resource,
    physicalPath,
  };
};

/**
 * Bookmark/save resource
 */
const bookmarkResource = async (user, resourceId) => {
  const resource = await Resource.findByPk(resourceId);
  if (!resource) {
    const err = new Error('Resource not found.');
    err.statusCode = 404;
    throw err;
  }

  canUserAccessResource(user, resource);

  // Check duplicate bookmark
  const existing = await ResourceBookmark.findOne({
    where: { resourceId, studentId: user.id },
  });

  if (existing) {
    const err = new Error('Resource is already saved in your bookmarks.');
    err.statusCode = 409;
    throw err;
  }

  const bookmark = await ResourceBookmark.create({
    resourceId,
    studentId: user.id,
  });

  return bookmark;
};

/**
 * Remove bookmark
 */
const unbookmarkResource = async (user, resourceId) => {
  const bookmark = await ResourceBookmark.findOne({
    where: { resourceId, studentId: user.id },
  });

  if (!bookmark) {
    const err = new Error('Bookmark not found.');
    err.statusCode = 404;
    throw err;
  }

  await bookmark.destroy();
  return true;
};

/**
 * Get student's saved resources
 */
const getSavedResources = async (user, query = {}) => {
  const pageNum = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 12));
  const offset = (pageNum - 1) * pageSize;

  const { rows, count } = await ResourceBookmark.findAndCountAll({
    where: { studentId: user.id },
    order: [['createdAt', 'DESC']],
    limit: pageSize,
    offset,
    include: [
      {
        model: Resource,
        as: 'resource',
        include: [
          {
            model: User,
            as: 'uploader',
            attributes: ['id', 'email', 'role'],
            include: [{ model: TeacherProfile, as: 'teacherProfile', attributes: ['fullName', 'designation'] }],
          },
          {
            model: Department,
            as: 'department',
            attributes: ['id', 'name', 'code'],
          },
        ],
      },
    ],
  });

  const formatted = rows
    .filter((b) => b.resource && b.resource.status === 'PUBLISHED')
    .map((b) => {
      const resData = b.resource.toJSON();
      resData.isSaved = true;
      resData.bookmarkedAt = b.createdAt;
      return resData;
    });

  return {
    savedResources: formatted,
    total: count,
    page: pageNum,
    totalPages: Math.ceil(count / pageSize),
  };
};

/**
 * Report a resource for administrative moderation
 */
const reportResource = async (user, resourceId, { category, description }) => {
  const resource = await Resource.findByPk(resourceId);
  if (!resource) {
    const err = new Error('Resource not found.');
    err.statusCode = 404;
    throw err;
  }

  canUserAccessResource(user, resource);

  if (!category || !REPORT_REASONS.includes(category)) {
    const err = new Error(`Report category must be one of: ${REPORT_REASONS.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  // Prevent duplicate pending reports from same reporter for same resource
  const existingPending = await Report.findOne({
    where: {
      reporterId: user.id,
      resourceId: resource.id,
      status: 'pending',
    },
  });

  if (existingPending) {
    const err = new Error('You already have a pending report for this resource.');
    err.statusCode = 409;
    throw err;
  }

  const report = await Report.create({
    reporterId: user.id,
    reportedUserId: resource.uploadedBy,
    resourceId: resource.id,
    category,
    description: description ? description.trim().slice(0, 1000) : null,
    status: 'pending',
  });

  return report;
};

/**
 * Teacher: Get self-uploaded resources
 */
const getTeacherResources = async (user, query = {}) => {
  const { status, page = 1, limit = 20 } = query;
  const where = { uploadedBy: user.id };

  if (status && status !== 'all') {
    where.status = status;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * pageSize;

  const { rows, count } = await Resource.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: pageSize,
    offset,
    include: [
      { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
    ],
  });

  return {
    resources: rows,
    total: count,
    page: pageNum,
    totalPages: Math.ceil(count / pageSize),
  };
};

/**
 * Teacher: Self-uploaded resource statistics
 */
const getTeacherStats = async (user) => {
  const [total, published, pending, rejected, archived, counts] = await Promise.all([
    Resource.count({ where: { uploadedBy: user.id } }),
    Resource.count({ where: { uploadedBy: user.id, status: 'PUBLISHED' } }),
    Resource.count({ where: { uploadedBy: user.id, status: 'PENDING_REVIEW' } }),
    Resource.count({ where: { uploadedBy: user.id, status: 'REJECTED' } }),
    Resource.count({ where: { uploadedBy: user.id, status: 'ARCHIVED' } }),
    Resource.findAll({
      where: { uploadedBy: user.id },
      attributes: ['viewCount', 'downloadCount'],
    }),
  ]);

  const totalViews = counts.reduce((acc, r) => acc + (r.viewCount || 0), 0);
  const totalDownloads = counts.reduce((acc, r) => acc + (r.downloadCount || 0), 0);

  return {
    total,
    published,
    pending,
    rejected,
    archived,
    totalViews,
    totalDownloads,
  };
};

/**
 * Admin: Get all campus resources with moderation info
 */
const getAdminResources = async (adminUser, query = {}) => {
  const { status, departmentId, resourceType, search, page = 1, limit = 20 } = query;
  const where = { collegeId: adminUser.collegeId };

  if (status && status !== 'all') {
    where.status = status;
  }
  if (departmentId && departmentId !== 'all') {
    where.departmentId = departmentId;
  }
  if (resourceType && resourceType !== 'all') {
    where.resourceType = resourceType;
  }

  if (search && search.trim()) {
    where[Op.or] = [
      { title: { [Op.like]: `%${search.trim()}%` } },
      { subject: { [Op.like]: `%${search.trim()}%` } },
      { subjectCode: { [Op.like]: `%${search.trim()}%` } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * pageSize;

  const { rows, count } = await Resource.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: pageSize,
    offset,
    include: [
      {
        model: User,
        as: 'uploader',
        attributes: ['id', 'email', 'role'],
        include: [{ model: TeacherProfile, as: 'teacherProfile', attributes: ['fullName', 'designation'] }],
      },
      { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
    ],
  });

  return {
    resources: rows,
    total: count,
    page: pageNum,
    totalPages: Math.ceil(count / pageSize),
  };
};

/**
 * Admin: Platform-wide resource statistics
 */
const getAdminStats = async (adminUser) => {
  const [total, pending, published, rejected, archived, allResources] = await Promise.all([
    Resource.count({ where: { collegeId: adminUser.collegeId } }),
    Resource.count({ where: { collegeId: adminUser.collegeId, status: 'PENDING_REVIEW' } }),
    Resource.count({ where: { collegeId: adminUser.collegeId, status: 'PUBLISHED' } }),
    Resource.count({ where: { collegeId: adminUser.collegeId, status: 'REJECTED' } }),
    Resource.count({ where: { collegeId: adminUser.collegeId, status: 'ARCHIVED' } }),
    Resource.findAll({
      where: { collegeId: adminUser.collegeId },
      attributes: ['resourceType', 'viewCount', 'downloadCount'],
    }),
  ]);

  const totalViews = allResources.reduce((acc, r) => acc + (r.viewCount || 0), 0);
  const totalDownloads = allResources.reduce((acc, r) => acc + (r.downloadCount || 0), 0);

  const byType = {};
  for (const r of allResources) {
    byType[r.resourceType] = (byType[r.resourceType] || 0) + 1;
  }

  return {
    total,
    pending,
    published,
    rejected,
    archived,
    totalViews,
    totalDownloads,
    byType,
  };
};

module.exports = {
  createResource,
  canUserAccessResource,
  getResources,
  getResourceById,
  updateResource,
  submitForReview,
  publishResource,
  rejectResource,
  archiveResource,
  deleteResource,
  recordView,
  trackDownloadAndGetPath,
  bookmarkResource,
  unbookmarkResource,
  getSavedResources,
  reportResource,
  getTeacherResources,
  getTeacherStats,
  getAdminResources,
  getAdminStats,
  REPORT_REASONS,
};
