'use strict';

/**
 * COMMUNITY MODULE TEST SUITE
 * Tests: Announcements, Q&A (questions + answers + vote toggle + accept),
 *        Polls (create, vote, duplicate vote prevention).
 */

process.env.NODE_ENV          = 'test';
process.env.DB_DIALECT        = 'sqlite';
process.env.DB_STORAGE        = ':memory:';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-32-chars-minimum-1234';
process.env.JWT_REFRESH_SECRET= 'test-refresh-secret-32-chars-minimum-1234';

const test   = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../app');

const {
  sequelize, User, StudentProfile,
  Announcement, Question, Answer, QuestionVote, Poll, PollVote,
} = require('../src/models');
const { generateAccessToken } = require('../src/utils/jwt');
const collegeService = require('../src/services/collegeService');

test('COMMUNITY MODULE TEST SUITE', async (t) => {
  await sequelize.sync({ force: true });

  // Seed skills + admin
  const skillService = require('../src/services/skillService');
  await skillService.seedDefaultSkills();
  const { bootstrapAdmin } = require('../src/scripts/bootstrapAdmin');
  await bootstrapAdmin();

  const defaultCollege = await collegeService.getDefaultCollege();

  // ── Users ─────────────────────────────────────────────────────────────────
  const userA = await User.create({
    email: 'community.a@test.com',
    role: 'student',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: defaultCollege.id,
  });
  await StudentProfile.create({
    userId: userA.id,
    collegeId: defaultCollege.id,
    usn: '1NIE21CM001',
    fullName: 'Alice Community',
    college: defaultCollege.name,
    department: 'CSE',
    semester: 4,
    profileVisibility: 'campus',
  });
  const tokenA = generateAccessToken({ id: userA.id, role: 'student', collegeId: defaultCollege.id });

  const userB = await User.create({
    email: 'community.b@test.com',
    role: 'student',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: defaultCollege.id,
  });
  await StudentProfile.create({
    userId: userB.id,
    collegeId: defaultCollege.id,
    usn: '1NIE21CM002',
    fullName: 'Bob Community',
    college: defaultCollege.name,
    department: 'ISE',
    semester: 5,
    profileVisibility: 'campus',
  });
  const tokenB = generateAccessToken({ id: userB.id, role: 'student', collegeId: defaultCollege.id });

  // ─────────────────────────────────────────────────────────────────────────
  // 1. ANNOUNCEMENTS
  // ─────────────────────────────────────────────────────────────────────────

  let annId;

  await t.test('1a. Seeded announcement is visible to students (pinned first)', async () => {
    const ann = await Announcement.create({
      authorId: userA.id,
      title: 'Test SIH Registration',
      content: 'Register for Smart India Hackathon 2026.',
      category: 'event',
      isPinned: true,
      isPublished: true,
      publishedAt: new Date(),
    });
    annId = ann.id;

    const res = await request(app)
      .get('/api/community/announcements')
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);
    assert.equal(res.body.data[0].id, annId, 'Pinned announcement should appear first');
  });

  await t.test('1b. Category filter returns only matching announcements', async () => {
    const res = await request(app)
      .get('/api/community/announcements?category=event')
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.every((a) => a.category === 'event'));
  });

  await t.test('1c. Unpublished announcements are NOT exposed to students', async () => {
    await Announcement.create({
      authorId: userA.id,
      title: 'Draft internal memo',
      content: 'Secret content.',
      category: 'general',
      isPublished: false,
      publishedAt: new Date(),
    });

    const res = await request(app)
      .get('/api/community/announcements')
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    const titles = res.body.data.map((a) => a.title);
    assert.ok(!titles.includes('Draft internal memo'), 'Unpublished announcement must not be returned');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Q&A — QUESTIONS
  // ─────────────────────────────────────────────────────────────────────────

  let questionId;

  await t.test('2a. Student can post a question with tags', async () => {
    const res = await request(app)
      .post('/api/community/questions')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        title: 'How does Dijkstra work on sparse graphs in C++?',
        body: 'Our lab uses 10^5 vertices. Standard matrix gives TLE. Suggestion?',
        subject: 'Algorithms',
        tags: 'DSA,C++,Graphs',
      });

    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.data.title, 'How does Dijkstra work on sparse graphs in C++?');
    assert.deepEqual(res.body.data.tags, ['DSA', 'C++', 'Graphs']);
    assert.equal(res.body.data.hasVoted, false);
    questionId = res.body.data.id;
  });

  await t.test('2b. Question title and body are required fields', async () => {
    const res = await request(app)
      .post('/api/community/questions')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ subject: 'OS' });

    assert.equal(res.status, 400);
  });

  await t.test('2c. Paginated questions list includes posted question with hasVoted=false', async () => {
    const res = await request(app)
      .get('/api/community/questions')
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.meta?.total >= 1, `Expected meta.total >= 1, got ${res.body.meta?.total}`);

    const found = res.body.data.find((q) => q.id === questionId);
    assert.ok(found, 'Posted question must appear in list');
    assert.equal(found.hasVoted, false, 'Unauthenticated vote should be false for both users initially');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Q&A — VOTING (toggle behaviour)
  // ─────────────────────────────────────────────────────────────────────────

  await t.test('3a. Student B upvotes question → voteCount becomes 1', async () => {
    const res = await request(app)
      .post(`/api/community/questions/${questionId}/vote`)
      .set('Authorization', `Bearer ${tokenB}`);

    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.voted, true);
    assert.equal(res.body.data.voteCount, 1);
  });

  await t.test('3b. Student B votes again → vote toggles off, voteCount back to 0', async () => {
    const res = await request(app)
      .post(`/api/community/questions/${questionId}/vote`)
      .set('Authorization', `Bearer ${tokenB}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.voted, false);
    assert.equal(res.body.data.voteCount, 0);
  });

  await t.test('3c. Question author cannot upvote their own question (400)', async () => {
    const res = await request(app)
      .post(`/api/community/questions/${questionId}/vote`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 400);
  });

  await t.test('3d. GET questions reflects per-user hasVoted correctly', async () => {
    // B votes
    await request(app)
      .post(`/api/community/questions/${questionId}/vote`)
      .set('Authorization', `Bearer ${tokenB}`);

    const [resA, resB] = await Promise.all([
      request(app).get('/api/community/questions').set('Authorization', `Bearer ${tokenA}`),
      request(app).get('/api/community/questions').set('Authorization', `Bearer ${tokenB}`),
    ]);

    const qForA = resA.body.data.find((q) => q.id === questionId);
    const qForB = resB.body.data.find((q) => q.id === questionId);

    assert.equal(qForA.hasVoted, false, 'Author A should show hasVoted=false');
    assert.equal(qForB.hasVoted, true,  'Student B should show hasVoted=true');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Q&A — ANSWERS
  // ─────────────────────────────────────────────────────────────────────────

  let answerId;

  await t.test('4a. Student B posts an answer → receives 201 and isAccepted=false', async () => {
    const res = await request(app)
      .post(`/api/community/questions/${questionId}/answers`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ body: 'Use priority_queue with adjacency list — O((V+E) log V). Easily within limits.' });

    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.isAccepted, false);
    answerId = res.body.data.id;
  });

  await t.test('4b. Empty answer body is rejected with 400', async () => {
    const res = await request(app)
      .post(`/api/community/questions/${questionId}/answers`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ body: '   ' });

    assert.equal(res.status, 400);
  });

  await t.test('4c. GET /questions/:id/answers returns question + answer list', async () => {
    const res = await request(app)
      .get(`/api/community/questions/${questionId}/answers`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.question?.id, questionId);
    assert.ok(Array.isArray(res.body.data.answers));
    assert.ok(res.body.data.answers.length >= 1);
  });

  await t.test('4d. answerCount on question increments after posting an answer', async () => {
    const res = await request(app)
      .get('/api/community/questions')
      .set('Authorization', `Bearer ${tokenA}`);

    const q = res.body.data.find((x) => x.id === questionId);
    assert.ok(q?.answerCount >= 1, `answerCount should be >= 1, got ${q?.answerCount}`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Q&A — ACCEPT ANSWER
  // ─────────────────────────────────────────────────────────────────────────

  await t.test('5a. Non-author (Student B) cannot accept an answer → 403', async () => {
    const res = await request(app)
      .patch(`/api/community/questions/${questionId}/answers/${answerId}/accept`)
      .set('Authorization', `Bearer ${tokenB}`);

    assert.equal(res.status, 403);
  });

  await t.test('5b. Question author (Student A) marks answer as accepted → question is resolved', async () => {
    const res = await request(app)
      .patch(`/api/community/questions/${questionId}/answers/${answerId}/accept`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.isAccepted, true);
  });

  await t.test('5c. Resolved question appears in resolved=true filter', async () => {
    const res = await request(app)
      .get('/api/community/questions?resolved=true')
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    const q = res.body.data.find((x) => x.id === questionId);
    assert.ok(q, 'Resolved question must appear under resolved=true filter');
    assert.equal(q.isResolved, true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 6. CAMPUS POLLS
  // ─────────────────────────────────────────────────────────────────────────

  let pollId;

  await t.test('6a. Student creates a poll with 3 options', async () => {
    const res = await request(app)
      .post('/api/community/polls')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        question: 'Should library hours be extended during exam month?',
        options: ['Yes, extend to midnight', 'Only during finals', 'Current 10 PM is fine'],
      });

    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.data.options.length, 3);
    assert.equal(res.body.data.totalVotes, 0);
    assert.equal(res.body.data.votedIndex, null);
    pollId = res.body.data.id;
  });

  await t.test('6b. Poll creation without a question is rejected (400)', async () => {
    const res = await request(app)
      .post('/api/community/polls')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ options: ['Yes', 'No'] });

    assert.equal(res.status, 400);
  });

  await t.test('6c. Poll creation with only 1 option is rejected (400)', async () => {
    const res = await request(app)
      .post('/api/community/polls')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ question: 'Single option poll?', options: ['Only one'] });

    assert.equal(res.status, 400);
  });

  await t.test('6d. Student B votes on poll → voteCount increments, votedIndex set', async () => {
    const res = await request(app)
      .post(`/api/community/polls/${pollId}/vote`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ optionIndex: 0 });

    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.votedIndex, 0);
    assert.equal(res.body.data.totalVotes, 1);
    assert.equal(res.body.data.options[0].votes, 1);
  });

  await t.test('6e. Duplicate vote by same user is rejected with 409', async () => {
    const res = await request(app)
      .post(`/api/community/polls/${pollId}/vote`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ optionIndex: 1 });

    assert.equal(res.status, 409, 'Second vote from same user must be rejected');
  });

  await t.test('6f. GET polls returns correct per-user votedIndex', async () => {
    const [resA, resB] = await Promise.all([
      request(app).get('/api/community/polls').set('Authorization', `Bearer ${tokenA}`),
      request(app).get('/api/community/polls').set('Authorization', `Bearer ${tokenB}`),
    ]);

    const pA = resA.body.data.find((p) => p.id === pollId);
    const pB = resB.body.data.find((p) => p.id === pollId);

    assert.equal(pA.votedIndex, null, 'User A has not voted — must be null');
    assert.equal(pB.votedIndex, 0,    'User B voted for option 0');
  });

  await t.test('6g. Out-of-range option index is rejected with 400', async () => {
    const res = await request(app)
      .post(`/api/community/polls/${pollId}/vote`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ optionIndex: 99 });

    assert.equal(res.status, 400);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 7. AUTH GUARD
  // ─────────────────────────────────────────────────────────────────────────

  await t.test('7. Community endpoints require authentication (401 without token)', async () => {
    const [r1, r2, r3] = await Promise.all([
      request(app).get('/api/community/announcements'),
      request(app).get('/api/community/questions'),
      request(app).get('/api/community/polls'),
    ]);
    assert.equal(r1.status, 401, 'Announcements: should require auth');
    assert.equal(r2.status, 401, 'Questions: should require auth');
    assert.equal(r3.status, 401, 'Polls: should require auth');
  });
});
