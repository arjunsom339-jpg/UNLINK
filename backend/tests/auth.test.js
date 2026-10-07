'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { initTestDb, getSeededData } = require('./setup');
let app;

test.before(async () => {
  await initTestDb();
  app = require('../app');
});

test('AUTHENTICATION TEST SUITE', async (t) => {
  // 1. Valid Student Registration
  await t.test('1. Valid student registration creates account with PENDING_VERIFICATION', async () => {
    const res = await request(app)
      .post('/api/auth/register/student')
      .send({
        fullName: 'New Student Test',
        usn: '1NIE21CS101',
        email: 'new.student101@nie.ac.in',
        password: 'Password@123',
        department: 'Computer Science',
        semester: 4,
        phone: '9876543210',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.accountStatus, 'pending');
    assert.equal(res.body.data.isPendingVerification, true);
    assert.equal(res.body.data.user.role, 'student');
  });

  // 2. Duplicate USN Rejection
  await t.test('2. Registration with duplicate USN is rejected with 409', async () => {
    const res = await request(app)
      .post('/api/auth/register/student')
      .send({
        fullName: 'Another Student',
        usn: '1NIE21CS101', // Already registered above
        email: 'another.student@nie.ac.in',
        password: 'Password@123',
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /USN/i);
  });

  // 3. Duplicate Email Rejection
  await t.test('3. Registration with duplicate email is rejected with 409', async () => {
    const res = await request(app)
      .post('/api/auth/register/student')
      .send({
        fullName: 'Another Student',
        usn: '1NIE21CS999',
        email: 'new.student101@nie.ac.in', // Already registered above
        password: 'Password@123',
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /email/i);
  });

  // 4. Valid Teacher Registration
  await t.test('4. Valid teacher registration creates account with PENDING_VERIFICATION', async () => {
    const res = await request(app)
      .post('/api/auth/register/teacher')
      .send({
        fullName: 'Dr. Faculty Member',
        teacherId: 'TCH-CS-202',
        email: 'faculty.202@nie.ac.in',
        password: 'Password@123',
        department: 'Computer Science',
        designation: 'Associate Professor',
        phone: '9876543211',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.accountStatus, 'pending');
    assert.equal(res.body.data.user.role, 'teacher');
  });

  // 5. Duplicate Teacher ID Rejection
  await t.test('5. Registration with duplicate Teacher ID is rejected with 409', async () => {
    const res = await request(app)
      .post('/api/auth/register/teacher')
      .send({
        fullName: 'Duplicate Faculty',
        teacherId: 'TCH-CS-202', // Duplicate
        email: 'dup.faculty@nie.ac.in',
        password: 'Password@123',
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /Teacher ID/i);
  });

  // 6. Invalid Credentials Rejection
  await t.test('6. Login with invalid password returns 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'verified.student@nie.ac.in',
        password: 'WrongPassword999',
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  // 7. Successful Verified Login
  await t.test('7. Verified student login succeeds with access and refresh tokens', async () => {
    const res = await request(app)
      .post('/api/auth/login/student')
      .send({
        email: 'verified.student@nie.ac.in',
        password: 'Password@123',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.accessToken);
    assert.ok(res.body.data.refreshToken);
    assert.equal(res.body.data.user.role, 'student');
  });

  // 8. Pending Verification Account Blocking
  await t.test('8. Account pending verification is blocked from logging in with 403', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'pending.student@nie.ac.in',
        password: 'Password@123',
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'ACCOUNT_PENDING_VERIFICATION');
    assert.equal(res.body.data?.isPendingVerification, true);
  });

  // 9. Suspended Account Blocking
  await t.test('9. Suspended account login is blocked with 403', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'suspended.student@nie.ac.in',
        password: 'Password@123',
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'ACCOUNT_SUSPENDED');
  });

  // 10. Banned Account Blocking
  await t.test('10. Banned account login is blocked with 403', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'banned.student@nie.ac.in',
        password: 'Password@123',
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'ACCOUNT_BANNED');
  });

  // 11. Refresh Token Rotation
  await t.test('11. Refresh token endpoint rotates refresh token securely', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login/student')
      .send({
        email: 'verified.student@nie.ac.in',
        password: 'Password@123',
      });

    const oldRefreshToken = loginRes.body.data.refreshToken;

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: oldRefreshToken });

    assert.equal(refreshRes.status, 200);
    assert.ok(refreshRes.body.data.accessToken);
    assert.ok(refreshRes.body.data.refreshToken);
    assert.notEqual(refreshRes.body.data.refreshToken, oldRefreshToken);

    // Reusing the old refresh token must be rejected (replay attack defense)
    const reuseRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: oldRefreshToken });

    assert.equal(reuseRes.status, 401);
  });

  // 12. Logout Session Invalidation
  await t.test('12. Logout invalidates session and revokes refresh token', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login/student')
      .send({
        email: 'verified.student@nie.ac.in',
        password: 'Password@123',
      });

    const tokenToRevoke = loginRes.body.data.refreshToken;

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken: tokenToRevoke });

    assert.equal(logoutRes.status, 200);

    // Refreshing with revoked token must fail
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: tokenToRevoke });

    assert.equal(refreshRes.status, 401);
  });

  // 13. Password Reset Flow
  await t.test('13. Password reset generates token and enables setting new password', async () => {
    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'verified.student@nie.ac.in' });

    assert.equal(forgotRes.status, 200);
    const resetToken = forgotRes.body.data?.resetToken;
    assert.ok(resetToken, 'Reset token generated in test/dev environment');

    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: resetToken,
        password: 'NewStrongPassword@2026',
      });

    assert.equal(resetRes.status, 200);

    // Old password must fail
    const oldLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'verified.student@nie.ac.in',
        password: 'Password@123',
      });
    assert.equal(oldLoginRes.status, 401);

    // New password must succeed
    const newLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'verified.student@nie.ac.in',
        password: 'NewStrongPassword@2026',
      });
    assert.equal(newLoginRes.status, 200);
  });
});
