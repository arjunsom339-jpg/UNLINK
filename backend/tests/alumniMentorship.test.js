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
} = require('../src/models');
const { generateAccessToken } = require('../src/utils/jwt');
const collegeService = require('../src/services/collegeService');
const alumniService = require('../src/services/alumniService');

test('ALUMNI NETWORKING & MENTORSHIP ENGINE MODULE TEST SUITE', async (t) => {
  let college1, college2;
  let deptCSE, deptECE;
  let studentUser1, studentProfile1, studentToken1;
  let studentUser2, studentProfile2, studentToken2;
  let foreignStudent, foreignToken;
  let alumniUser1, alumniProfile1, alumniToken1;
  let alumniUser2, alumniProfile2, alumniToken2;
  let foreignAlumniUser, foreignAlumniProfile, foreignAlumniToken;
  let adminUser, adminToken;
  let foreignAdminUser, foreignAdminToken;

  await sequelize.sync({ force: true });
  college1 = await collegeService.getDefaultCollege();

  // Second college for cross-college tests
  college2 = await College.create({
    name: 'BMS College of Engineering',
    code: 'BMSCE',
    domain: 'bmsce.ac.in',
  });

  // Departments
  deptCSE = await Department.create({
    collegeId: college1.id,
    name: 'Computer Science & Engineering',
    code: 'CSE',
  });
  deptECE = await Department.create({
    collegeId: college1.id,
    name: 'Electronics & Communication',
    code: 'ECE',
  });

  // 1. Admin Users
  adminUser = await User.create({
    email: 'admin.alumni@nie.ac.in',
    role: 'admin',
    adminRole: 'ADMIN',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: college1.id,
  });
  adminToken = generateAccessToken({ id: adminUser.id, role: 'admin', collegeId: college1.id });

  foreignAdminUser = await User.create({
    email: 'admin@bmsce.ac.in',
    role: 'admin',
    adminRole: 'ADMIN',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: college2.id,
  });
  foreignAdminToken = generateAccessToken({ id: foreignAdminUser.id, role: 'admin', collegeId: college2.id });

  // 2. Student Users (College 1)
  studentUser1 = await User.create({
    email: 'student.alice@nie.ac.in',
    role: 'student',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: college1.id,
  });
  studentProfile1 = await StudentProfile.create({
    userId: studentUser1.id,
    collegeId: college1.id,
    departmentId: deptCSE.id,
    usn: '1NIE21CS001',
    fullName: 'Alice Student',
    college: college1.name,
    department: 'Computer Science',
    semester: 6,
    skills: ['JavaScript', 'React', 'Java'],
  });
  studentToken1 = generateAccessToken({ id: studentUser1.id, role: 'student', collegeId: college1.id });

  studentUser2 = await User.create({
    email: 'student.bob@nie.ac.in',
    role: 'student',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: college1.id,
  });
  studentProfile2 = await StudentProfile.create({
    userId: studentUser2.id,
    collegeId: college1.id,
    departmentId: deptECE.id,
    usn: '1NIE21EC002',
    fullName: 'Bob Student',
    college: college1.name,
    department: 'Electronics',
    semester: 4,
  });
  studentToken2 = generateAccessToken({ id: studentUser2.id, role: 'student', collegeId: college1.id });

  // Foreign Student (College 2)
  foreignStudent = await User.create({
    email: 'foreign.student@bmsce.ac.in',
    role: 'student',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: college2.id,
  });
  foreignToken = generateAccessToken({ id: foreignStudent.id, role: 'student', collegeId: college2.id });

  // 3. Alumni Users (College 1)
  alumniUser1 = await User.create({
    email: 'alumni.carol@nie.ac.in',
    role: 'alumni',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: college1.id,
  });
  alumniToken1 = generateAccessToken({ id: alumniUser1.id, role: 'alumni', collegeId: college1.id });

  alumniProfile1 = await AlumniProfile.create({
    userId: alumniUser1.id,
    collegeId: college1.id,
    departmentId: deptCSE.id,
    graduationYear: 2022,
    degree: 'B.E. Computer Science',
    currentJobTitle: 'Senior Software Engineer',
    currentCompany: 'Google',
    industry: 'Technology',
    experienceYears: 4,
    location: 'Bangalore, India',
    bio: 'Passionate about distributed systems, backend architectures, and mentoring students.',
    skills: ['Java', 'Distributed Systems', 'Cloud', 'System Design'],
    expertiseAreas: ['Backend Architecture', 'Career Growth'],
    mentorshipTopics: ['Backend Development', 'System Design', 'Interview Preparation', 'Resume / Career'],
    availabilityStatus: 'AVAILABLE',
    mentorshipMode: 'FLEXIBLE',
    verificationStatus: 'VERIFIED',
    visibility: 'COLLEGE_ONLY',
  });

  alumniUser2 = await User.create({
    email: 'alumni.dave@nie.ac.in',
    role: 'alumni',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: college1.id,
  });
  alumniToken2 = generateAccessToken({ id: alumniUser2.id, role: 'alumni', collegeId: college1.id });

  alumniProfile2 = await AlumniProfile.create({
    userId: alumniUser2.id,
    collegeId: college1.id,
    departmentId: deptECE.id,
    graduationYear: 2021,
    degree: 'B.E. Electronics',
    currentJobTitle: 'VLSI Engineer',
    currentCompany: 'Intel',
    industry: 'Semiconductor',
    experienceYears: 5,
    location: 'Hyderabad, India',
    bio: 'Hardware design and chip verification expert.',
    skills: ['Verilog', 'VLSI', 'Embedded Systems'],
    expertiseAreas: ['Hardware Systems'],
    mentorshipTopics: ['Hardware Engineering', 'Higher Studies'],
    availabilityStatus: 'LIMITED',
    mentorshipMode: 'CHAT',
    verificationStatus: 'PENDING', // Unverified!
    visibility: 'COLLEGE_ONLY',
  });

  // Foreign Alumni (College 2)
  foreignAlumniUser = await User.create({
    email: 'alumni.eve@bmsce.ac.in',
    role: 'alumni',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: college2.id,
  });
  foreignAlumniToken = generateAccessToken({ id: foreignAlumniUser.id, role: 'alumni', collegeId: college2.id });

  foreignAlumniProfile = await AlumniProfile.create({
    userId: foreignAlumniUser.id,
    collegeId: college2.id,
    graduationYear: 2020,
    degree: 'B.Tech IT',
    currentJobTitle: 'Cloud Architect',
    currentCompany: 'Amazon Web Services',
    industry: 'Cloud Computing',
    experienceYears: 6,
    skills: ['AWS', 'Kubernetes'],
    mentorshipTopics: ['Cloud Architecture'],
    verificationStatus: 'VERIFIED',
    visibility: 'COLLEGE_ONLY',
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST CASES
  // ───────────────────────────────────────────────────────────────────────────

  // Test 1: Student can view verified alumni
  await t.test('1. Student can view verified alumni', async () => {
    const res = await request(app)
      .get('/api/alumni')
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    const verifiedFound = res.body.data.find((a) => a.id === alumniProfile1.id);
    assert.ok(verifiedFound, 'Verified alumni Carol must be in results');
  });

  // Test 2: Unverified alumni hidden from discovery
  await t.test('2. Unverified alumni hidden from discovery', async () => {
    const res = await request(app)
      .get('/api/alumni')
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(res.status, 200);
    const unverifiedFound = res.body.data.find((a) => a.id === alumniProfile2.id);
    assert.equal(unverifiedFound, undefined, 'Pending/unverified alumni Dave must NOT appear in discovery');
  });

  // Test 3: Student cannot impersonate alumni
  await t.test('3. Student cannot impersonate alumni in verification actions', async () => {
    const res = await request(app)
      .patch(`/api/admin/alumni/${alumniProfile2.id}/verify`)
      .set('Authorization', `Bearer ${studentToken1}`)
      .send({ status: 'VERIFIED' });

    assert.equal(res.status, 403, 'Student must receive 403 Forbidden attempting admin verification');
  });

  // Test 4: Alumni profile creation works
  let newAlumniProfileId;
  await t.test('4. Alumni profile creation works', async () => {
    const freshAlumni = await User.create({
      email: 'new.alumni@nie.ac.in',
      role: 'student',
      accountStatus: 'active',
      isAdminVerified: true,
      collegeId: college1.id,
    });
    const freshToken = generateAccessToken({ id: freshAlumni.id, role: 'student', collegeId: college1.id });

    const res = await request(app)
      .post('/api/alumni/profile')
      .set('Authorization', `Bearer ${freshToken}`)
      .send({
        graduationYear: 2023,
        currentJobTitle: 'Associate Software Engineer',
        currentCompany: 'Microsoft',
        industry: 'Software',
        experienceYears: 2,
        skills: ['C#', '.NET', 'Azure'],
        mentorshipTopics: ['Software Engineering', 'Interview Preparation'],
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.currentCompany, 'Microsoft');
    assert.equal(res.body.data.verificationStatus, 'PENDING');
    newAlumniProfileId = res.body.data.id;
  });

  // Test 5: Alumni verification request works
  await t.test('5. Alumni verification request works and status can be queried', async () => {
    const res = await request(app)
      .get('/api/alumni/verification/status')
      .set('Authorization', `Bearer ${alumniToken2}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'PENDING');
  });

  // Test 6: Admin can verify alumni
  await t.test('6. Admin can verify alumni', async () => {
    const res = await request(app)
      .patch(`/api/admin/alumni/${alumniProfile2.id}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'VERIFIED' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.verificationStatus, 'VERIFIED');

    // Confirm it is now in discovery
    const disc = await request(app)
      .get('/api/alumni')
      .set('Authorization', `Bearer ${studentToken1}`);
    const found = disc.body.data.find((a) => a.id === alumniProfile2.id);
    assert.ok(found, 'Dave should now appear in discovery after verification');
  });

  // Test 7: Admin can reject verification
  await t.test('7. Admin can reject verification', async () => {
    const res = await request(app)
      .patch(`/api/admin/alumni/${newAlumniProfileId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'REJECTED', reason: 'USN could not be matched in college registry' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.verificationStatus, 'REJECTED');
    assert.equal(res.body.data.rejectionReason, 'USN could not be matched in college registry');
  });

  // Test 8: Rejection requires reason
  await t.test('8. Rejection requires reason', async () => {
    const res = await request(app)
      .patch(`/api/admin/alumni/${newAlumniProfileId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'REJECTED', reason: '' });

    assert.equal(res.status, 400);
    assert.ok(res.body.message.includes('reason'));
  });

  // Test 9: Admin verification creates AuditLog
  await t.test('9. Admin verification creates AuditLog', async () => {
    const audit = await AuditLog.findOne({
      where: {
        actorId: adminUser.id,
        action: 'ALUMNI_VERIFIED',
      },
    });
    assert.ok(audit, 'AuditLog entry must be created on alumni verification');
  });

  // Test 10: Alumni from another college cannot be discovered if college isolation applies
  await t.test('10. Alumni from another college cannot be discovered (college isolation)', async () => {
    const res = await request(app)
      .get('/api/alumni')
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(res.status, 200);
    const foreignFound = res.body.data.find((a) => a.id === foreignAlumniProfile.id);
    assert.equal(foreignFound, undefined, 'BMSCE alumni Eve must not appear to NIE student Alice');
  });

  // Test 11: Student can send mentorship request
  let testRequestId;
  await t.test('11. Student can send mentorship request', async () => {
    const res = await request(app)
      .post('/api/mentorship/requests')
      .set('Authorization', `Bearer ${studentToken1}`)
      .send({
        alumniProfileId: alumniProfile1.id,
        topic: 'Backend System Design',
        message: 'Hi Carol, I would love guidance on designing scalable distributed microservices.',
        goals: 'Prepare for campus placement backend technical rounds',
        preferredMode: 'CHAT',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.topic, 'Backend System Design');
    assert.equal(res.body.data.status, 'PENDING');
    testRequestId = res.body.data.id;
  });

  // Test 12: Student cannot send duplicate active request
  await t.test('12. Student cannot send duplicate active request', async () => {
    const res = await request(app)
      .post('/api/mentorship/requests')
      .set('Authorization', `Bearer ${studentToken1}`)
      .send({
        alumniProfileId: alumniProfile1.id,
        topic: 'Duplicate Request Test',
        message: 'Second request while first is pending',
      });

    assert.equal(res.status, 409, 'Duplicate request must be rejected with 409 Conflict');
  });

  // Test 13: Student cannot request suspended alumni
  await t.test('13. Student cannot request suspended alumni', async () => {
    // Suspend alumni 2
    await request(app)
      .patch(`/api/admin/alumni/${alumniProfile2.id}/suspend`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Policy violation' });

    const res = await request(app)
      .post('/api/mentorship/requests')
      .set('Authorization', `Bearer ${studentToken1}`)
      .send({
        alumniProfileId: alumniProfile2.id,
        topic: 'VLSI Guidance',
        message: 'Interested in semiconductor design',
      });

    assert.equal(res.status, 400);
    assert.ok(res.body.message.includes('suspended'));
  });

  // Test 14: Blocked users cannot send mentorship requests
  await t.test('14. Blocked users cannot send mentorship requests', async () => {
    // Student 2 blocks Alumni 1
    await Block.create({ blockerId: studentUser2.id, blockedId: alumniUser1.id });

    const res = await request(app)
      .post('/api/mentorship/requests')
      .set('Authorization', `Bearer ${studentToken2}`)
      .send({
        alumniProfileId: alumniProfile1.id,
        topic: 'Blocked test',
        message: 'Should fail',
      });

    assert.equal(res.status, 403, 'Blocked interaction must return 403 Forbidden');

    // Clean up block
    await Block.destroy({ where: { blockerId: studentUser2.id, blockedId: alumniUser1.id } });
  });

  // Test 15: Alumni can accept request
  await t.test('15. Alumni can accept request', async () => {
    const res = await request(app)
      .patch(`/api/mentorship/requests/${testRequestId}/accept`)
      .set('Authorization', `Bearer ${alumniToken1}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'ACCEPTED');
  });

  // Test 16: Alumni can decline request
  await t.test('16. Alumni can decline request', async () => {
    // Send a fresh request from Bob to Carol
    const req2 = await request(app)
      .post('/api/mentorship/requests')
      .set('Authorization', `Bearer ${studentToken2}`)
      .send({
        alumniProfileId: alumniProfile1.id,
        topic: 'Career Advice',
        message: 'Looking for advice',
      });
    const req2Id = req2.body.data.id;

    const res = await request(app)
      .patch(`/api/mentorship/requests/${req2Id}/decline`)
      .set('Authorization', `Bearer ${alumniToken1}`)
      .send({ reason: 'Capacity full this month' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'DECLINED');
    assert.equal(res.body.data.rejectionReason, 'Capacity full this month');
  });

  // Test 17: Student can cancel pending request
  await t.test('17. Student can cancel pending request', async () => {
    const req3 = await request(app)
      .post('/api/mentorship/requests')
      .set('Authorization', `Bearer ${studentToken2}`)
      .send({
        alumniProfileId: alumniProfile1.id,
        topic: 'Cancel Test',
        message: 'Will cancel this shortly',
      });
    const req3Id = req3.body.data.id;

    const res = await request(app)
      .patch(`/api/mentorship/requests/${req3Id}/cancel`)
      .set('Authorization', `Bearer ${studentToken2}`)
      .send({ reason: 'Schedule conflict' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'CANCELLED');
  });

  // Test 18: Invalid state transitions rejected
  await t.test('18. Invalid state transitions rejected', async () => {
    // Attempting to cancel an already ACCEPTED request testRequestId
    const res = await request(app)
      .patch(`/api/mentorship/requests/${testRequestId}/cancel`)
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(res.status, 400);
    assert.ok(res.body.message.includes('PENDING'));
  });

  // Test 19: Accepted mentorship can become active
  await t.test('19. Accepted mentorship can become active', async () => {
    const res = await request(app)
      .patch(`/api/mentorship/requests/${testRequestId}/start`)
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'ACTIVE');
  });

  // Test 20: Active mentorship can become completed
  await t.test('20. Active mentorship can become completed', async () => {
    const res = await request(app)
      .patch(`/api/mentorship/requests/${testRequestId}/complete`)
      .set('Authorization', `Bearer ${alumniToken1}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'COMPLETED');
  });

  // Test 21: Completed mentorship cannot become active again
  await t.test('21. Completed mentorship cannot become active again', async () => {
    const res = await request(app)
      .patch(`/api/mentorship/requests/${testRequestId}/start`)
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(res.status, 400);
  });

  // Test 22: Only participants can access mentorship details
  await t.test('22. Only participants can access mentorship details (IDOR protection)', async () => {
    const res = await request(app)
      .get(`/api/mentorship/requests/${testRequestId}`)
      .set('Authorization', `Bearer ${studentToken2}`); // Bob is not Alice or Carol

    assert.equal(res.status, 403);
  });

  // Test 23: Only participants can access mentorship chat
  await t.test('23. Only participants can access mentorship chat', async () => {
    const res = await request(app)
      .get(`/api/mentorship/requests/${testRequestId}/messages`)
      .set('Authorization', `Bearer ${studentToken2}`);

    assert.equal(res.status, 403);
  });

  // Set up an active mentorship for session and chat tests
  const activeReq = await MentorshipRequest.create({
    studentId: studentUser1.id,
    alumniId: alumniUser1.id,
    alumniProfileId: alumniProfile1.id,
    collegeId: college1.id,
    topic: 'Session & Chat Active Test',
    message: 'Active flow',
    status: 'ACTIVE',
  });

  // Test 24: Student can schedule session
  let testSessionId;
  await t.test('24. Student can schedule session', async () => {
    const res = await request(app)
      .post(`/api/mentorship/requests/${activeReq.id}/sessions`)
      .set('Authorization', `Bearer ${studentToken1}`)
      .send({
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        durationMinutes: 45,
        mode: 'VIDEO',
        meetingLink: 'https://meet.google.com/abc-defg-hij',
        notes: 'Discuss portfolio and mock interview',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.mode, 'VIDEO');
    testSessionId = res.body.data.id;
  });

  // Test 25: Alumni can view session
  await t.test('25. Alumni can view session', async () => {
    const res = await request(app)
      .get(`/api/mentorship/requests/${activeReq.id}/sessions`)
      .set('Authorization', `Bearer ${alumniToken1}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    const sess = res.body.data.find((s) => s.id === testSessionId);
    assert.ok(sess, 'Session should be visible to mentor Carol');
  });

  // Test 26: Unauthorized user cannot modify session
  await t.test('26. Unauthorized user cannot modify session', async () => {
    const res = await request(app)
      .patch(`/api/mentorship/sessions/${testSessionId}`)
      .set('Authorization', `Bearer ${studentToken2}`)
      .send({ status: 'CANCELLED' });

    assert.equal(res.status, 403);
  });

  // Test 27: Feedback only allowed after completion
  await t.test('27. Feedback only allowed after completion', async () => {
    const res = await request(app)
      .post(`/api/mentorship/requests/${activeReq.id}/feedback`)
      .set('Authorization', `Bearer ${studentToken1}`)
      .send({ rating: 5, review: 'Premature review' });

    assert.equal(res.status, 400);
    assert.ok(res.body.message.includes('COMPLETED'));
  });

  // Test 28: Duplicate feedback blocked
  await t.test('28. Duplicate feedback blocked (testRequestId is COMPLETED)', async () => {
    // First feedback
    const firstRes = await request(app)
      .post(`/api/mentorship/requests/${testRequestId}/feedback`)
      .set('Authorization', `Bearer ${studentToken1}`)
      .send({
        rating: 5,
        helpfulness: 5,
        communication: 5,
        review: 'Carol provided stellar guidance on distributed systems!',
      });
    assert.equal(firstRes.status, 201);

    // Duplicate feedback attempt
    const dupRes = await request(app)
      .post(`/api/mentorship/requests/${testRequestId}/feedback`)
      .set('Authorization', `Bearer ${studentToken1}`)
      .send({ rating: 4, review: 'Trying to review twice' });

    assert.equal(dupRes.status, 409);
  });

  // Test 29: Feedback updates reputation
  await t.test('29. Feedback updates reputation and awards +15 points', async () => {
    const repLog = await ReputationLog.findOne({
      where: {
        sourceId: testRequestId,
        actionType: 'mentorship_completed',
      },
    });
    assert.ok(repLog, 'ReputationLog should be created for completed mentorship');
    assert.equal(repLog.points, 15);
  });

  // Test 30: Alumni bookmark works
  await t.test('30. Alumni bookmark works', async () => {
    const res = await request(app)
      .post(`/api/alumni/${alumniProfile1.id}/bookmark`)
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
  });

  // Test 31: Duplicate bookmark blocked
  await t.test('31. Duplicate bookmark blocked (409 Conflict)', async () => {
    const res = await request(app)
      .post(`/api/alumni/${alumniProfile1.id}/bookmark`)
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(res.status, 409);
  });

  // Test 32: Saved alumni list works
  await t.test('32. Saved alumni list works', async () => {
    const res = await request(app)
      .get('/api/alumni/saved')
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    const saved = res.body.data.find((a) => a.id === alumniProfile1.id);
    assert.ok(saved, 'Carol should be in Alice saved alumni list');
  });

  // Test 33: Alumni availability filtering works
  await t.test('33. Alumni availability filtering works', async () => {
    const res = await request(app)
      .get('/api/alumni?availabilityStatus=AVAILABLE')
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(res.status, 200);
    res.body.data.forEach((a) => {
      assert.equal(a.availabilityStatus, 'AVAILABLE');
    });
  });

  // Test 34: Mentor search works
  await t.test('34. Mentor search works by company or title', async () => {
    const res = await request(app)
      .get('/api/alumni?search=Google')
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(res.status, 200);
    const googleAlumni = res.body.data.find((a) => a.currentCompany === 'Google');
    assert.ok(googleAlumni);
  });

  // Test 35: Mentor topic filtering works
  await t.test('35. Mentor topic filtering works', async () => {
    const res = await request(app)
      .get('/api/alumni?topic=System%20Design')
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.length > 0);
  });

  // Test 36: Matching score calculation works
  await t.test('36. Matching score calculation works deterministically', () => {
    const score = alumniService.calculateMatchScore(
      { departmentId: deptCSE.id, skills: ['Java', 'Cloud'] },
      { departmentId: deptCSE.id, skills: ['Java', 'Cloud'], mentorshipTopics: ['Cloud'], availabilityStatus: 'AVAILABLE', experienceYears: 5 }
    );
    assert.ok(score >= 70, `Score should be high for matching skills and dept, got ${score}`);
  });

  // Test 37: Suspended alumni removed from discovery
  await t.test('37. Suspended alumni removed from discovery', async () => {
    const res = await request(app)
      .get('/api/alumni')
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(res.status, 200);
    const suspendedFound = res.body.data.find((a) => a.id === alumniProfile2.id);
    assert.equal(suspendedFound, undefined, 'Suspended Dave should not appear in discovery');
  });

  // Test 38: Report works
  await t.test('38. Report alumni works', async () => {
    const res = await request(app)
      .post('/api/student/reports')
      .set('Authorization', `Bearer ${studentToken1}`)
      .send({
        userId: alumniUser1.id,
        category: 'spam',
        description: 'Testing report functionality',
      });

    assert.equal(res.status, 201);
  });

  // Test 39: Block prevents interaction
  await t.test('39. Block prevents messaging in mentorship channel', async () => {
    // Alice blocks Carol
    await Block.create({ blockerId: studentUser1.id, blockedId: alumniUser1.id });

    const res = await request(app)
      .post(`/api/mentorship/requests/${activeReq.id}/messages`)
      .set('Authorization', `Bearer ${studentToken1}`)
      .send({ message: 'Hello' });

    assert.equal(res.status, 403, 'Message between blocked users must be forbidden');

    // Unblock
    await Block.destroy({ where: { blockerId: studentUser1.id, blockedId: alumniUser1.id } });
  });

  // Test 40: Notifications created for important mentorship actions
  await t.test('40. Notifications created for important mentorship actions', async () => {
    const notifications = await Notification.findAll({
      where: { userId: alumniUser1.id },
    });
    assert.ok(notifications.length > 0, 'Alumnus Carol must have received notifications');
  });

  // Test 41: Admin can view mentorship statistics
  await t.test('41. Admin can view mentorship statistics', async () => {
    const res = await request(app)
      .get('/api/admin/alumni/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.totalAlumni >= 1);
    assert.ok(res.body.data.completedMentorships >= 1);
  });

  // Test 42: Cross-college access blocked
  await t.test('42. Cross-college access blocked for foreign student', async () => {
    const res = await request(app)
      .get(`/api/alumni/${alumniProfile1.id}`)
      .set('Authorization', `Bearer ${foreignToken}`);

    assert.equal(res.status, 403, 'Cross-college profile access should be 403');
  });

  // Test 43: IDOR protection
  await t.test('43. IDOR protection: Non-admin from foreign college cannot moderate alumni', async () => {
    const res = await request(app)
      .patch(`/api/admin/alumni/${alumniProfile1.id}/verify`)
      .set('Authorization', `Bearer ${foreignAdminToken}`)
      .send({ status: 'VERIFIED' });

    assert.equal(res.status, 403);
  });

  // Test 44: Rate limiting / spam prevention
  await t.test('44. Spam prevention: Empty topic or message is rejected', async () => {
    const res = await request(app)
      .post('/api/mentorship/requests')
      .set('Authorization', `Bearer ${studentToken1}`)
      .send({
        alumniProfileId: alumniProfile1.id,
        topic: '',
        message: '',
      });

    assert.equal(res.status, 400);
  });

  // Test 45: Full lifecycle integration test
  await t.test('45. Full lifecycle integration test: Verify -> Discover -> Request -> Accept -> Message -> Session -> Complete -> Feedback -> Reputation', async () => {
    // 1. Create a fresh alumnus
    const lifecycleAlumnus = await User.create({
      email: 'lifecycle.alumni@nie.ac.in',
      role: 'alumni',
      accountStatus: 'active',
      isAdminVerified: false,
      collegeId: college1.id,
    });
    const lcAlumniToken = generateAccessToken({ id: lifecycleAlumnus.id, role: 'alumni', collegeId: college1.id });

    const lcProfile = await AlumniProfile.create({
      userId: lifecycleAlumnus.id,
      collegeId: college1.id,
      departmentId: deptCSE.id,
      graduationYear: 2020,
      degree: 'B.E. Computer Science',
      currentJobTitle: 'Staff Engineer',
      currentCompany: 'Netflix',
      industry: 'Streaming & Media',
      experienceYears: 7,
      skills: ['Distributed Cache', 'Node.js', 'Go'],
      mentorshipTopics: ['System Architecture', 'Career Navigation'],
      availabilityStatus: 'AVAILABLE',
      verificationStatus: 'PENDING',
    });

    // 2. Admin verifies alumnus
    const verifyRes = await request(app)
      .patch(`/api/admin/alumni/${lcProfile.id}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'VERIFIED' });
    assert.equal(verifyRes.status, 200);

    // 3. Student discovers alumnus
    const discRes = await request(app)
      .get('/api/alumni?search=Netflix')
      .set('Authorization', `Bearer ${studentToken1}`);
    assert.equal(discRes.status, 200);
    const discovered = discRes.body.data.find((a) => a.id === lcProfile.id);
    assert.ok(discovered, 'Alumnus should be discovered');

    // 4. Student views profile
    const viewRes = await request(app)
      .get(`/api/alumni/${lcProfile.id}`)
      .set('Authorization', `Bearer ${studentToken1}`);
    assert.equal(viewRes.status, 200);
    assert.equal(viewRes.body.data.currentCompany, 'Netflix');

    // 5. Student sends mentorship request
    const reqRes = await request(app)
      .post('/api/mentorship/requests')
      .set('Authorization', `Bearer ${studentToken1}`)
      .send({
        alumniProfileId: lcProfile.id,
        topic: 'Distributed Caching at Scale',
        message: 'Looking for advice on Redis clustering and CDN cache invalidation.',
      });
    assert.equal(reqRes.status, 201);
    const lcRequestId = reqRes.body.data.id;

    // 6. Alumnus accepts request
    const acceptRes = await request(app)
      .patch(`/api/mentorship/requests/${lcRequestId}/accept`)
      .set('Authorization', `Bearer ${lcAlumniToken}`);
    assert.equal(acceptRes.status, 200);
    assert.equal(acceptRes.body.data.status, 'ACCEPTED');

    // 7. Transition to ACTIVE
    const startRes = await request(app)
      .patch(`/api/mentorship/requests/${lcRequestId}/start`)
      .set('Authorization', `Bearer ${studentToken1}`);
    assert.equal(startRes.status, 200);
    assert.equal(startRes.body.data.status, 'ACTIVE');

    // 8. Private messaging works between participants
    const msgRes = await request(app)
      .post(`/api/mentorship/requests/${lcRequestId}/messages`)
      .set('Authorization', `Bearer ${studentToken1}`)
      .send({ message: 'Hi, thanks for accepting my request!' });
    assert.equal(msgRes.status, 201);

    const getMsgRes = await request(app)
      .get(`/api/mentorship/requests/${lcRequestId}/messages`)
      .set('Authorization', `Bearer ${lcAlumniToken}`);
    assert.equal(getMsgRes.status, 200);
    assert.equal(getMsgRes.body.data.length, 1);

    // 9. Schedule session
    const sessRes = await request(app)
      .post(`/api/mentorship/requests/${lcRequestId}/sessions`)
      .set('Authorization', `Bearer ${lcAlumniToken}`)
      .send({
        scheduledAt: new Date(Date.now() + 100000).toISOString(),
        durationMinutes: 60,
        meetingLink: 'https://meet.google.com/net-flix-call',
      });
    assert.equal(sessRes.status, 201);
    const lcSessionId = sessRes.body.data.id;

    // 10. Complete session
    const compSessRes = await request(app)
      .patch(`/api/mentorship/sessions/${lcSessionId}`)
      .set('Authorization', `Bearer ${lcAlumniToken}`)
      .send({ status: 'COMPLETED' });
    assert.equal(compSessRes.status, 200);

    // 11. Complete mentorship
    const compReqRes = await request(app)
      .patch(`/api/mentorship/requests/${lcRequestId}/complete`)
      .set('Authorization', `Bearer ${lcAlumniToken}`);
    assert.equal(compReqRes.status, 200);
    assert.equal(compReqRes.body.data.status, 'COMPLETED');

    // 12. Student submits 5-star feedback
    const fbRes = await request(app)
      .post(`/api/mentorship/requests/${lcRequestId}/feedback`)
      .set('Authorization', `Bearer ${studentToken1}`)
      .send({
        rating: 5,
        helpfulness: 5,
        communication: 5,
        review: 'Incredible deep dive into caching strategies and system architecture!',
      });
    assert.equal(fbRes.status, 201);

    // 13. Verify Reputation Log
    const lcRep = await ReputationLog.findOne({
      where: {
        sourceId: lcRequestId,
        actionType: 'mentorship_completed',
      },
    });
    assert.ok(lcRep, 'Reputation must be awarded to Netflix mentor');
    assert.equal(lcRep.points, 15);
  });
});
