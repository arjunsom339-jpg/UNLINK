'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.DB_DIALECT = 'sqlite';
process.env.DB_STORAGE = ':memory:';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-32-chars-minimum-1234';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32-chars-minimum-1234';

const app = require('../app');
const {
  sequelize,
  User,
  StudentProfile,
  TeacherProfile,
  College,
  Department,
  Event,
  EventRegistration,
  EventBookmark,
  Notification,
  AuditLog,
  ReputationLog,
} = require('../src/models');
const { generateAccessToken } = require('../src/utils/jwt');
const collegeService = require('../src/services/collegeService');
const eventService = require('../src/services/eventService');

test('EVENTS & CAMPUS ACTIVITIES MODULE TEST SUITE', async (t) => {
  let college1, college2;
  let deptCSE, deptECE;
  let teacherUser1, teacherToken1;
  let teacherUser2, teacherToken2;
  let studentUser1, studentProfile1, studentToken1;
  let studentUser2, studentProfile2, studentToken2;
  let studentUser3, studentProfile3, studentToken3;
  let foreignStudent, foreignToken;
  let adminUser, adminToken;

  await sequelize.sync({ force: true });
  college1 = await collegeService.getDefaultCollege();

  // Second college for cross-college isolation tests
  college2 = await College.create({
    name: 'BMS College of Engineering',
    code: 'BMSCE',
    domain: 'bmsce.ac.in',
  });

  // Departments in College 1
  deptCSE = await Department.create({
    collegeId: college1.id,
    name: 'Computer Science & Engineering',
    code: 'CSE',
  });
  deptECE = await Department.create({
    collegeId: college1.id,
    name: 'Electronics & Communication Engineering',
    code: 'ECE',
  });

  // Teacher 1 (CSE Faculty)
  teacherUser1 = await User.create({
    email: 'teacher1@nie.ac.in',
    role: 'teacher',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: college1.id,
  });
  await TeacherProfile.create({
    userId: teacherUser1.id,
    collegeId: college1.id,
    teacherId: 'TCH-CSE-001',
    fullName: 'Dr. Alan Turing',
    college: college1.name,
    department: 'Computer Science',
    departmentId: deptCSE.id,
  });
  teacherToken1 = generateAccessToken({ id: teacherUser1.id, role: 'teacher', collegeId: college1.id });

  // Teacher 2 (ECE Faculty)
  teacherUser2 = await User.create({
    email: 'teacher2@nie.ac.in',
    role: 'teacher',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: college1.id,
  });
  await TeacherProfile.create({
    userId: teacherUser2.id,
    collegeId: college1.id,
    teacherId: 'TCH-ECE-002',
    fullName: 'Dr. Claude Shannon',
    college: college1.name,
    department: 'Electronics',
    departmentId: deptECE.id,
  });
  teacherToken2 = generateAccessToken({ id: teacherUser2.id, role: 'teacher', collegeId: college1.id });

  // Student 1 (CSE, Semester 6)
  studentUser1 = await User.create({
    email: 'student1@nie.ac.in',
    role: 'student',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: college1.id,
  });
  studentProfile1 = await StudentProfile.create({
    userId: studentUser1.id,
    collegeId: college1.id,
    usn: '1NIE21CS001',
    fullName: 'Alice Walker',
    college: college1.name,
    department: 'Computer Science & Engineering',
    departmentId: deptCSE.id,
    semester: 6,
  });
  studentToken1 = generateAccessToken({ id: studentUser1.id, role: 'student', collegeId: college1.id });

  // Student 2 (CSE, Semester 6)
  studentUser2 = await User.create({
    email: 'student2@nie.ac.in',
    role: 'student',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: college1.id,
  });
  studentProfile2 = await StudentProfile.create({
    userId: studentUser2.id,
    collegeId: college1.id,
    usn: '1NIE21CS002',
    fullName: 'Bob Ross',
    college: college1.name,
    department: 'Computer Science & Engineering',
    departmentId: deptCSE.id,
    semester: 6,
  });
  studentToken2 = generateAccessToken({ id: studentUser2.id, role: 'student', collegeId: college1.id });

  // Student 3 (ECE, Semester 4)
  studentUser3 = await User.create({
    email: 'student3@nie.ac.in',
    role: 'student',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: college1.id,
  });
  studentProfile3 = await StudentProfile.create({
    userId: studentUser3.id,
    collegeId: college1.id,
    usn: '1NIE21EC003',
    fullName: 'Charlie Brown',
    college: college1.name,
    department: 'Electronics & Communication Engineering',
    departmentId: deptECE.id,
    semester: 4,
  });
  studentToken3 = generateAccessToken({ id: studentUser3.id, role: 'student', collegeId: college1.id });

  // Foreign Student (College 2)
  foreignStudent = await User.create({
    email: 'foreign@bmsce.ac.in',
    role: 'student',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: college2.id,
  });
  foreignToken = generateAccessToken({ id: foreignStudent.id, role: 'student', collegeId: college2.id });

  // Admin User (College 1)
  adminUser = await User.create({
    email: 'admin.events@nie.ac.in',
    role: 'admin',
    adminRole: 'SUPER_ADMIN',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: college1.id,
  });
  adminToken = generateAccessToken({ id: adminUser.id, role: 'admin', collegeId: college1.id });

  let testEventId;

  // ───────────────────────────────────────────────────────────────────────────
  // 1. EVENT CREATION & AUTHORIZATION
  // ───────────────────────────────────────────────────────────────────────────

  await t.test('1. Student cannot create official event (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${studentToken1}`)
      .send({
        title: 'Unauthorized Student Fest',
        description: 'Trying to create an event',
        category: 'hackathon',
        venue: 'Campus Lawn',
        organizerName: 'Student Guild',
        startDateTime: new Date(Date.now() + 86400000).toISOString(),
        endDateTime: new Date(Date.now() + 172800000).toISOString(),
      });

    assert.equal(res.status, 403);
    assert.match(res.body.message, /Students are not authorized to create official/);
  });

  await t.test('2. Teacher can create event draft with validation', async () => {
    const tomorrow = new Date(Date.now() + 86400000);
    const dayAfter = new Date(Date.now() + 172800000);

    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${teacherToken1}`)
      .send({
        title: 'NIE TechHacks 2026',
        description: 'Annual 24-hour hackathon for cutting-edge engineering solutions.',
        category: 'hackathon',
        eventType: 'in_person',
        organizerName: 'CSE Department Association',
        organizerContact: 'csehacks@nie.ac.in',
        venue: 'Sir M.V. Auditorium & CS Labs',
        locationLabel: 'Main Campus, Diamond Jubilee Block',
        startDateTime: tomorrow.toISOString(),
        endDateTime: dayAfter.toISOString(),
        registrationStart: new Date(Date.now() - 3600000).toISOString(),
        registrationEnd: tomorrow.toISOString(),
        maxParticipants: 2, // Low cap for testing capacity & waitlist
        registrationRequired: true,
        visibility: 'COLLEGE',
        status: 'DRAFT',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.title, 'NIE TechHacks 2026');
    assert.equal(res.body.data.status, 'DRAFT');
    assert.equal(res.body.data.collegeId, college1.id);
    testEventId = res.body.data.id;
  });

  await t.test('3. Event validation rejects endDateTime before startDateTime', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${teacherToken1}`)
      .send({
        title: 'Invalid Dates Event',
        description: 'End date before start date',
        category: 'workshop',
        venue: 'Lab 2',
        organizerName: 'Robotics Club',
        startDateTime: new Date(Date.now() + 172800000).toISOString(),
        endDateTime: new Date(Date.now() + 86400000).toISOString(), // earlier than start!
      });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /End date\/time must be after start date\/time/);
  });

  await t.test('4. Event validation rejects invalid category', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${teacherToken1}`)
      .send({
        title: 'Invalid Category Event',
        description: 'Testing category validation',
        category: 'non_existent_category',
        venue: 'Lab 2',
        organizerName: 'Robotics Club',
        startDateTime: new Date(Date.now() + 86400000).toISOString(),
        endDateTime: new Date(Date.now() + 172800000).toISOString(),
      });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /Category must be one of/);
  });

  await t.test('5. Teacher cannot modify another teacher\'s event (IDOR prevention - 403 Forbidden)', async () => {
    const res = await request(app)
      .patch(`/api/events/${testEventId}`)
      .set('Authorization', `Bearer ${teacherToken2}`)
      .send({ title: 'Hacked by Teacher 2' });

    assert.equal(res.status, 403);
    assert.match(res.body.message, /not authorized to modify another teacher's event/);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. EVENT LIFECYCLE & STATE MACHINE
  // ───────────────────────────────────────────────────────────────────────────

  await t.test('6. Student cannot view unapproved DRAFT event (403 Forbidden)', async () => {
    const res = await request(app)
      .get(`/api/events/${testEventId}`)
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(res.status, 403);
    assert.match(res.body.message, /Event is not published/);
  });

  await t.test('7. Teacher publishes event (DRAFT -> PUBLISHED)', async () => {
    const res = await request(app)
      .post(`/api/events/${testEventId}/publish`)
      .set('Authorization', `Bearer ${teacherToken1}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'PUBLISHED');
  });

  await t.test('8. Student can now discover and view published event', async () => {
    const res = await request(app)
      .get(`/api/events/${testEventId}`)
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.title, 'NIE TechHacks 2026');
    assert.equal(res.body.data.status, 'PUBLISHED');
    assert.equal(res.body.data.isRegistered, false);
    assert.equal(res.body.data.availableSeats, 2);
  });

  await t.test('9. Invalid status transition is rejected by state machine', async () => {
    assert.throws(() => {
      eventService.validateStatusTransition('COMPLETED', 'PUBLISHED');
    }, /Invalid status transition/);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. CROSS-COLLEGE ISOLATION
  // ───────────────────────────────────────────────────────────────────────────

  await t.test('10. Cross-college access is blocked (Foreign student receives 403)', async () => {
    const res = await request(app)
      .get(`/api/events/${testEventId}`)
      .set('Authorization', `Bearer ${foreignToken}`);

    assert.equal(res.status, 403);
    assert.match(res.body.message, /Cross-college event access is blocked/);
  });

  await t.test('11. Cross-college registration is blocked (403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/events/${testEventId}/register`)
      .set('Authorization', `Bearer ${foreignToken}`)
      .send({});

    assert.equal(res.status, 403);
    assert.match(res.body.message, /Cross-college event registration is blocked/);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. REGISTRATION & CAPACITY ENFORCEMENT & WAITLISTING
  // ───────────────────────────────────────────────────────────────────────────

  await t.test('12. Student 1 registers successfully (Seat 1 of 2)', async () => {
    const res = await request(app)
      .post(`/api/events/${testEventId}/register`)
      .set('Authorization', `Bearer ${studentToken1}`)
      .send({ notes: 'Interested in GenAI track' });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.status, 'REGISTERED');

    // Verify registration count updated
    const event = await Event.findByPk(testEventId);
    assert.equal(event.registrationCount, 1);
  });

  await t.test('13. Duplicate registration is blocked (409 Conflict)', async () => {
    const res = await request(app)
      .post(`/api/events/${testEventId}/register`)
      .set('Authorization', `Bearer ${studentToken1}`)
      .send({});

    assert.equal(res.status, 409);
    assert.match(res.body.message, /already registered or waitlisted/);
  });

  await t.test('14. Student 2 registers successfully (Seat 2 of 2 - Capacity Reached)', async () => {
    const res = await request(app)
      .post(`/api/events/${testEventId}/register`)
      .set('Authorization', `Bearer ${studentToken2}`)
      .send({});

    assert.equal(res.status, 201);
    assert.equal(res.body.data.status, 'REGISTERED');

    const event = await Event.findByPk(testEventId);
    assert.equal(event.registrationCount, 2);
  });

  await t.test('15. Student 3 attempts registration when capacity is full -> WAITLISTED', async () => {
    const res = await request(app)
      .post(`/api/events/${testEventId}/register`)
      .set('Authorization', `Bearer ${studentToken3}`)
      .send({});

    assert.equal(res.status, 201);
    assert.equal(res.body.data.status, 'WAITLISTED');
    assert.match(res.body.message, /added to the waitlist/);

    // Registration count should still be 2 (active capacity)
    const event = await Event.findByPk(testEventId);
    assert.equal(event.registrationCount, 2);
  });

  await t.test('16. Student 1 cancels registration -> Waitlisted Student 3 is automatically promoted to REGISTERED', async () => {
    const cancelRes = await request(app)
      .delete(`/api/events/${testEventId}/register`)
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(cancelRes.status, 200);
    assert.equal(cancelRes.body.data.status, 'CANCELLED');

    // Check Student 3 registration status
    const student3Reg = await EventRegistration.findOne({
      where: { eventId: testEventId, studentId: studentUser3.id },
    });
    assert.equal(student3Reg.status, 'REGISTERED', 'Waitlisted student promoted to REGISTERED');

    // Verify promotion notification created
    const notif = await Notification.findOne({
      where: { userId: studentUser3.id, type: 'WAITLIST_PROMOTED' },
    });
    assert.ok(notif, 'Waitlist promotion notification delivered');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. TARGETING & ELIGIBILITY (DEPARTMENT & SEMESTER)
  // ───────────────────────────────────────────────────────────────────────────

  let targetedEventId;

  await t.test('17. Teacher creates event targeted strictly to CSE Department', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${teacherToken1}`)
      .send({
        title: 'CSE Department Colloquium',
        description: 'Exclusively for CSE students.',
        category: 'seminar',
        venue: 'CSE Seminar Hall',
        organizerName: 'CSE Dept',
        startDateTime: new Date(Date.now() + 86400000).toISOString(),
        endDateTime: new Date(Date.now() + 172800000).toISOString(),
        visibility: 'DEPARTMENT',
        departmentId: deptCSE.id,
        status: 'PUBLISHED',
      });

    assert.equal(res.status, 201);
    targetedEventId = res.body.data.id;
  });

  await t.test('18. Non-matching department student (ECE Student 3) registration rejected with 403', async () => {
    const res = await request(app)
      .post(`/api/events/${targetedEventId}/register`)
      .set('Authorization', `Bearer ${studentToken3}`)
      .send({});

    assert.equal(res.status, 403);
    assert.match(res.body.message, /restricted to students of a specific department/);
  });

  await t.test('19. Matching department student (CSE Student 2) registers successfully', async () => {
    const res = await request(app)
      .post(`/api/events/${targetedEventId}/register`)
      .set('Authorization', `Bearer ${studentToken2}`)
      .send({});

    assert.equal(res.status, 201);
    assert.equal(res.body.data.status, 'REGISTERED');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. BOOKMARKS & SAVED EVENTS
  // ───────────────────────────────────────────────────────────────────────────

  await t.test('20. Student can bookmark an event', async () => {
    const res = await request(app)
      .post(`/api/events/${testEventId}/bookmark`)
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(res.status, 201);
  });

  await t.test('21. Duplicate bookmark is rejected with 409 Conflict', async () => {
    const res = await request(app)
      .post(`/api/events/${testEventId}/bookmark`)
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(res.status, 409);
    assert.match(res.body.message, /already bookmarked/);
  });

  await t.test('22. Student can list saved/bookmarked events', async () => {
    const res = await request(app)
      .get('/api/events/bookmarks')
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.some((e) => e.id === testEventId));
  });

  await t.test('23. Student can remove bookmark', async () => {
    const res = await request(app)
      .delete(`/api/events/${testEventId}/bookmark`)
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 7. ATTENDANCE MANAGEMENT & PERMISSIONS
  // ───────────────────────────────────────────────────────────────────────────

  await t.test('24. Student cannot mark self attended (403 Forbidden)', async () => {
    const res = await request(app)
      .patch(`/api/events/${testEventId}/participants/${studentUser2.id}/attendance`)
      .set('Authorization', `Bearer ${studentToken2}`)
      .send({ attendanceStatus: 'ATTENDED' });

    assert.equal(res.status, 403);
    assert.match(res.body.message, /Only event organizers and administrators/);
  });

  await t.test('25. Non-creator teacher cannot modify attendance (403 Forbidden - IDOR)', async () => {
    const res = await request(app)
      .patch(`/api/events/${testEventId}/participants/${studentUser2.id}/attendance`)
      .set('Authorization', `Bearer ${teacherToken2}`)
      .send({ attendanceStatus: 'ATTENDED' });

    assert.equal(res.status, 403);
    assert.match(res.body.message, /cannot modify attendance for another teacher's event/);
  });

  await t.test('26. Event organizer (Teacher 1) marks student attendance -> Awards +10 reputation', async () => {
    const initialReputation = (await StudentProfile.findOne({ where: { userId: studentUser2.id } })).reputationScore || 0;

    const res = await request(app)
      .patch(`/api/events/${testEventId}/participants/${studentUser2.id}/attendance`)
      .set('Authorization', `Bearer ${teacherToken1}`)
      .send({ attendanceStatus: 'ATTENDED', notes: 'Present in workshop lab' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.attendanceStatus, 'ATTENDED');

    // Verify reputation points awarded
    const updatedProfile = await StudentProfile.findOne({ where: { userId: studentUser2.id } });
    assert.equal(updatedProfile.reputationScore, initialReputation + 10);

    const repLog = await ReputationLog.findOne({
      where: { userId: studentUser2.id, actionType: 'event_attendance', sourceId: testEventId },
    });
    assert.ok(repLog);
    assert.equal(repLog.points, 10);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 8. DISCOVERY, FILTERING & PAGINATION
  // ───────────────────────────────────────────────────────────────────────────

  await t.test('27. Discovery filter by category and search term returns matching events', async () => {
    const res = await request(app)
      .get('/api/events?category=hackathon&search=TechHacks')
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);
    assert.equal(res.body.data[0].category, 'hackathon');
    assert.ok(res.body.meta.total >= 1);
  });

  await t.test('28. Student can view their own registered events', async () => {
    const res = await request(app)
      .get('/api/events/my-registrations')
      .set('Authorization', `Bearer ${studentToken2}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.some((r) => r.eventId === testEventId));
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 9. ADMIN MODERATION & AUDIT LOGS
  // ───────────────────────────────────────────────────────────────────────────

  await t.test('29. Admin can view all campus events and metrics', async () => {
    const listRes = await request(app)
      .get('/api/admin/events')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(listRes.status, 200);
    assert.ok(Array.isArray(listRes.body.data));

    const statsRes = await request(app)
      .get('/api/admin/events/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(statsRes.status, 200);
    assert.ok(statsRes.body.data.totalEvents >= 2);
    assert.ok(statsRes.body.data.totalRegistrations >= 1);
  });

  await t.test('30. Admin moderates and cancels event with AuditLog', async () => {
    const cancelRes = await request(app)
      .patch(`/api/admin/events/${targetedEventId}/moderate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'cancel', reason: 'Auditorium maintenance conflict' });

    assert.equal(cancelRes.status, 200);
    assert.equal(cancelRes.body.data.status, 'CANCELLED');

    // Verify audit log
    const audit = await AuditLog.findOne({
      where: { action: 'ADMIN_EVENT_MODERATION', actorId: adminUser.id },
    });
    assert.ok(audit, 'AuditLog created for admin event moderation');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 10. END-TO-END INTEGRATION TEST
  // ───────────────────────────────────────────────────────────────────────────

  await t.test('31. Full Lifecycle Integration Flow: Create -> Publish -> Discover -> Register -> View -> Mark Attended', async () => {
    // Step 1: Teacher creates Workshop
    const createRes = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${teacherToken1}`)
      .send({
        title: 'Fullstack React & Node Workshop',
        description: 'Hands-on project building session for sophomore students.',
        category: 'workshop',
        venue: 'Computer Center Lab 1',
        organizerName: 'Web Club',
        startDateTime: new Date(Date.now() + 100000000).toISOString(),
        endDateTime: new Date(Date.now() + 200000000).toISOString(),
        maxParticipants: 50,
        status: 'DRAFT',
      });
    assert.equal(createRes.status, 201);
    const flowEventId = createRes.body.data.id;

    // Step 2: Teacher publishes workshop
    const pubRes = await request(app)
      .post(`/api/events/${flowEventId}/publish`)
      .set('Authorization', `Bearer ${teacherToken1}`);
    assert.equal(pubRes.status, 200);
    assert.equal(pubRes.body.data.status, 'PUBLISHED');

    // Step 3: Student discovers workshop in public feed
    const discRes = await request(app)
      .get(`/api/events?category=workshop`)
      .set('Authorization', `Bearer ${studentToken1}`);
    assert.equal(discRes.status, 200);
    const found = discRes.body.data.find((e) => e.id === flowEventId);
    assert.ok(found, 'Student discovers published workshop');

    // Step 4: Student registers for workshop
    const regRes = await request(app)
      .post(`/api/events/${flowEventId}/register`)
      .set('Authorization', `Bearer ${studentToken1}`)
      .send({ notes: 'Excited to learn' });
    assert.equal(regRes.status, 201);
    assert.equal(regRes.body.data.status, 'REGISTERED');

    // Step 5: Teacher views participant roster
    const partRes = await request(app)
      .get(`/api/events/${flowEventId}/participants`)
      .set('Authorization', `Bearer ${teacherToken1}`);
    assert.equal(partRes.status, 200);
    assert.ok(partRes.body.data.some((p) => p.studentId === studentUser1.id));

    // Step 6: Teacher marks Student 1 as ATTENDED
    const attRes = await request(app)
      .patch(`/api/events/${flowEventId}/participants/${studentUser1.id}/attendance`)
      .set('Authorization', `Bearer ${teacherToken1}`)
      .send({ attendanceStatus: 'ATTENDED' });
    assert.equal(attRes.status, 200);
    assert.equal(attRes.body.data.attendanceStatus, 'ATTENDED');

    // Step 7: Student views event details and sees ATTENDED status
    const detailsRes = await request(app)
      .get(`/api/events/${flowEventId}`)
      .set('Authorization', `Bearer ${studentToken1}`);
    assert.equal(detailsRes.status, 200);
    assert.equal(detailsRes.body.data.isRegistered, true);
    assert.equal(detailsRes.body.data.attendanceStatus, 'ATTENDED');
  });
});
