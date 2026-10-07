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
const { sequelize, User, StudentProfile, Skill, StudentSkill, Project, Hackathon } = require('../src/models');
const { generateAccessToken } = require('../src/utils/jwt');
const skillService = require('../src/services/skillService');
const collegeService = require('../src/services/collegeService');

test('LEARN & CONNECT + SKILL EXCHANGE TEST SUITE', async (t) => {
  let defaultCollege;
  let userStudentA, profileA, tokenA;
  let userStudentB, profileB, tokenB;
  let skillJava, skillReact;

  await sequelize.sync({ force: true });
  defaultCollege = await collegeService.getDefaultCollege();
  await skillService.seedDefaultSkills();

  skillJava = await Skill.findOne({ where: { name: 'Java' } });
  skillReact = await Skill.findOne({ where: { name: 'React' } });

  // Student A: KNOWS Java, WANTS React
  userStudentA = await User.create({
    email: 'studentA@nie.ac.in',
    role: 'student',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: defaultCollege.id,
  });
  profileA = await StudentProfile.create({
    userId: userStudentA.id,
    collegeId: defaultCollege.id,
    usn: '1NIE21CS111',
    fullName: 'Arjun Das',
    college: defaultCollege.name,
    department: 'Computer Science & Engineering',
    semester: 5,
    interests: ['Backend', 'Cloud'],
    skillsKnown: ['Java'],
    skillsWanted: ['React'],
  });
  await StudentSkill.create({
    studentProfileId: profileA.id,
    skillId: skillJava.id,
    skillType: 'known',
    proficiency: 'advanced',
    canTeach: true,
  });
  await StudentSkill.create({
    studentProfileId: profileA.id,
    skillId: skillReact.id,
    skillType: 'wanted',
    proficiency: 'beginner',
  });
  tokenA = generateAccessToken({ id: userStudentA.id, role: 'student', collegeId: defaultCollege.id });

  // Student B: KNOWS React, WANTS Java (Perfect reciprocal pair!)
  userStudentB = await User.create({
    email: 'studentB@nie.ac.in',
    role: 'student',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: defaultCollege.id,
  });
  profileB = await StudentProfile.create({
    userId: userStudentB.id,
    collegeId: defaultCollege.id,
    usn: '1NIE21CS222',
    fullName: 'Sneha Roy',
    college: defaultCollege.name,
    department: 'Computer Science & Engineering',
    semester: 5,
    interests: ['Frontend', 'Backend'],
    skillsKnown: ['React'],
    skillsWanted: ['Java'],
  });
  await StudentSkill.create({
    studentProfileId: profileB.id,
    skillId: skillReact.id,
    skillType: 'known',
    proficiency: 'advanced',
    canTeach: true,
  });
  await StudentSkill.create({
    studentProfileId: profileB.id,
    skillId: skillJava.id,
    skillType: 'wanted',
    proficiency: 'beginner',
  });
  tokenB = generateAccessToken({ id: userStudentB.id, role: 'student', collegeId: defaultCollege.id });

  await t.test('1. Discovery: Search students by known skill (e.g., "Java")', async () => {
    const res = await request(app)
      .get('/api/student/learn-connect/discover?skill=Java')
      .set('Authorization', `Bearer ${tokenB}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.length >= 1);
    const foundA = res.body.data.find((s) => s.fullName === 'Arjun Das');
    assert.ok(foundA);
    assert.equal(foundA.department, 'Computer Science & Engineering');
  });

  await t.test('2. Discovery: Never returns the searching student themselves', async () => {
    const res = await request(app)
      .get('/api/student/learn-connect/discover')
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    const hasSelf = res.body.data.some((s) => s.userId === userStudentA.id);
    assert.equal(hasSelf, false);
  });

  await t.test('3. Learn From: Student A searches students who can teach "React"', async () => {
    const res = await request(app)
      .get('/api/student/learn-connect/learn-from?skill=React')
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.length >= 1);
    const peer = res.body.data.find((m) => m.fullName === 'Sneha Roy');
    assert.ok(peer);
    assert.equal(peer.matchedSkill.name, 'React');
    assert.equal(peer.matchedSkill.canTeach, true);
  });

  await t.test('4. Skill Exchange: Algorithm identifies two-way reciprocal match with high score and "Strong Match" label', async () => {
    const res = await request(app)
      .get('/api/student/learn-connect/matches')
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.length >= 1);

    const match = res.body.data.find((m) => m.student.fullName === 'Sneha Roy');
    assert.ok(match, 'Sneha Roy should be matched with Arjun Das');
    assert.equal(match.isReciprocal, true);
    assert.ok(match.matchScore >= 80, `Expected score >= 80, got ${match.matchScore}`);
    assert.equal(match.matchLabel, 'Strong Match');
    assert.ok(match.iLearn.includes('react'));
    assert.ok(match.theyLearn.includes('java'));
  });

  await t.test('5. Project Collaboration: Student creates project opportunity and peer requests to join', async () => {
    // Student A creates project
    const createRes = await request(app)
      .post('/api/student/projects')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        title: 'Open Campus Navigation App',
        description: 'Interactive map and indoor navigation app for university labs and halls',
        requiredSkills: ['React', 'Leaflet', 'Node.js'],
        teammatesRequired: 3,
        category: 'Web & Mobile',
      });

    assert.equal(createRes.status, 201);
    const projectId = createRes.body.data.id;

    // Student B requests to join
    const joinRes = await request(app)
      .post(`/api/student/projects/${projectId}/join`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        role: 'Frontend Developer',
        message: 'I have strong experience in React and would love to build the campus map UI!',
      });

    assert.equal(joinRes.status, 201);
    assert.equal(joinRes.body.data.status, 'pending');
    assert.equal(joinRes.body.data.role, 'Frontend Developer');
  });

  await t.test('6. Hackathon Teams: Student creates hackathon listing and peer requests to join', async () => {
    const createRes = await request(app)
      .post('/api/student/hackathons')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        title: 'SIH 2026 - Smart City AI Project',
        description: 'Building traffic analysis pipeline using computer vision and edge computing',
        requiredSkills: ['Python', 'OpenCV', 'React'],
        teamSize: 4,
        lookingFor: 'Backend & Edge Computing Specialist',
      });

    assert.equal(createRes.status, 201);
    const hackathonId = createRes.body.data.id;

    const joinRes = await request(app)
      .post(`/api/student/hackathons/${hackathonId}/join`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        role: 'Backend Specialist',
        message: 'I am proficient in backend services and edge deployments.',
      });

    assert.equal(joinRes.status, 201);
    assert.equal(joinRes.body.data.status, 'pending');
  });
});
