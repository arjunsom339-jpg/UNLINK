'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { initTestDb, getSeededData } = require('./setup');
let app;
let seeded;

test.before(async () => {
  seeded = await initTestDb();
  app = require('../app');
});

test('ROLE-BASED ACCESS CONTROL (RBAC) TEST SUITE', async (t) => {
  // 1. Student cannot access Teacher endpoints
  await t.test('1. Student attempting Teacher announcement endpoint receives 403', async () => {
    const res = await request(app)
      .post('/api/teacher/announcements')
      .set('Authorization', `Bearer ${seeded.studentTokens.accessToken}`)
      .send({
        title: 'Unauthorized Student Announcement',
        content: 'This should be blocked',
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'ROLE_FORBIDDEN');
  });

  // 2. Student cannot access Admin endpoints
  await t.test('2. Student attempting Admin dashboard receives 403', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${seeded.studentTokens.accessToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'ROLE_FORBIDDEN');
  });

  // 3. Teacher cannot access Student-only endpoints
  await t.test('3. Teacher attempting Student profile update receives 403', async () => {
    const res = await request(app)
      .patch('/api/student/profile')
      .set('Authorization', `Bearer ${seeded.teacherTokens.accessToken}`)
      .send({ bio: 'Attempted by faculty' });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'ROLE_FORBIDDEN');
  });

  // 4. Teacher cannot access Admin endpoints
  await t.test('4. Teacher attempting Admin users endpoint receives 403', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${seeded.teacherTokens.accessToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'ROLE_FORBIDDEN');
  });

  // 5. Admin can access Admin endpoints
  await t.test('5. Admin with valid token can access Admin dashboard and user management', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${seeded.adminTokens.accessToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.stats);
  });

  // 6. Admin can inspect verification requests and approve
  await t.test('6. Admin can view pending verifications and approve an account', async () => {
    const listRes = await request(app)
      .get('/api/admin/verifications?status=pending')
      .set('Authorization', `Bearer ${seeded.adminTokens.accessToken}`);

    assert.equal(listRes.status, 200);
    assert.ok(listRes.body.data.length > 0, 'Should have pending verifications from seed');

    const pendingReqId = listRes.body.data[0].id;

    const approveRes = await request(app)
      .patch(`/api/admin/verifications/${pendingReqId}/approve`)
      .set('Authorization', `Bearer ${seeded.adminTokens.accessToken}`)
      .send({ notes: 'Verified in college records' });

    assert.equal(approveRes.status, 200);
    assert.equal(approveRes.body.data.status, 'active');
  });

  // 7. Admin Moderation: Suspend User and Enforce Block
  await t.test('7. Admin can suspend a user account and revoke access immediately', async () => {
    const suspendRes = await request(app)
      .patch(`/api/admin/users/${seeded.studentUser.id}/status`)
      .set('Authorization', `Bearer ${seeded.adminTokens.accessToken}`)
      .send({ status: 'suspended', reason: 'Disciplinary check' });

    assert.equal(suspendRes.status, 200);
    assert.equal(suspendRes.body.data.accountStatus, 'suspended');

    // Access with this student's access token must now be blocked
    const studentAccessRes = await request(app)
      .get('/api/student/dashboard')
      .set('Authorization', `Bearer ${seeded.studentTokens.accessToken}`);

    assert.equal(studentAccessRes.status, 403);
    assert.equal(studentAccessRes.body.code, 'ACCOUNT_SUSPENDED');
  });
});
