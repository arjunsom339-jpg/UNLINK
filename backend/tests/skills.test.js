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
const { sequelize, User, StudentProfile, Skill, StudentSkill } = require('../src/models');
const { generateAccessToken } = require('../src/utils/jwt');
const skillService = require('../src/services/skillService');
const collegeService = require('../src/services/collegeService');

test('SKILLS SYSTEM TEST SUITE', async (t) => {
  let defaultCollege, studentUser, studentProfile, token;

  await sequelize.sync({ force: true });
  defaultCollege = await collegeService.getDefaultCollege();
  await skillService.seedDefaultSkills();

  studentUser = await User.create({
    email: 'skilltester@nie.ac.in',
    role: 'student',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: defaultCollege.id,
  });

  studentProfile = await StudentProfile.create({
    userId: studentUser.id,
    collegeId: defaultCollege.id,
    usn: '1NIE21CS099',
    fullName: 'Skill Tester',
    college: defaultCollege.name,
    department: 'Computer Science',
    semester: 4,
  });

  token = generateAccessToken({ id: studentUser.id, role: 'student', collegeId: defaultCollege.id });

  await t.test('1. Catalog: GET /api/skills returns categorized skills list', async () => {
    const res = await request(app).get('/api/skills');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 10);
    const hasJava = res.body.data.some((s) => s.name === 'Java' && s.category === 'Programming');
    assert.ok(hasJava);
  });

  await t.test('2. Catalog: Filter skills by category', async () => {
    const res = await request(app).get('/api/skills?category=Web%20Development');
    assert.equal(res.status, 200);
    assert.ok(res.body.data.every((s) => s.category === 'Web Development'));
    assert.ok(res.body.data.some((s) => s.name === 'React'));
  });

  await t.test('3. Add Skill: Student can add a known skill with proficiency', async () => {
    const res = await request(app)
      .post('/api/student/skills')
      .set('Authorization', `Bearer ${token}`)
      .send({
        skillName: 'Java',
        skillType: 'known',
        proficiency: 'advanced',
        canTeach: true,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'success');
    assert.equal(res.body.data.studentSkill.proficiency, 'advanced');
    assert.equal(res.body.data.studentSkill.canTeach, true);

    // Verify StudentProfile sync
    const freshProfile = await StudentProfile.findByPk(studentProfile.id);
    assert.ok(freshProfile.skillsKnown.includes('Java'));
  });

  await t.test('4. Add Skill: Updating existing skill updates proficiency without duplicate row', async () => {
    const res = await request(app)
      .post('/api/student/skills')
      .set('Authorization', `Bearer ${token}`)
      .send({
        skillName: 'Java',
        skillType: 'known',
        proficiency: 'intermediate',
        canTeach: true,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.studentSkill.proficiency, 'intermediate');

    const count = await StudentSkill.count({
      where: { studentProfileId: studentProfile.id, skillType: 'known' },
    });
    assert.equal(count, 1);
  });

  await t.test('5. Add Skill: Student can add a wanted learning goal', async () => {
    const res = await request(app)
      .post('/api/student/skills')
      .set('Authorization', `Bearer ${token}`)
      .send({
        skillName: 'React',
        skillType: 'wanted',
        proficiency: 'beginner',
      });

    assert.equal(res.status, 201);
    const freshProfile = await StudentProfile.findByPk(studentProfile.id);
    assert.ok(freshProfile.skillsWanted.includes('React'));
  });

  await t.test('6. List Skills: GET /api/student/skills returns known and wanted skills', async () => {
    const res = await request(app)
      .get('/api/student/skills')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data.known));
    assert.ok(Array.isArray(res.body.data.wanted));
    assert.equal(res.body.data.known.length, 1);
    assert.equal(res.body.data.wanted.length, 1);
  });

  await t.test('7. Remove Skill: Student can delete a skill', async () => {
    const listRes = await request(app)
      .get('/api/student/skills')
      .set('Authorization', `Bearer ${token}`);

    const skillId = listRes.body.data.wanted[0].id;
    const delRes = await request(app)
      .delete(`/api/student/skills/${skillId}`)
      .set('Authorization', `Bearer ${token}`);

    assert.equal(delRes.status, 200);
    const freshProfile = await StudentProfile.findByPk(studentProfile.id);
    assert.ok(!freshProfile.skillsWanted.includes('React'));
  });
});
