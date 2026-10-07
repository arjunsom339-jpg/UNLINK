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

test('SECURITY TEST SUITE', async (t) => {
  // 1. Missing JWT Token
  await t.test('1. Protected endpoint without Authorization header returns 401', async () => {
    const res = await request(app).get('/api/auth/me');

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /Authentication required/i);
  });

  // 2. Invalid / Corrupted JWT
  await t.test('2. Protected endpoint with malformed JWT returns 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer totally.invalid.token-gibberish');

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'TOKEN_INVALID');
  });

  // 3. Tampered JWT
  await t.test('3. Tampered JWT payload or signature returns 401', async () => {
    const validToken = seeded.studentTokens.accessToken;
    // Alter signature characters
    const tampered = validToken.slice(0, -6) + 'abc123';

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tampered}`);

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'TOKEN_INVALID');
  });

  // 4. Input Validation on Registration (Missing Required Fields)
  await t.test('4. Registration with invalid email or missing fields returns 400 with validation errors', async () => {
    const res = await request(app)
      .post('/api/auth/register/student')
      .send({
        fullName: 'A', // too short (< 2 chars)
        usn: '',        // empty
        email: 'not-an-email', // invalid email
        password: '123', // too short (< 8 chars)
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.errors);
    assert.ok(res.body.errors.length >= 3);
  });

  // 5. Cross-Role Login Attempt Protection
  await t.test('5. Student attempting to log into Admin login endpoint is rejected with 403', async () => {
    const res = await request(app)
      .post('/api/auth/login/admin')
      .send({
        email: 'verified.student@nie.ac.in',
        password: 'Password@123',
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'PORTAL_MISMATCH');
    assert.match(res.body.message, /Access denied/i);
  });
});
