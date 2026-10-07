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
const { sequelize, User, StudentProfile, Connection, ReputationLog } = require('../src/models');
const { generateAccessToken } = require('../src/utils/jwt');
const collegeService = require('../src/services/collegeService');

test('CONNECTION SYSTEM TEST SUITE', async (t) => {
  let defaultCollege;
  let userA, profileA, tokenA;
  let userB, profileB, tokenB;
  let connectionId;

  await sequelize.sync({ force: true });
  defaultCollege = await collegeService.getDefaultCollege();

  userA = await User.create({
    email: 'userA@nie.ac.in',
    role: 'student',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: defaultCollege.id,
  });
  profileA = await StudentProfile.create({
    userId: userA.id,
    collegeId: defaultCollege.id,
    usn: '1NIE21CS010',
    fullName: 'Alice Johnson',
    college: defaultCollege.name,
    department: 'CSE',
  });
  tokenA = generateAccessToken({ id: userA.id, role: 'student', collegeId: defaultCollege.id });

  userB = await User.create({
    email: 'userB@nie.ac.in',
    role: 'student',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: defaultCollege.id,
  });
  profileB = await StudentProfile.create({
    userId: userB.id,
    collegeId: defaultCollege.id,
    usn: '1NIE21CS020',
    fullName: 'Bob Smith',
    college: defaultCollege.name,
    department: 'CSE',
  });
  tokenB = generateAccessToken({ id: userB.id, role: 'student', collegeId: defaultCollege.id });

  await t.test('1. Self-request prevention: Student cannot connect with themselves (400 Bad Request)', async () => {
    const res = await request(app)
      .post('/api/connections/request')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ receiverId: userA.id, message: 'Connecting with myself' });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /cannot connect with yourself/);
  });

  await t.test('2. Send request: Student A sends request to Student B with custom note', async () => {
    const res = await request(app)
      .post('/api/connections/request')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        receiverId: userB.id,
        message: 'Hi Bob, I noticed you know Python and would love to exchange skills!',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'success');
    assert.equal(res.body.data.status, 'pending');
    assert.equal(res.body.data.message, 'Hi Bob, I noticed you know Python and would love to exchange skills!');
    connectionId = res.body.data.id;
  });

  await t.test('3. Duplicate prevention: Sending duplicate request returns 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/connections/request')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ receiverId: userB.id });

    assert.equal(res.status, 409);
    assert.match(res.body.message, /already have a pending/);
  });

  await t.test('4. View pending requests: Student B sees incoming request; Student A sees outgoing request', async () => {
    const resB = await request(app)
      .get('/api/connections/requests')
      .set('Authorization', `Bearer ${tokenB}`);

    assert.equal(resB.status, 200);
    assert.equal(resB.body.data.received.length, 1);
    assert.equal(resB.body.data.received[0].requesterId, userA.id);

    const resA = await request(app)
      .get('/api/connections/requests')
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(resA.status, 200);
    assert.equal(resA.body.data.sent.length, 1);
    assert.equal(resA.body.data.sent[0].receiverId, userB.id);
  });

  await t.test('5. Accept request: Student B accepts request, status becomes accepted, connectionsCount and reputation updated', async () => {
    const res = await request(app)
      .patch(`/api/connections/${connectionId}/accept`)
      .set('Authorization', `Bearer ${tokenB}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'accepted');

    // Verify connectionsCount incremented on both profiles
    const [freshA, freshB] = await Promise.all([
      StudentProfile.findByPk(profileA.id),
      StudentProfile.findByPk(profileB.id),
    ]);

    assert.equal(freshA.connectionsCount, 1);
    assert.equal(freshB.connectionsCount, 1);
    assert.equal(freshA.reputationScore, 10);
    assert.equal(freshB.reputationScore, 10);
  });

  await t.test('6. View active connections: GET /api/connections returns active connection partner', async () => {
    const res = await request(app)
      .get('/api/connections')
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.connections.length, 1);
    assert.equal(res.body.data.connections[0].partner.userId, userB.id);
  });

  await t.test('7. Remove connection: Either student can remove connection, decrementing connectionsCount', async () => {
    const res = await request(app)
      .delete(`/api/connections/${connectionId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'removed');

    const [freshA, freshB] = await Promise.all([
      StudentProfile.findByPk(profileA.id),
      StudentProfile.findByPk(profileB.id),
    ]);

    assert.equal(freshA.connectionsCount, 0);
    assert.equal(freshB.connectionsCount, 0);
  });
});
