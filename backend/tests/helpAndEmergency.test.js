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
  Block,
  HelpRequest,
  HelpResponder,
  HelpMessage,
  HelpFeedback,
  ReputationLog,
} = require('../src/models');
const { generateAccessToken } = require('../src/utils/jwt');
const collegeService = require('../src/services/collegeService');
const helpService = require('../src/services/helpService');

test('UNILINK HELP & EMERGENCY MODULE TEST SUITE', async (t) => {
  let defaultCollege;
  let userA, profileA, tokenA;
  let userB, profileB, tokenB;
  let userC, profileC, tokenC;
  let teacherUser, teacherToken;
  let adminUser, adminToken;
  let suspendedUser, suspendedToken;

  await sequelize.sync({ force: true });
  defaultCollege = await collegeService.getDefaultCollege();

  // Student A: Requester (Campus Center: 12.3000, 76.6500)
  userA = await User.create({
    email: 'alice.help@nie.ac.in',
    role: 'student',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: defaultCollege.id,
  });
  profileA = await StudentProfile.create({
    userId: userA.id,
    collegeId: defaultCollege.id,
    usn: '1NIE21CS101',
    fullName: 'Alice Walker',
    college: defaultCollege.name,
    department: 'Computer Science & Engineering',
    semester: 6,
    lastLatitude: 12.3000,
    lastLongitude: 76.6500,
    availableToHelp: true,
    helpRadiusKm: 5.0,
  });
  tokenA = generateAccessToken({ id: userA.id, role: 'student', collegeId: defaultCollege.id });

  // Student B: Nearby Helper (300 meters away: 12.3025, 76.6510)
  userB = await User.create({
    email: 'bob.help@nie.ac.in',
    role: 'student',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: defaultCollege.id,
  });
  profileB = await StudentProfile.create({
    userId: userB.id,
    collegeId: defaultCollege.id,
    usn: '1NIE21CS102',
    fullName: 'Bob Smith',
    college: defaultCollege.name,
    department: 'Information Science',
    semester: 6,
    lastLatitude: 12.3025,
    lastLongitude: 76.6510,
    availableToHelp: true,
    helpRadiusKm: 5.0,
  });
  tokenB = generateAccessToken({ id: userB.id, role: 'student', collegeId: defaultCollege.id });

  // Student C: Distant / Unrelated Peer (20 km away: 12.4500, 76.8000)
  userC = await User.create({
    email: 'charlie.help@nie.ac.in',
    role: 'student',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: defaultCollege.id,
  });
  profileC = await StudentProfile.create({
    userId: userC.id,
    collegeId: defaultCollege.id,
    usn: '1NIE21CS103',
    fullName: 'Charlie Davis',
    college: defaultCollege.name,
    department: 'Mechanical Engineering',
    semester: 4,
    lastLatitude: 12.4500,
    lastLongitude: 76.8000,
    availableToHelp: true,
    helpRadiusKm: 5.0,
  });
  tokenC = generateAccessToken({ id: userC.id, role: 'student', collegeId: defaultCollege.id });

  // Teacher User
  teacherUser = await User.create({
    email: 'prof.smith@nie.ac.in',
    role: 'teacher',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: defaultCollege.id,
  });
  await TeacherProfile.create({
    userId: teacherUser.id,
    collegeId: defaultCollege.id,
    teacherId: 'TCH-001',
    fullName: 'Prof. Smith',
    college: defaultCollege.name,
    department: 'Computer Science',
  });
  teacherToken = generateAccessToken({ id: teacherUser.id, role: 'teacher', collegeId: defaultCollege.id });

  // Admin User
  adminUser = await User.create({
    email: 'admin.safety@nie.ac.in',
    role: 'admin',
    adminRole: 'SUPER_ADMIN',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: defaultCollege.id,
  });
  adminToken = generateAccessToken({ id: adminUser.id, role: 'admin', collegeId: defaultCollege.id });

  // Suspended User
  suspendedUser = await User.create({
    email: 'suspended@nie.ac.in',
    role: 'student',
    accountStatus: 'suspended',
    isAdminVerified: true,
    collegeId: defaultCollege.id,
  });
  suspendedToken = generateAccessToken({ id: suspendedUser.id, role: 'student', collegeId: defaultCollege.id });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. HELP REQUEST CREATION & VALIDATION
  // ───────────────────────────────────────────────────────────────────────────

  await t.test('1a. Create valid help request with location consent and coordinates', async () => {
    const res = await request(app)
      .post('/api/help/requests')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        category: 'medical',
        title: 'Sprained ankle near sports complex',
        description: 'Need first aid assistance or someone to help me get to the campus clinic.',
        urgencyLevel: 'high',
        locationLabel: 'Sports Complex, Ground Floor',
        latitude: 12.3000,
        longitude: 76.6500,
        locationConsented: true,
        contactPreference: 'chat',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.category, 'medical');
    assert.equal(res.body.data.urgencyLevel, 'high');
    assert.equal(res.body.data.status, 'pending');
    assert.equal(res.body.data.requesterLocationShared, true);
  });

  await t.test('1b. Creation rejected when category is invalid', async () => {
    const res = await request(app)
      .post('/api/help/requests')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        category: 'illegal_category_xyz',
        title: 'Need quick help',
        description: 'Some description',
        locationLabel: 'Library',
      });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /Category must be one of/);
  });

  await t.test('1c. Creation rejected when urgency level is invalid', async () => {
    const res = await request(app)
      .post('/api/help/requests')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        category: 'safety',
        title: 'Need quick help',
        description: 'Some description',
        urgencyLevel: 'extreme_danger_unknown',
        locationLabel: 'Library',
      });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /Urgency level must be one of/);
  });

  await t.test('1d. Creation rejected when location is completely missing', async () => {
    const res = await request(app)
      .post('/api/help/requests')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        category: 'lost_item',
        title: 'Lost college ID badge',
        description: 'Blue lanyard with ID card inside.',
        urgencyLevel: 'low',
      });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /Location is required/);
  });

  await t.test('1e. Abuse prevention: Max active requests limit enforced (max 2 active requests)', async () => {
    // Create 2nd active request for Student A
    const res2 = await request(app)
      .post('/api/help/requests')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        category: 'academic_emergency',
        title: 'Urgent calculator needed before 10 AM exam',
        description: 'Forgot scientific calculator in hostel room.',
        urgencyLevel: 'medium',
        locationLabel: 'Exam Hall 204',
      });
    assert.equal(res2.status, 201);

    // Attempting 3rd active request should be rejected with 429
    const res3 = await request(app)
      .post('/api/help/requests')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        category: 'vehicle_breakdown',
        title: 'Punctured tire in parking',
        description: 'Need a hand with bike tire.',
        urgencyLevel: 'low',
        locationLabel: 'Main Parking',
      });

    assert.equal(res3.status, 429);
    assert.match(res3.body.message, /already have 2 active help requests/);

    // Clean up the 2nd request so Student A only has 1 active request
    await HelpRequest.destroy({ where: { id: res2.body.data.id } });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. PERMISSIONS & ROLE CONTROLS
  // ───────────────────────────────────────────────────────────────────────────

  await t.test('2a. Unauthenticated request to /api/help/requests is rejected with 401', async () => {
    const res = await request(app).get('/api/help/requests');
    assert.equal(res.status, 401);
  });

  await t.test('2b. Teacher attempting to create emergency request is rejected with 403', async () => {
    const res = await request(app)
      .post('/api/help/requests')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        category: 'campus_assistance',
        title: 'Lab projector not turning on',
        description: 'Urgent technical help needed',
        locationLabel: 'Lab 3',
      });

    assert.equal(res.status, 403);
    assert.match(res.body.message, /Only verified students/);
  });

  await t.test('2c. Suspended user cannot view nearby help requests', async () => {
    const res = await request(app)
      .get('/api/help/nearby')
      .set('Authorization', `Bearer ${suspendedToken}`);

    assert.equal(res.status, 403);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. NEARBY MATCHING & PRIVACY MASKING
  // ───────────────────────────────────────────────────────────────────────────

  let activeRequestId;

  await t.test('3a. Nearby helper (Student B) discovers request with coarse distance label', async () => {
    const res = await request(app)
      .get(`/api/help/nearby?lat=${profileB.lastLatitude}&lon=${profileB.lastLongitude}`)
      .set('Authorization', `Bearer ${tokenB}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);

    const match = res.body.data.find((r) => r.category === 'medical');
    assert.ok(match);
    activeRequestId = match.id;

    // Verify distance calculation and coarse label
    assert.ok(match.distanceMeters !== null);
    assert.equal(match.distanceLabel, 'Within 500 m');

    // PRIVACY: Exact latitude & longitude MUST be stripped in nearby feed!
    assert.equal(match.latitude, undefined);
    assert.equal(match.longitude, undefined);
  });

  await t.test('3b. Distant student (Student C, 20 km away) does not receive request (outside radius)', async () => {
    const res = await request(app)
      .get(`/api/help/nearby?lat=${profileC.lastLatitude}&lon=${profileC.lastLongitude}`)
      .set('Authorization', `Bearer ${tokenC}`);

    assert.equal(res.status, 200);
    const match = res.body.data.find((r) => r.id === activeRequestId);
    assert.equal(match, undefined); // Excluded due to distance > 5km
  });

  await t.test('3c. Helper with availableToHelp=false does not receive any nearby requests', async () => {
    // Disable availability for Student B
    await profileB.update({ availableToHelp: false });

    const res = await request(app)
      .get(`/api/help/nearby?lat=${profileB.lastLatitude}&lon=${profileB.lastLongitude}`)
      .set('Authorization', `Bearer ${tokenB}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 0);

    // Re-enable availability
    await profileB.update({ availableToHelp: true });
  });

  await t.test('3d. Blocked student is excluded from nearby requests', async () => {
    // Block Student B by Student A
    await Block.create({ blockerId: userA.id, blockedId: userB.id });

    const res = await request(app)
      .get(`/api/help/nearby?lat=${profileB.lastLatitude}&lon=${profileB.lastLongitude}`)
      .set('Authorization', `Bearer ${tokenB}`);

    assert.equal(res.status, 200);
    const match = res.body.data.find((r) => r.id === activeRequestId);
    assert.equal(match, undefined); // Excluded because of block

    // Clean up block
    await Block.destroy({ where: { blockerId: userA.id, blockedId: userB.id } });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. VOLUNTEERING & MULTIPLE RESPONDERS FLOW
  // ───────────────────────────────────────────────────────────────────────────

  await t.test('4a. Requester cannot volunteer for their own request', async () => {
    const res = await request(app)
      .post(`/api/help/requests/${activeRequestId}/respond`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ message: 'I can help myself' });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /cannot volunteer for your own/);
  });

  await t.test('4b. Student B volunteers ("I Can Help")', async () => {
    const res = await request(app)
      .post(`/api/help/requests/${activeRequestId}/respond`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        message: 'I am right at the entrance of sports complex with first aid kit!',
        latitude: profileB.lastLatitude,
        longitude: profileB.lastLongitude,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.status, 'offered');
    assert.equal(res.body.data.userId, userB.id);

    // Verify request status transitioned to 'accepted'
    const updatedReq = await HelpRequest.findByPk(activeRequestId);
    assert.equal(updatedReq.status, 'accepted');
  });

  await t.test('4c. Student C also volunteers (Multiple Responders)', async () => {
    const res = await request(app)
      .post(`/api/help/requests/${activeRequestId}/respond`)
      .set('Authorization', `Bearer ${tokenC}`)
      .send({
        message: 'I can also assist if needed!',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.status, 'offered');
  });

  await t.test('4d. Non-requester (Student C) cannot select primary helper (403 Forbidden)', async () => {
    const res = await request(app)
      .patch(`/api/help/requests/${activeRequestId}/select-helper`)
      .set('Authorization', `Bearer ${tokenC}`)
      .send({ responderUserId: userB.id });

    assert.equal(res.status, 403);
    assert.match(res.body.message, /Only the requester can select/);
  });

  await t.test('4e. Requester selects Student B as primary helper -> Request transitions to ACTIVE', async () => {
    const res = await request(app)
      .patch(`/api/help/requests/${activeRequestId}/select-helper`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ responderUserId: userB.id });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'active');
    assert.equal(res.body.data.helperId, userB.id);

    // Verify Student B responder status is 'selected' and Student C is 'declined'
    const respB = await HelpResponder.findOne({ where: { helpRequestId: activeRequestId, userId: userB.id } });
    const respC = await HelpResponder.findOne({ where: { helpRequestId: activeRequestId, userId: userC.id } });
    assert.equal(respB.status, 'selected');
    assert.equal(respC.status, 'declined');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. LOCATION SHARING & SECURITY
  // ───────────────────────────────────────────────────────────────────────────

  await t.test('5a. Unrelated Student C is rejected from viewing live coordinates (403 Forbidden)', async () => {
    const res = await request(app)
      .get(`/api/help/requests/${activeRequestId}/location`)
      .set('Authorization', `Bearer ${tokenC}`);

    assert.equal(res.status, 403);
    assert.match(res.body.message, /Only active request participants can view location/);
  });

  await t.test('5b. Authorized helper (Student B) can view live coordinates when shared', async () => {
    const res = await request(app)
      .get(`/api/help/requests/${activeRequestId}/location`)
      .set('Authorization', `Bearer ${tokenB}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.requesterLocationShared, true);
    assert.equal(res.body.data.requesterLocation.latitude, 12.3000);
    assert.equal(res.body.data.requesterLocation.longitude, 76.6500);
  });

  await t.test('5c. Helper shares their live location', async () => {
    const res = await request(app)
      .patch(`/api/help/requests/${activeRequestId}/location`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        shareExactLocation: true,
        latitude: 12.3015,
        longitude: 76.6505,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.helperLocationShared, true);
    assert.equal(res.body.data.helperLatitude, 12.3015);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. EMERGENCY CHAT
  // ───────────────────────────────────────────────────────────────────────────

  await t.test('6a. Helper B sends coordination message to Requester A', async () => {
    const res = await request(app)
      .post(`/api/help/requests/${activeRequestId}/messages`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ message: 'I have reached the ground floor entrance. Where are you seated?' });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.senderId, userB.id);
  });

  await t.test('6b. Requester A replies in coordination chat', async () => {
    const res = await request(app)
      .post(`/api/help/requests/${activeRequestId}/messages`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ message: 'By the badminton courts on the green bench.' });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.senderId, userA.id);
  });

  await t.test('6c. Unrelated Student C cannot view emergency messages (403 Forbidden)', async () => {
    const res = await request(app)
      .get(`/api/help/requests/${activeRequestId}/messages`)
      .set('Authorization', `Bearer ${tokenC}`);

    assert.equal(res.status, 403);
    assert.match(res.body.message, /not a participant in this conversation/);
  });

  await t.test('6d. Participants can view complete message conversation history', async () => {
    const res = await request(app)
      .get(`/api/help/requests/${activeRequestId}/messages`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.length >= 3); // initial system message + helper msg + requester msg
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 7. STATE MACHINE ENFORCEMENT & RESOLUTION
  // ───────────────────────────────────────────────────────────────────────────

  await t.test('7a. Invalid state transition is rejected (e.g., active -> pending)', async () => {
    assert.throws(() => {
      helpService.validateTransition('active', 'pending');
    }, /Invalid state transition/);
  });

  await t.test('7b. Requester marks request as RESOLVED -> Helper receives +15 reputation', async () => {
    const initialReputation = (await StudentProfile.findOne({ where: { userId: userB.id } })).reputationScore || 0;

    const res = await request(app)
      .patch(`/api/help/requests/${activeRequestId}/resolve`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'resolved');
    assert.ok(res.body.data.resolvedAt);

    // Verify location sharing automatically disabled on resolution
    assert.equal(res.body.data.requesterLocationShared, false);
    assert.equal(res.body.data.helperLocationShared, false);

    // Check helper reputation increment
    const updatedProfile = await StudentProfile.findOne({ where: { userId: userB.id } });
    assert.equal(updatedProfile.reputationScore, initialReputation + 15);
    assert.ok(updatedProfile.studentsHelpedCount >= 1);

    // Verify reputation log created
    const repLog = await ReputationLog.findOne({ where: { sourceId: activeRequestId, actionType: 'emergency_help' } });
    assert.ok(repLog);
    assert.equal(repLog.points, 15);
  });

  await t.test('7c. Transition from resolved -> active is strictly forbidden', async () => {
    assert.throws(() => {
      helpService.validateTransition('resolved', 'active');
    }, /Invalid state transition/);
  });

  await t.test('7d. Location endpoint returns empty coordinates once request is resolved', async () => {
    const res = await request(app)
      .get(`/api/help/requests/${activeRequestId}/location`)
      .set('Authorization', `Bearer ${tokenB}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.requesterLocation, null);
    assert.equal(res.body.data.helperLocation, null);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 8. POST-RESOLUTION FEEDBACK & RATING
  // ───────────────────────────────────────────────────────────────────────────

  await t.test('8a. Requester submits helpful feedback and 5-star rating', async () => {
    const res = await request(app)
      .post(`/api/help/requests/${activeRequestId}/feedback`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        wasHelpful: true,
        rating: 5,
        comments: 'Bob arrived in under 3 minutes with an ice pack and bandage. Incredible peer support!',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.wasHelpful, true);
    assert.equal(res.body.data.rating, 5);
  });

  await t.test('8b. Duplicate feedback submission is rejected with 409 Conflict', async () => {
    const res = await request(app)
      .post(`/api/help/requests/${activeRequestId}/feedback`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        wasHelpful: true,
        rating: 5,
      });

    assert.equal(res.status, 409);
    assert.match(res.body.message, /already submitted feedback/);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 9. CANCELLATION & TIMEOUT EXPIRATION
  // ───────────────────────────────────────────────────────────────────────────

  await t.test('9a. Student can cancel their own pending help request', async () => {
    // Create new request
    const createRes = await request(app)
      .post('/api/help/requests')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        category: 'lost_item',
        title: 'Lost keys in library',
        description: 'Room keys with blue key ring.',
        urgencyLevel: 'low',
        locationLabel: 'Library 1st Floor',
      });

    const newReqId = createRes.body.data.id;

    // Cancel request
    const cancelRes = await request(app)
      .delete(`/api/help/requests/${newReqId}/cancel`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ reason: 'Found keys in my bag!' });

    assert.equal(cancelRes.status, 200);
    assert.equal(cancelRes.body.data.status, 'cancelled');
    assert.equal(cancelRes.body.data.cancellationReason, 'Found keys in my bag!');
  });

  await t.test('9b. Inactive overdue requests automatically expire', async () => {
    // Create request with past expiresAt
    const pastDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
    const expReq = await HelpRequest.create({
      requesterId: userA.id,
      category: 'other',
      title: 'Old request',
      description: 'Needs help but expired',
      urgencyLevel: 'low',
      locationLabel: 'Campus canteen',
      status: 'pending',
      expiresAt: pastDate,
    });

    const expiredCount = await helpService.expireInactiveRequests();
    assert.ok(expiredCount >= 1);

    await expReq.reload();
    assert.equal(expReq.status, 'expired');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 10. HELP HISTORY
  // ───────────────────────────────────────────────────────────────────────────

  await t.test('10a. Student can retrieve their help history with sanitized locations', async () => {
    const res = await request(app)
      .get('/api/help/history')
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data.myRequests));
    assert.ok(Array.isArray(res.body.data.helpProvided));

    // Verify exact coordinates are sanitized/removed from history list
    const firstReq = res.body.data.myRequests[0];
    assert.equal(firstReq.latitude, undefined);
    assert.equal(firstReq.longitude, undefined);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 11. ADMIN AUDIT & MONITORING
  // ───────────────────────────────────────────────────────────────────────────

  await t.test('11a. Admin can view all help requests and overall statistics', async () => {
    const listRes = await request(app)
      .get('/api/admin/help/requests')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(listRes.status, 200);
    assert.ok(Array.isArray(listRes.body.data));

    const statsRes = await request(app)
      .get('/api/admin/help/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(statsRes.status, 200);
    assert.ok(statsRes.body.data.totalRequests >= 1);
    assert.ok(statsRes.body.data.resolvedCount >= 1);
  });

  await t.test('11b. Admin can moderate and cancel abusive/fake emergency requests', async () => {
    const prankReq = await HelpRequest.create({
      requesterId: userC.id,
      category: 'other',
      title: 'Fake emergency prank',
      description: 'Test prank request',
      urgencyLevel: 'high',
      locationLabel: 'Nowhere',
      status: 'pending',
      expiresAt: new Date(Date.now() + 3600000),
    });

    const res = await request(app)
      .patch(`/api/admin/help/requests/${prankReq.id}/moderate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'cancel', reason: 'Prank/Abuse reported and verified.' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'cancelled');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 12. END-TO-END INTEGRATION FLOW (REQUIREMENT 31)
  // ───────────────────────────────────────────────────────────────────────────

  await t.test('12. End-to-End Real Flow: Request -> Discovery -> Offer -> Accept -> Coordinate -> Resolve -> Feedback', async () => {
    // Step 1: Student A creates critical blood requirement request
    const createRes = await request(app)
      .post('/api/help/requests')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        category: 'blood_requirement',
        title: 'Urgently looking for O+ blood donor for relative at campus hospital',
        description: 'Scheduled surgery today. Need 1 unit of O+ blood.',
        urgencyLevel: 'critical',
        locationLabel: 'Campus Medical Wing, Block B',
        latitude: 12.3005,
        longitude: 76.6502,
        locationConsented: true,
      });

    assert.equal(createRes.status, 201);
    const flowReqId = createRes.body.data.id;
    assert.equal(createRes.body.data.status, 'pending');

    // Step 2: Student B checks nearby requests and discovers Student A's request
    const nearbyRes = await request(app)
      .get(`/api/help/nearby?lat=12.3010&lon=76.6508`)
      .set('Authorization', `Bearer ${tokenB}`);

    assert.equal(nearbyRes.status, 200);
    const match = nearbyRes.body.data.find((r) => r.id === flowReqId);
    assert.ok(match, 'Student B finds Student A request');
    assert.equal(match.category, 'blood_requirement');
    assert.equal(match.urgencyLevel, 'critical');

    // Step 3: Student B responds ("I Can Help - I am O+ and available")
    const respondRes = await request(app)
      .post(`/api/help/requests/${flowReqId}/respond`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        message: 'I am O positive and currently right next to Block B!',
        latitude: 12.3010,
        longitude: 76.6508,
      });

    assert.equal(respondRes.status, 201);

    // Step 4: Student A accepts Student B as the primary responder
    const acceptRes = await request(app)
      .patch(`/api/help/requests/${flowReqId}/select-helper`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ responderUserId: userB.id });

    assert.equal(acceptRes.status, 200);
    assert.equal(acceptRes.body.data.status, 'active');
    assert.equal(acceptRes.body.data.helperId, userB.id);

    // Step 5: Emergency chat coordination
    const chatMsgRes = await request(app)
      .post(`/api/help/requests/${flowReqId}/messages`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ message: 'I am meeting the duty doctor in room 12 now.' });

    assert.equal(chatMsgRes.status, 201);

    // Step 6: Location sharing active during emergency
    const locRes = await request(app)
      .get(`/api/help/requests/${flowReqId}/location`)
      .set('Authorization', `Bearer ${tokenB}`);

    assert.equal(locRes.status, 200);
    assert.equal(locRes.body.data.requesterLocationShared, true);

    // Step 7: Student A marks request resolved
    const resolveRes = await request(app)
      .patch(`/api/help/requests/${flowReqId}/resolve`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(resolveRes.status, 200);
    assert.equal(resolveRes.body.data.status, 'resolved');

    // Step 8: Location sharing stopped
    const locPostRes = await request(app)
      .get(`/api/help/requests/${flowReqId}/location`)
      .set('Authorization', `Bearer ${tokenB}`);

    assert.equal(locPostRes.body.data.requesterLocation, null);

    // Step 9: Feedback recorded
    const feedbackRes = await request(app)
      .post(`/api/help/requests/${flowReqId}/feedback`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        wasHelpful: true,
        rating: 5,
        comments: 'Life-saving blood donation on campus. Incredibly grateful!',
      });

    assert.equal(feedbackRes.status, 201);
  });
});
