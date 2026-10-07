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
  Connection,
  Block,
  Report,
  Project,
  ProjectMember,
  Hackathon,
  HackathonMember,
} = require('../src/models');
const { generateAccessToken } = require('../src/utils/jwt');
const collegeService = require('../src/services/collegeService');

test('SAFETY, MODERATION & COLLABORATION MANAGEMENT TEST SUITE', async (t) => {
  let defaultCollege;
  let userA, profileA, tokenA;
  let userB, profileB, tokenB;
  let userC, profileC, tokenC;

  await sequelize.sync({ force: true });
  defaultCollege = await collegeService.getDefaultCollege();

  // Student A
  userA = await User.create({
    email: 'studentA@nie.ac.in',
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
    bio: 'Security researcher and backend engineer',
    profileVisibility: 'campus',
  });
  tokenA = generateAccessToken({ id: userA.id, role: 'student', collegeId: defaultCollege.id });

  // Student B
  userB = await User.create({
    email: 'studentB@nie.ac.in',
    role: 'student',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: defaultCollege.id,
  });
  profileB = await StudentProfile.create({
    userId: userB.id,
    collegeId: defaultCollege.id,
    usn: '1NIE21CS102',
    fullName: 'Bob Martin',
    college: defaultCollege.name,
    department: 'Computer Science & Engineering',
    semester: 6,
    bio: 'Mobile and React Native enthusiast',
    profileVisibility: 'campus',
  });
  tokenB = generateAccessToken({ id: userB.id, role: 'student', collegeId: defaultCollege.id });

  // Student C
  userC = await User.create({
    email: 'studentC@nie.ac.in',
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
    department: 'Information Science & Engineering',
    semester: 4,
    bio: 'Exploring cloud and microservices',
    profileVisibility: 'campus',
  });
  tokenC = generateAccessToken({ id: userC.id, role: 'student', collegeId: defaultCollege.id });

  // ── BLOCKING TESTS ─────────────────────────────────────────────────────────

  await t.test('1. Student A can block Student B', async () => {
    const res = await request(app)
      .post('/api/student/blocks')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ userId: userB.id, reason: 'Spamming direct connection notes' });

    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'success');
    assert.equal(res.body.data.blockedId, userB.id);
    assert.equal(res.body.data.blockerId, userA.id);
  });

  await t.test('2. Self-blocking is rejected with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/student/blocks')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ userId: userA.id });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /cannot block yourself/i);
  });

  await t.test('3. Duplicate blocking is rejected with 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/student/blocks')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ userId: userB.id });

    assert.equal(res.status, 409);
    assert.match(res.body.message, /already blocked/i);
  });

  await t.test('4. Blocked students appear in GET /api/student/blocks', async () => {
    const res = await request(app)
      .get('/api/student/blocks')
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].blockedId, userB.id);
    assert.equal(res.body.data[0].blockedUser.studentProfile.fullName, 'Bob Martin');
  });

  await t.test('5. Blocked student is excluded from discovery search', async () => {
    const res = await request(app)
      .get('/api/student/learn-connect/discover')
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    const discoveredIds = res.body.data.map((s) => s.userId);
    // Student B must NOT be in results for Student A
    assert.equal(discoveredIds.includes(userB.id), false);
    // Student C should be present
    assert.equal(discoveredIds.includes(userC.id), true);
  });

  await t.test('6. Connection request between blocked students is rejected with 403 Forbidden', async () => {
    // Student B attempts to connect with Student A (who blocked B)
    const res = await request(app)
      .post('/api/connections/request')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ receiverId: userA.id, message: 'Hey let us collaborate!' });

    assert.equal(res.status, 403);
    assert.match(res.body.message, /Cannot connect with this user/i);
  });

  await t.test('7. Student A can unblock Student B', async () => {
    const res = await request(app)
      .delete(`/api/student/blocks/${userB.id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    assert.match(res.body.message, /unblocked successfully/i);

    // Verify block was removed from database
    const remaining = await Block.findOne({ where: { blockerId: userA.id, blockedId: userB.id } });
    assert.equal(remaining, null);
  });

  // ── CONNECTION CANCEL TESTS ────────────────────────────────────────────────

  let pendingConnId;

  await t.test('8. Student A sends connection request to Student C', async () => {
    const res = await request(app)
      .post('/api/connections/request')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ receiverId: userC.id, message: 'Would love to exchange notes on cloud!' });

    assert.equal(res.status, 201);
    pendingConnId = res.body.data.id;
    assert.ok(pendingConnId);
  });

  await t.test('9. Receiver (Student C) cannot use cancel endpoint (only requester can)', async () => {
    const res = await request(app)
      .delete(`/api/connections/${pendingConnId}/cancel`)
      .set('Authorization', `Bearer ${tokenC}`);

    assert.equal(res.status, 403);
    assert.match(res.body.message, /only cancel requests you have initiated/i);
  });

  await t.test('10. Requester (Student A) cancels pending connection request', async () => {
    const res = await request(app)
      .delete(`/api/connections/${pendingConnId}/cancel`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    assert.match(res.body.message, /cancelled successfully/i);

    const fresh = await Connection.findByPk(pendingConnId);
    assert.equal(fresh.status, 'cancelled');
  });

  // ── REPORTING TESTS ────────────────────────────────────────────────────────

  await t.test('11. Student A can report Student B for inappropriate behavior', async () => {
    const res = await request(app)
      .post('/api/student/reports')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        userId: userB.id,
        category: 'spam',
        description: 'Repeatedly posting promotional links in project chats.',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'success');
    assert.equal(res.body.data.category, 'spam');
    assert.equal(res.body.data.status, 'pending');
  });

  await t.test('12. Reporting oneself is rejected with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/student/reports')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        userId: userA.id,
        category: 'harassment',
      });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /cannot report yourself/i);
  });

  await t.test('13. Report with invalid category is rejected with 400', async () => {
    const res = await request(app)
      .post('/api/student/reports')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        userId: userC.id,
        category: 'not_a_valid_category',
      });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /Category must be one of/i);
  });

  await t.test('14. Duplicate pending report from same reporter for same user returns 409', async () => {
    const res = await request(app)
      .post('/api/student/reports')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        userId: userB.id,
        category: 'harassment',
      });

    assert.equal(res.status, 409);
    assert.match(res.body.message, /already have a pending report/i);
  });

  // ── PROJECT & HACKATHON MEMBER MANAGEMENT TESTS ────────────────────────────

  let projectObj, projectMemberObj;

  await t.test('15. Student A creates project and Student B requests to join', async () => {
    // Student A creates project
    const projRes = await request(app)
      .post('/api/student/projects')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        title: 'Open Source Security Scanner',
        description: 'Building automated vulnerability scanner for collegiate repos.',
        requiredSkills: ['Node.js', 'Docker', 'OWASP'],
        teammatesRequired: 3,
      });

    assert.equal(projRes.status, 201);
    projectObj = projRes.body.data;

    // Student B requests to join
    const joinRes = await request(app)
      .post(`/api/student/projects/${projectObj.id}/join`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        role: 'Vulnerability Analyst',
        message: 'Experienced with Docker and SAST tools.',
      });

    assert.equal(joinRes.status, 201);
    projectMemberObj = joinRes.body.data;
    assert.equal(projectMemberObj.status, 'pending');
  });

  await t.test('16. Non-creator (Student C) cannot accept project join request (403)', async () => {
    const res = await request(app)
      .patch(`/api/student/projects/${projectObj.id}/members/${projectMemberObj.id}/accept`)
      .set('Authorization', `Bearer ${tokenC}`);

    assert.equal(res.status, 403);
    assert.match(res.body.message, /Only the project creator can manage members/i);
  });

  await t.test('17. Project creator (Student A) accepts Student B join request', async () => {
    const res = await request(app)
      .patch(`/api/student/projects/${projectObj.id}/members/${projectMemberObj.id}/accept`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'accepted');

    // Verify team size was incremented
    const freshProj = await Project.findByPk(projectObj.id);
    assert.equal(freshProj.currentTeamSize, 2);
  });

  let hackathonObj, hackathonMemberObj;

  await t.test('18. Student A creates hackathon listing and Student C requests to join', async () => {
    const hackRes = await request(app)
      .post('/api/student/hackathons')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        title: 'Smart India Hackathon — Team CyberShield',
        description: 'National hackathon track on Cyber Security and Campus Protection.',
        requiredSkills: ['Python', 'Network Security'],
        teamSize: 4,
        lookingFor: 'Frontend & UI Specialist',
      });

    assert.equal(hackRes.status, 201);
    hackathonObj = hackRes.body.data;

    const joinRes = await request(app)
      .post(`/api/student/hackathons/${hackathonObj.id}/join`)
      .set('Authorization', `Bearer ${tokenC}`)
      .send({
        role: 'UI Designer',
        message: 'Can craft high fidelity mockups and dashboard components.',
      });

    assert.equal(joinRes.status, 201);
    hackathonMemberObj = joinRes.body.data;
    assert.equal(hackathonMemberObj.status, 'pending');
  });

  await t.test('19. Hackathon lead (Student A) declines Student C join request', async () => {
    const res = await request(app)
      .patch(`/api/student/hackathons/${hackathonObj.id}/members/${hackathonMemberObj.id}/reject`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'rejected');

    const freshMem = await HackathonMember.findByPk(hackathonMemberObj.id);
    assert.equal(freshMem.status, 'rejected');
  });
});
