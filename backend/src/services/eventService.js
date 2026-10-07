'use strict';

const { Op } = require('sequelize');
const {
  Event,
  EventRegistration,
  EventBookmark,
  User,
  StudentProfile,
  TeacherProfile,
  Department,
  College,
  AuditLog,
  ReputationLog,
  sequelize,
} = require('../models');
const notificationService = require('./notificationService');

// ── Constants & Validations ──────────────────────────────────────────────────

const VALID_CATEGORIES = [
  'hackathon',
  'workshop',
  'technical_fest',
  'seminar',
  'sports',
  'cultural',
  'competition',
  'club',
  'placement',
  'academic',
  'other',
];

const VALID_STATUS_TRANSITIONS = {
  DRAFT: ['PUBLISHED', 'CANCELLED'],
  PUBLISHED: ['ONGOING', 'COMPLETED', 'CANCELLED'],
  ONGOING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

const validateStatusTransition = (currentStatus, targetStatus) => {
  const allowed = VALID_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    const error = new Error(`Invalid status transition from '${currentStatus}' to '${targetStatus}'.`);
    error.statusCode = 400;
    throw error;
  }
};

// ── Service Implementation ──────────────────────────────────────────────────

/**
 * Create a new event (Teacher or Admin)
 */
const createEvent = async (user, data) => {
  // 1. RBAC check: Only teachers and admins can create official events
  if (user.role !== 'teacher' && user.role !== 'admin') {
    const error = new Error('Students are not authorized to create official campus events.');
    error.statusCode = 403;
    throw error;
  }

  const {
    title,
    description,
    category,
    eventType = 'in_person',
    organizerName,
    organizerContact,
    venue,
    locationLabel,
    startDateTime,
    endDateTime,
    registrationStart,
    registrationEnd,
    maxParticipants,
    registrationRequired = true,
    registrationLink,
    bannerImage,
    visibility = 'COLLEGE',
    departmentId,
    semester,
    status = 'DRAFT',
  } = data;

  // 2. Required fields
  if (!title || !title.trim()) {
    const error = new Error('Event title is required.');
    error.statusCode = 400;
    throw error;
  }

  if (!description || !description.trim()) {
    const error = new Error('Event description is required.');
    error.statusCode = 400;
    throw error;
  }

  if (!category || !VALID_CATEGORIES.includes(category)) {
    const error = new Error(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  if (!venue || !venue.trim()) {
    const error = new Error('Event venue is required.');
    error.statusCode = 400;
    throw error;
  }

  if (!organizerName || !organizerName.trim()) {
    const error = new Error('Organizer name is required.');
    error.statusCode = 400;
    throw error;
  }

  if (!startDateTime || !endDateTime) {
    const error = new Error('Start date/time and end date/time are required.');
    error.statusCode = 400;
    throw error;
  }

  const startDate = new Date(startDateTime);
  const endDate = new Date(endDateTime);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    const error = new Error('Invalid start or end date/time format.');
    error.statusCode = 400;
    throw error;
  }

  if (endDate <= startDate) {
    const error = new Error('End date/time must be after start date/time.');
    error.statusCode = 400;
    throw error;
  }

  // Validate registration window if provided
  let regStartDate = null;
  let regEndDate = null;
  if (registrationStart) {
    regStartDate = new Date(registrationStart);
    if (isNaN(regStartDate.getTime())) {
      const error = new Error('Invalid registration start date format.');
      error.statusCode = 400;
      throw error;
    }
  }
  if (registrationEnd) {
    regEndDate = new Date(registrationEnd);
    if (isNaN(regEndDate.getTime())) {
      const error = new Error('Invalid registration end date format.');
      error.statusCode = 400;
      throw error;
    }
    if (regEndDate > startDate) {
      const error = new Error('Registration deadline cannot be after event start date/time.');
      error.statusCode = 400;
      throw error;
    }
    if (regStartDate && regStartDate > regEndDate) {
      const error = new Error('Registration start date must be before registration deadline.');
      error.statusCode = 400;
      throw error;
    }
  }

  if (maxParticipants != null && (parseInt(maxParticipants, 10) <= 0 || isNaN(parseInt(maxParticipants, 10)))) {
    const error = new Error('Max participants must be a positive number.');
    error.statusCode = 400;
    throw error;
  }

  const validVisibilities = ['COLLEGE', 'DEPARTMENT', 'SEMESTER', 'PRIVATE_INVITE'];
  if (!validVisibilities.includes(visibility)) {
    const error = new Error(`Visibility must be one of: ${validVisibilities.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  const initialStatus = status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';

  const event = await Event.create({
    collegeId: user.collegeId,
    createdBy: user.id,
    title: title.trim().slice(0, 255),
    description: description.trim(),
    category,
    eventType,
    organizerName: organizerName.trim().slice(0, 200),
    organizerContact: organizerContact ? organizerContact.trim().slice(0, 200) : null,
    venue: venue.trim().slice(0, 255),
    locationLabel: locationLabel ? locationLabel.trim().slice(0, 255) : null,
    startDateTime: startDate,
    endDateTime: endDate,
    registrationStart: regStartDate,
    registrationEnd: regEndDate,
    maxParticipants: maxParticipants ? parseInt(maxParticipants, 10) : null,
    registrationRequired: !!registrationRequired,
    registrationLink: registrationLink ? registrationLink.trim().slice(0, 500) : null,
    bannerImage: bannerImage ? bannerImage.trim().slice(0, 500) : null,
    status: initialStatus,
    visibility,
    departmentId: departmentId || null,
    semester: semester ? parseInt(semester, 10) : null,
    registrationCount: 0,
  });

  // Audit log
  try {
    await AuditLog.create({
      actorId: user.id,
      action: 'EVENT_CREATED',
      resource: 'Event',
      resourceId: event.id,
      details: { title: event.title, status: event.status, category: event.category },
    });
  } catch (logErr) {
    console.error('AuditLog error:', logErr.message);
  }

  return event;
};

/**
 * Edit an event (Creator Teacher or Admin)
 */
const updateEvent = async (user, eventId, data) => {
  const event = await Event.findByPk(eventId);
  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  // IDOR check: Teacher can only edit their own event. Admin can edit any event in their college.
  if (user.role === 'teacher' && event.createdBy !== user.id) {
    const error = new Error('You are not authorized to modify another teacher\'s event.');
    error.statusCode = 403;
    throw error;
  }
  if (user.role === 'admin' && event.collegeId !== user.collegeId) {
    const error = new Error('Cross-college event modification is blocked.');
    error.statusCode = 403;
    throw error;
  }

  if (['COMPLETED', 'CANCELLED'].includes(event.status)) {
    const error = new Error(`Cannot modify an event that is already ${event.status}.`);
    error.statusCode = 400;
    throw error;
  }

  const updates = {};
  if (data.title !== undefined) updates.title = data.title.trim().slice(0, 255);
  if (data.description !== undefined) updates.description = data.description.trim();
  if (data.category !== undefined) {
    if (!VALID_CATEGORIES.includes(data.category)) {
      const error = new Error(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }
    updates.category = data.category;
  }
  if (data.eventType !== undefined) updates.eventType = data.eventType;
  if (data.organizerName !== undefined) updates.organizerName = data.organizerName.trim().slice(0, 200);
  if (data.organizerContact !== undefined) updates.organizerContact = data.organizerContact ? data.organizerContact.trim().slice(0, 200) : null;
  if (data.venue !== undefined) updates.venue = data.venue.trim().slice(0, 255);
  if (data.locationLabel !== undefined) updates.locationLabel = data.locationLabel ? data.locationLabel.trim().slice(0, 255) : null;

  if (data.startDateTime || data.endDateTime) {
    const startDate = data.startDateTime ? new Date(data.startDateTime) : new Date(event.startDateTime);
    const endDate = data.endDateTime ? new Date(data.endDateTime) : new Date(event.endDateTime);
    if (endDate <= startDate) {
      const error = new Error('End date/time must be after start date/time.');
      error.statusCode = 400;
      throw error;
    }
    updates.startDateTime = startDate;
    updates.endDateTime = endDate;
  }

  if (data.registrationStart !== undefined) {
    updates.registrationStart = data.registrationStart ? new Date(data.registrationStart) : null;
  }
  if (data.registrationEnd !== undefined) {
    if (data.registrationEnd) {
      const regEnd = new Date(data.registrationEnd);
      const compareStart = updates.startDateTime || new Date(event.startDateTime);
      if (regEnd > compareStart) {
        const error = new Error('Registration deadline cannot be after event start date/time.');
        error.statusCode = 400;
        throw error;
      }
      updates.registrationEnd = regEnd;
    } else {
      updates.registrationEnd = null;
    }
  }

  if (data.maxParticipants !== undefined) {
    updates.maxParticipants = data.maxParticipants ? parseInt(data.maxParticipants, 10) : null;
  }
  if (data.registrationRequired !== undefined) updates.registrationRequired = !!data.registrationRequired;
  if (data.registrationLink !== undefined) updates.registrationLink = data.registrationLink ? data.registrationLink.trim().slice(0, 500) : null;
  if (data.bannerImage !== undefined) updates.bannerImage = data.bannerImage ? data.bannerImage.trim().slice(0, 500) : null;
  if (data.visibility !== undefined) updates.visibility = data.visibility;
  if (data.departmentId !== undefined) updates.departmentId = data.departmentId || null;
  if (data.semester !== undefined) updates.semester = data.semester ? parseInt(data.semester, 10) : null;

  await event.update(updates);

  // If time or venue changed on a published event, notify participants
  if ((updates.startDateTime || updates.venue) && event.status === 'PUBLISHED') {
    const registrations = await EventRegistration.findAll({
      where: { eventId: event.id, status: 'REGISTERED' },
      attributes: ['studentId'],
    });

    for (const reg of registrations) {
      await notificationService.createNotification({
        userId: reg.studentId,
        type: 'EVENT_UPDATE',
        title: `Event Updated: ${event.title}`,
        message: `Schedule or venue details have changed for "${event.title}". Please check the updated details.`,
        data: { eventId: event.id },
      });
    }
  }

  return event;
};

/**
 * Publish an event
 */
const publishEvent = async (user, eventId) => {
  const event = await Event.findByPk(eventId);
  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  // IDOR check
  if (user.role === 'teacher' && event.createdBy !== user.id) {
    const error = new Error('You are not authorized to publish another teacher\'s event.');
    error.statusCode = 403;
    throw error;
  }

  validateStatusTransition(event.status, 'PUBLISHED');

  await event.update({ status: 'PUBLISHED' });

  // Audit log if admin
  if (user.role === 'admin') {
    await AuditLog.create({
      actorId: user.id,
      action: 'EVENT_PUBLISHED',
      resource: 'Event',
      resourceId: event.id,
      details: { title: event.title },
    });
  }

  return event;
};

/**
 * Cancel an event
 */
const cancelEvent = async (user, eventId, reason) => {
  const event = await Event.findByPk(eventId);
  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  // IDOR check
  if (user.role === 'teacher' && event.createdBy !== user.id) {
    const error = new Error('You are not authorized to cancel another teacher\'s event.');
    error.statusCode = 403;
    throw error;
  }

  validateStatusTransition(event.status, 'CANCELLED');

  const cancellationReason = reason ? reason.trim().slice(0, 255) : 'Cancelled by organizer';
  await event.update({
    status: 'CANCELLED',
    cancellationReason,
  });

  // Notify registered participants
  const registrations = await EventRegistration.findAll({
    where: { eventId: event.id, status: { [Op.in]: ['REGISTERED', 'WAITLISTED'] } },
    attributes: ['studentId'],
  });

  for (const reg of registrations) {
    await notificationService.createNotification({
      userId: reg.studentId,
      type: 'EVENT_CANCELLATION',
      title: `Event Cancelled: ${event.title}`,
      message: `The event "${event.title}" has been cancelled. Reason: ${cancellationReason}`,
      data: { eventId: event.id, reason: cancellationReason },
    });
  }

  // Audit log
  try {
    await AuditLog.create({
      actorId: user.id,
      action: 'EVENT_CANCELLED',
      resource: 'Event',
      resourceId: event.id,
      details: { title: event.title, reason: cancellationReason },
    });
  } catch (logErr) {
    console.error('AuditLog error:', logErr.message);
  }

  return event;
};

/**
 * Delete an event (Admin or Creator Draft)
 */
const deleteEvent = async (user, eventId) => {
  const event = await Event.findByPk(eventId);
  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  if (user.role === 'teacher') {
    if (event.createdBy !== user.id) {
      const error = new Error('You cannot delete another teacher\'s event.');
      error.statusCode = 403;
      throw error;
    }
    if (event.status !== 'DRAFT') {
      const error = new Error('Teachers can only delete draft events. Cancel the event instead.');
      error.statusCode = 400;
      throw error;
    }
  }

  await event.destroy();

  if (user.role === 'admin') {
    await AuditLog.create({
      actorId: user.id,
      action: 'EVENT_DELETED',
      resource: 'Event',
      resourceId: eventId,
      details: { title: event.title },
    });
  }

  return true;
};

/**
 * Register student for an event
 */
const registerForEvent = async (user, eventId, notes) => {
  // 1. RBAC check
  if (user.role !== 'student') {
    const error = new Error('Only students can register for events.');
    error.statusCode = 403;
    throw error;
  }

  const event = await Event.findByPk(eventId);
  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  // 2. College isolation
  if (event.collegeId !== user.collegeId) {
    const error = new Error('Cross-college event registration is blocked.');
    error.statusCode = 403;
    throw error;
  }

  // 3. Status checks
  if (event.status === 'CANCELLED') {
    const error = new Error('Cannot register for a cancelled event.');
    error.statusCode = 400;
    throw error;
  }

  if (event.status === 'COMPLETED') {
    const error = new Error('Cannot register for a completed event.');
    error.statusCode = 400;
    throw error;
  }

  if (event.status !== 'PUBLISHED' && event.status !== 'ONGOING') {
    const error = new Error('Event is not open for registration.');
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();

  // 4. Registration window check
  if (event.registrationStart && now < new Date(event.registrationStart)) {
    const error = new Error('Registration for this event has not started yet.');
    error.statusCode = 400;
    throw error;
  }

  if (event.registrationEnd && now > new Date(event.registrationEnd)) {
    const error = new Error('Registration deadline for this event has passed.');
    error.statusCode = 400;
    throw error;
  }

  if (!event.registrationEnd && now > new Date(event.startDateTime)) {
    const error = new Error('Registration is closed because the event has already started.');
    error.statusCode = 400;
    throw error;
  }

  // 5. Visibility / Eligibility targeting check
  const studentProfile = await StudentProfile.findOne({ where: { userId: user.id } });
  if (event.visibility === 'DEPARTMENT' && event.departmentId) {
    if (studentProfile?.departmentId && studentProfile.departmentId !== event.departmentId) {
      const error = new Error('This event is restricted to students of a specific department.');
      error.statusCode = 403;
      throw error;
    }
  }

  if (event.visibility === 'SEMESTER' && event.semester) {
    if (studentProfile?.semester && studentProfile.semester !== event.semester) {
      const error = new Error(`This event is restricted to semester ${event.semester} students.`);
      error.statusCode = 403;
      throw error;
    }
  }

  // 6. Check existing registration
  let existingRegistration = await EventRegistration.findOne({
    where: { eventId: event.id, studentId: user.id },
  });

  if (existingRegistration) {
    if (['REGISTERED', 'WAITLISTED', 'ATTENDED'].includes(existingRegistration.status)) {
      const error = new Error('You are already registered or waitlisted for this event.');
      error.statusCode = 409;
      throw error;
    }
  }

  // 7. Capacity check & Waitlist management
  const activeCount = await EventRegistration.count({
    where: { eventId: event.id, status: 'REGISTERED' },
  });

  let registrationStatus = 'REGISTERED';
  if (event.maxParticipants != null && activeCount >= event.maxParticipants) {
    registrationStatus = 'WAITLISTED';
  }

  if (existingRegistration) {
    // Re-activate previously cancelled registration
    await existingRegistration.update({
      status: registrationStatus,
      registeredAt: new Date(),
      cancelledAt: null,
      notes: notes ? notes.trim().slice(0, 255) : null,
    });
  } else {
    existingRegistration = await EventRegistration.create({
      eventId: event.id,
      studentId: user.id,
      status: registrationStatus,
      notes: notes ? notes.trim().slice(0, 255) : null,
    });
  }

  // Update registration count on event
  const newActiveCount = await EventRegistration.count({
    where: { eventId: event.id, status: 'REGISTERED' },
  });
  await event.update({ registrationCount: newActiveCount });

  // In-app notification
  const notifTitle = registrationStatus === 'WAITLISTED'
    ? `Waitlisted: ${event.title}`
    : `Registration Confirmed: ${event.title}`;
  const notifMsg = registrationStatus === 'WAITLISTED'
    ? `You have been placed on the waitlist for "${event.title}". You will be notified automatically if a seat opens up.`
    : `You have successfully registered for "${event.title}" on ${new Date(event.startDateTime).toLocaleDateString()} at ${event.venue}.`;

  await notificationService.createNotification({
    userId: user.id,
    type: registrationStatus === 'WAITLISTED' ? 'EVENT_WAITLISTED' : 'EVENT_REGISTRATION',
    title: notifTitle,
    message: notifMsg,
    data: { eventId: event.id, status: registrationStatus },
  });

  return {
    registration: existingRegistration,
    status: registrationStatus,
    isWaitlisted: registrationStatus === 'WAITLISTED',
  };
};

/**
 * Cancel student registration
 */
const cancelRegistration = async (user, eventId) => {
  const registration = await EventRegistration.findOne({
    where: { eventId, studentId: user.id },
    include: [{ model: Event, as: 'event' }],
  });

  if (!registration || registration.status === 'CANCELLED') {
    const error = new Error('Active registration not found.');
    error.statusCode = 404;
    throw error;
  }

  const event = registration.event;
  if (!event) {
    const error = new Error('Associated event not found.');
    error.statusCode = 404;
    throw error;
  }

  if (event.status === 'COMPLETED') {
    const error = new Error('Cannot cancel registration for a completed event.');
    error.statusCode = 400;
    throw error;
  }

  const wasRegistered = registration.status === 'REGISTERED';

  await registration.update({
    status: 'CANCELLED',
    cancelledAt: new Date(),
  });

  // If a registered slot freed up, promote the oldest waitlisted student!
  if (wasRegistered && event.maxParticipants != null) {
    const nextWaitlisted = await EventRegistration.findOne({
      where: { eventId: event.id, status: 'WAITLISTED' },
      order: [['registeredAt', 'ASC']],
    });

    if (nextWaitlisted) {
      await nextWaitlisted.update({
        status: 'REGISTERED',
      });

      await notificationService.createNotification({
        userId: nextWaitlisted.studentId,
        type: 'WAITLIST_PROMOTED',
        title: `Seat Confirmed: ${event.title}`,
        message: `Good news! A seat opened up and you have been promoted from the waitlist to registered for "${event.title}".`,
        data: { eventId: event.id },
      });
    }
  }

  // Update registration count
  const newActiveCount = await EventRegistration.count({
    where: { eventId: event.id, status: 'REGISTERED' },
  });
  await event.update({ registrationCount: newActiveCount });

  // Notification
  await notificationService.createNotification({
    userId: user.id,
    type: 'REGISTRATION_CANCELLED',
    title: `Registration Cancelled: ${event.title}`,
    message: `Your registration for "${event.title}" has been cancelled.`,
    data: { eventId: event.id },
  });

  return registration;
};

/**
 * Discover & List Events with Database-level filtering, search, and pagination
 */
const getEvents = async (user, query = {}) => {
  const {
    category,
    timeframe = 'upcoming',
    status,
    search,
    departmentId,
    semester,
    sort = 'soonest',
    page = 1,
    limit = 12,
  } = query;

  const where = {
    collegeId: user.collegeId,
  };

  // Status handling based on role
  if (user.role === 'student') {
    where.status = { [Op.in]: ['PUBLISHED', 'ONGOING'] };
  } else if (status && status !== 'all') {
    where.status = status;
  }

  if (category && category !== 'all' && VALID_CATEGORIES.includes(category)) {
    where.category = category;
  }

  if (departmentId && departmentId !== 'all') {
    where.departmentId = departmentId;
  }

  if (semester && semester !== 'all') {
    where.semester = parseInt(semester, 10);
  }

  // Timeframe filter
  const now = new Date();
  if (timeframe === 'upcoming') {
    where.endDateTime = { [Op.gte]: now };
  } else if (timeframe === 'today') {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    where.startDateTime = { [Op.between]: [startOfToday, endOfToday] };
  } else if (timeframe === 'this_week') {
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(now);
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);
    where.startDateTime = { [Op.between]: [startOfWeek, endOfWeek] };
  } else if (timeframe === 'past') {
    where.endDateTime = { [Op.lt]: now };
  }

  // Search filter
  if (search && search.trim()) {
    const q = `%${search.trim()}%`;
    where[Op.or] = [
      { title: { [Op.like]: q } },
      { description: { [Op.like]: q } },
      { venue: { [Op.like]: q } },
      { organizerName: { [Op.like]: q } },
    ];
  }

  // Sorting
  let order = [['startDateTime', 'ASC']];
  if (sort === 'newest') {
    order = [['createdAt', 'DESC']];
  } else if (sort === 'popular') {
    order = [['registrationCount', 'DESC']];
  } else if (sort === 'soonest') {
    order = [['startDateTime', 'ASC']];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
  const offset = (pageNum - 1) * pageSize;

  const { rows, count } = await Event.findAndCountAll({
    where,
    order,
    limit: pageSize,
    offset,
    include: [
      {
        model: Department,
        as: 'targetDepartment',
        attributes: ['id', 'name', 'code'],
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'email', 'role'],
        include: [{ model: TeacherProfile, as: 'teacherProfile', attributes: ['fullName', 'designation'] }],
      },
    ],
  });

  // Batch query student registrations and bookmarks for decoration
  const eventIds = rows.map((e) => e.id);
  const [userRegistrations, userBookmarks] = await Promise.all([
    user.role === 'student' && eventIds.length > 0
      ? EventRegistration.findAll({
          where: { eventId: { [Op.in]: eventIds }, studentId: user.id },
          attributes: ['eventId', 'status', 'attendanceStatus'],
        })
      : [],
    eventIds.length > 0
      ? EventBookmark.findAll({
          where: { eventId: { [Op.in]: eventIds }, userId: user.id },
          attributes: ['eventId'],
        })
      : [],
  ]);

  const regMap = new Map();
  userRegistrations.forEach((r) => regMap.set(r.eventId, r));
  const bookmarkSet = new Set(userBookmarks.map((b) => b.eventId));

  const decorated = rows.map((e) => {
    const reg = regMap.get(e.id);
    const isBookmarked = bookmarkSet.has(e.id);
    const availableSeats = e.maxParticipants ? Math.max(0, e.maxParticipants - e.registrationCount) : null;
    const isFull = e.maxParticipants != null && e.registrationCount >= e.maxParticipants;

    return {
      ...e.toJSON(),
      isRegistered: reg ? ['REGISTERED', 'WAITLISTED', 'ATTENDED'].includes(reg.status) : false,
      registrationStatus: reg ? reg.status : null,
      attendanceStatus: reg ? reg.attendanceStatus : null,
      isBookmarked,
      availableSeats,
      isFull,
    };
  });

  return {
    events: decorated,
    total: count,
    page: pageNum,
    totalPages: Math.ceil(count / pageSize),
  };
};

/**
 * Get single event details with organizer & eligibility info
 */
const getEventById = async (user, eventId) => {
  const event = await Event.findByPk(eventId, {
    include: [
      {
        model: Department,
        as: 'targetDepartment',
        attributes: ['id', 'name', 'code'],
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'email', 'role'],
        include: [{ model: TeacherProfile, as: 'teacherProfile', attributes: ['fullName', 'designation', 'cabinLocation'] }],
      },
    ],
  });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  // Cross-college check
  if (event.collegeId !== user.collegeId) {
    const error = new Error('Cross-college event access is blocked.');
    error.statusCode = 403;
    throw error;
  }

  // For students, check visibility
  if (user.role === 'student' && event.status === 'DRAFT') {
    const error = new Error('Event is not published.');
    error.statusCode = 403;
    throw error;
  }

  const [registration, bookmark] = await Promise.all([
    EventRegistration.findOne({ where: { eventId: event.id, studentId: user.id } }),
    EventBookmark.findOne({ where: { eventId: event.id, userId: user.id } }),
  ]);

  const availableSeats = event.maxParticipants ? Math.max(0, event.maxParticipants - event.registrationCount) : null;
  const isFull = event.maxParticipants != null && event.registrationCount >= event.maxParticipants;

  return {
    ...event.toJSON(),
    isRegistered: registration ? ['REGISTERED', 'WAITLISTED', 'ATTENDED'].includes(registration.status) : false,
    registrationStatus: registration ? registration.status : null,
    attendanceStatus: registration ? registration.attendanceStatus : null,
    isBookmarked: !!bookmark,
    availableSeats,
    isFull,
  };
};

/**
 * Bookmark an event
 */
const bookmarkEvent = async (user, eventId) => {
  const event = await Event.findByPk(eventId);
  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  const [bookmark, created] = await EventBookmark.findOrCreate({
    where: { eventId: event.id, userId: user.id },
  });

  if (!created) {
    const error = new Error('Event is already bookmarked.');
    error.statusCode = 409;
    throw error;
  }

  return bookmark;
};

/**
 * Remove bookmark from an event
 */
const unbookmarkEvent = async (user, eventId) => {
  const bookmark = await EventBookmark.findOne({
    where: { eventId, userId: user.id },
  });

  if (!bookmark) {
    const error = new Error('Bookmark not found.');
    error.statusCode = 404;
    throw error;
  }

  await bookmark.destroy();
  return true;
};

/**
 * Get student's bookmarked events
 */
const getBookmarkedEvents = async (user, { page = 1, limit = 12 } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
  const offset = (pageNum - 1) * pageSize;

  const { rows, count } = await EventBookmark.findAndCountAll({
    where: { userId: user.id },
    order: [['createdAt', 'DESC']],
    limit: pageSize,
    offset,
    include: [
      {
        model: Event,
        as: 'event',
        include: [{ model: Department, as: 'targetDepartment' }],
      },
    ],
  });

  return {
    bookmarks: rows.map((b) => b.event),
    total: count,
    page: pageNum,
    totalPages: Math.ceil(count / pageSize),
  };
};

/**
 * Get student's registrations
 */
const getStudentRegistrations = async (user, { status, page = 1, limit = 12 } = {}) => {
  const where = { studentId: user.id };
  if (status && status !== 'all') {
    where.status = status;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
  const offset = (pageNum - 1) * pageSize;

  const { rows, count } = await EventRegistration.findAndCountAll({
    where,
    order: [['registeredAt', 'DESC']],
    limit: pageSize,
    offset,
    include: [
      {
        model: Event,
        as: 'event',
        include: [{ model: Department, as: 'targetDepartment' }],
      },
    ],
  });

  return {
    registrations: rows,
    total: count,
    page: pageNum,
    totalPages: Math.ceil(count / pageSize),
  };
};

/**
 * Organizer / Admin View Participants with attendance status
 */
const getEventParticipants = async (user, eventId, { search, status, attendanceStatus, page = 1, limit = 20 } = {}) => {
  const event = await Event.findByPk(eventId);
  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  // IDOR check: Organizer teacher or Admin only
  if (user.role === 'teacher' && event.createdBy !== user.id) {
    const error = new Error('You are not authorized to view participants for this event.');
    error.statusCode = 403;
    throw error;
  }
  if (user.role === 'admin' && event.collegeId !== user.collegeId) {
    const error = new Error('Cross-college access blocked.');
    error.statusCode = 403;
    throw error;
  }

  const where = { eventId: event.id };
  if (status && status !== 'all') where.status = status;
  if (attendanceStatus && attendanceStatus !== 'all') where.attendanceStatus = attendanceStatus;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * pageSize;

  const { rows, count } = await EventRegistration.findAndCountAll({
    where,
    order: [['registeredAt', 'ASC']],
    limit: pageSize,
    offset,
    include: [
      {
        model: User,
        as: 'student',
        attributes: ['id', 'email'],
        include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName', 'usn', 'department', 'semester'] }],
      },
    ],
  });

  return {
    participants: rows,
    total: count,
    page: pageNum,
    totalPages: Math.ceil(count / pageSize),
  };
};

/**
 * Mark Attendance for a participant (ATTENDED / NO_SHOW)
 */
const markAttendance = async (user, eventId, studentId, { attendanceStatus, notes }) => {
  // 1. RBAC check
  if (user.role !== 'teacher' && user.role !== 'admin') {
    const error = new Error('Only event organizers and administrators can mark attendance.');
    error.statusCode = 403;
    throw error;
  }

  const event = await Event.findByPk(eventId);
  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  // 2. IDOR check
  if (user.role === 'teacher' && event.createdBy !== user.id) {
    const error = new Error('You cannot modify attendance for another teacher\'s event.');
    error.statusCode = 403;
    throw error;
  }

  const validAttendance = ['PENDING', 'ATTENDED', 'NO_SHOW'];
  if (!validAttendance.includes(attendanceStatus)) {
    const error = new Error(`Attendance status must be one of: ${validAttendance.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  const registration = await EventRegistration.findOne({
    where: { eventId: event.id, studentId },
  });

  if (!registration) {
    const error = new Error('Registration record not found for this student.');
    error.statusCode = 404;
    throw error;
  }

  const wasAttendedBefore = registration.attendanceStatus === 'ATTENDED';

  await registration.update({
    attendanceStatus,
    attendedAt: attendanceStatus === 'ATTENDED' ? new Date() : null,
    notes: notes !== undefined ? notes : registration.notes,
  });

  // Award reputation points (+10) for genuine event participation if first time attended
  if (attendanceStatus === 'ATTENDED' && !wasAttendedBefore) {
    try {
      await ReputationLog.create({
        userId: studentId,
        points: 10,
        actionType: 'event_attendance',
        reason: `Attended campus event: "${event.title.slice(0, 50)}"`,
        sourceId: event.id,
        actorId: user.id,
      });

      await StudentProfile.increment('reputationScore', { by: 10, where: { userId: studentId } });
    } catch (repErr) {
      console.error('Reputation award error on event attendance:', repErr.message);
    }
  }

  return registration;
};

/**
 * Organizer Event Statistics
 */
const getOrganizerEventStats = async (user, eventId) => {
  const event = await Event.findByPk(eventId);
  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  if (user.role === 'teacher' && event.createdBy !== user.id) {
    const error = new Error('Unauthorized.');
    error.statusCode = 403;
    throw error;
  }

  const [totalReg, activeReg, waitlisted, attended, noShow, cancelled] = await Promise.all([
    EventRegistration.count({ where: { eventId: event.id } }),
    EventRegistration.count({ where: { eventId: event.id, status: 'REGISTERED' } }),
    EventRegistration.count({ where: { eventId: event.id, status: 'WAITLISTED' } }),
    EventRegistration.count({ where: { eventId: event.id, attendanceStatus: 'ATTENDED' } }),
    EventRegistration.count({ where: { eventId: event.id, attendanceStatus: 'NO_SHOW' } }),
    EventRegistration.count({ where: { eventId: event.id, status: 'CANCELLED' } }),
  ]);

  const capacityUtilization = event.maxParticipants
    ? Math.round((activeReg / event.maxParticipants) * 100)
    : 100;

  return {
    totalRegistrations: totalReg,
    activeRegistrations: activeReg,
    waitlistedCount: waitlisted,
    attendedCount: attended,
    noShowCount: noShow,
    cancelledCount: cancelled,
    capacityUtilization,
    maxParticipants: event.maxParticipants,
  };
};

/**
 * Admin Campus-wide Event Statistics
 */
const getAdminEventStats = async (user) => {
  const collegeId = user.collegeId;

  const [totalEvents, published, drafts, completed, cancelled, totalReg, attendedCount] = await Promise.all([
    Event.count({ where: { collegeId } }),
    Event.count({ where: { collegeId, status: 'PUBLISHED' } }),
    Event.count({ where: { collegeId, status: 'DRAFT' } }),
    Event.count({ where: { collegeId, status: 'COMPLETED' } }),
    Event.count({ where: { collegeId, status: 'CANCELLED' } }),
    EventRegistration.count({
      include: [{ model: Event, as: 'event', where: { collegeId } }],
    }),
    EventRegistration.count({
      where: { attendanceStatus: 'ATTENDED' },
      include: [{ model: Event, as: 'event', where: { collegeId } }],
    }),
  ]);

  const categoryCounts = await Event.findAll({
    where: { collegeId },
    attributes: ['category', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
    group: ['category'],
    raw: true,
  });

  const attendanceRate = totalReg > 0 ? Math.round((attendedCount / totalReg) * 100) : 0;

  return {
    totalEvents,
    publishedEvents: published,
    draftEvents: drafts,
    completedEvents: completed,
    cancelledEvents: cancelled,
    totalRegistrations: totalReg,
    totalAttended: attendedCount,
    attendanceRate,
    categoryBreakdown: categoryCounts,
  };
};

module.exports = {
  createEvent,
  updateEvent,
  publishEvent,
  cancelEvent,
  deleteEvent,
  registerForEvent,
  cancelRegistration,
  getEvents,
  getEventById,
  bookmarkEvent,
  unbookmarkEvent,
  getBookmarkedEvents,
  getStudentRegistrations,
  getEventParticipants,
  markAttendance,
  getOrganizerEventStats,
  getAdminEventStats,
  validateStatusTransition,
};
