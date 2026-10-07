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
const { sequelize, User, StudentProfile, Connection } = require('../src/models');
const { generateAccessToken } = require('../src/utils/jwt');
const collegeService = require('../src/services/collegeService');

test('STUDENT PROFILE & PRIVACY TEST SUITE', async (t) => {
  let defaultCollege;
  let studentUser1, studentProfile1, token1;
  let studentUser2, studentProfile2, token2;
  let studentUser3, studentProfile3, token3;

  await sequelize.sync({ force: true });
  defaultCollege = await collegeService.getDefaultCollege();

  // Student 1 (active)
  studentUser1 = await User.create({
    email: 'profile1@nie.ac.in',
    role: 'student',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: defaultCollege.id,
  });
  studentProfile1 = await StudentProfile.create({
    userId: studentUser1.id,
    collegeId: defaultCollege.id,
    usn: '1NIE21CS001',
    fullName: 'Rahul Sharma',
    college: defaultCollege.name,
    department: 'Computer Science & Engineering',
    semester: 6,
    bio: 'Full stack student developer building React apps',
    phone: '9876543210',
    profileVisibility: 'campus',
    showPhone: false,
    interests: ['Web Development', 'AI'],
    projects: [{ title: 'Campus Portal', tech: 'React, Node' }],
  });
  token1 = generateAccessToken({ id: studentUser1.id, role: 'student', collegeId: defaultCollege.id });

  // Student 2 (active, visibility: connections)
  studentUser2 = await User.create({
    email: 'profile2@nie.ac.in',
    role: 'student',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: defaultCollege.id,
  });
  studentProfile2 = await StudentProfile.create({
    userId: studentUser2.id,
    collegeId: defaultCollege.id,
    usn: '1NIE21CS002',
    fullName: 'Ananya Deshmukh',
    college: defaultCollege.name,
    department: 'Computer Science & Engineering',
    semester: 6,
    bio: 'Competitive programmer and Python enthusiast',
    phone: '9876543211',
    profileVisibility: 'connections',
    showPhone: true,
    interests: ['DSA', 'Python'],
    projects: [{ title: 'Algorithm Visualizer', tech: 'Python' }],
  });
  token2 = generateAccessToken({ id: studentUser2.id, role: 'student', collegeId: defaultCollege.id });

  await t.test('1. Student can view their own profile with full details', async () => {
    const res = await request(app)
      .get('/api/student/profile')
      .set('Authorization', `Bearer ${token1}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'success');
    assert.equal(res.body.data.usn, '1NIE21CS001');
    assert.equal(res.body.data.fullName, 'Rahul Sharma');
    assert.equal(res.body.data.bio, 'Full stack student developer building React apps');
    assert.equal(res.body.data.department, 'Computer Science & Engineering');
  });

  await t.test('2. Student can update allowed fields (bio, semester, availability, projects)', async () => {
    const res = await request(app)
      .patch('/api/student/profile')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        bio: 'Updated bio: specializing in distributed systems and cloud',
        semester: 7,
        availability: 'weekends',
        interests: ['Distributed Systems', 'Cloud'],
        projects: [{ title: 'Cloud Sync Engine', tech: 'Go, Docker' }],
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'success');
    assert.equal(res.body.data.bio, 'Updated bio: specializing in distributed systems and cloud');
    assert.equal(res.body.data.semester, 7);
    assert.equal(res.body.data.availability, 'weekends');
    assert.equal(res.body.data.projects.length, 1);
  });

  await t.test('3. Student cannot modify academic USN (rejected with 403 Forbidden)', async () => {
    const res = await request(app)
      .patch('/api/student/profile')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        usn: '1NIE21CS999_TAMPERED',
      });

    assert.equal(res.status, 403);
    assert.match(res.body.message, /Academic identity fields.*cannot be edited/);

    // Verify USN remained unchanged in database
    const fresh = await StudentProfile.findByPk(studentProfile1.id);
    assert.equal(fresh.usn, '1NIE21CS001');
  });

  await t.test('4. Privacy: Viewing student with connections-only visibility when not connected masks sensitive info', async () => {
    const res = await request(app)
      .get(`/api/student/profile/${studentProfile2.id}`)
      .set('Authorization', `Bearer ${token1}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.isRestricted, true);
    assert.equal(res.body.data.fullName, 'Ananya Deshmukh');
    // Sensitive fields are masked/hidden
    assert.equal(res.body.data.bio, undefined);
    assert.equal(res.body.data.phone, undefined);
    assert.equal(res.body.data.projects, undefined);
    assert.match(res.body.data.restrictionReason, /Connections Only/);
  });

  await t.test('5. Privacy: When connection is accepted, student can view full connections-only profile', async () => {
    // Establish accepted connection between student1 and student2
    await Connection.create({
      requesterId: studentUser1.id,
      receiverId: studentUser2.id,
      status: 'accepted',
    });

    const res = await request(app)
      .get(`/api/student/profile/${studentProfile2.id}`)
      .set('Authorization', `Bearer ${token1}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.isRestricted, false);
    assert.equal(res.body.data.bio, 'Competitive programmer and Python enthusiast');
    assert.equal(res.body.data.connectionStatus, 'accepted');
  });
});
