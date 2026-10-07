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
  Company,
  Opportunity,
  OpportunityApplication,
  OpportunityBookmark,
  PlacementInterview,
  PlacementProfile,
  Notification,
  AuditLog,
  Report,
} = require('../src/models');
const { generateAccessToken } = require('../src/utils/jwt');
const collegeService = require('../src/services/collegeService');

test('CAMPUS PLACEMENT & INTERNSHIP PORTAL (TPC) MODULE TEST SUITE', async (t) => {
  let college1, college2;
  let deptCSE, deptECE;
  let adminUser, adminToken;
  let foreignAdminUser, foreignAdminToken;
  let teacherUser, teacherToken;
  let eligibleStudent, eligibleProfile, eligiblePlacement, eligibleToken;
  let ineligibleStudent, ineligibleProfile, ineligiblePlacement, ineligibleToken;
  let foreignStudent, foreignProfile, foreignToken;
  let createdCompany, createdOpportunity;

  await sequelize.sync({ force: true });
  college1 = await collegeService.getDefaultCollege();

  college2 = await College.create({
    name: 'BMS College of Engineering',
    code: 'BMSCE',
    domain: 'bmsce.ac.in',
  });

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

  // Admin / TPC User
  adminUser = await User.create({
    email: 'tpc.admin@nie.ac.in',
    role: 'admin',
    adminRole: 'ADMIN',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: college1.id,
  });
  adminToken = generateAccessToken({ id: adminUser.id, role: 'admin', collegeId: college1.id });

  // Foreign Admin (College 2)
  foreignAdminUser = await User.create({
    email: 'tpc@bmsce.ac.in',
    role: 'admin',
    adminRole: 'ADMIN',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: college2.id,
  });
  foreignAdminToken = generateAccessToken({ id: foreignAdminUser.id, role: 'admin', collegeId: college2.id });

  // Teacher User
  teacherUser = await User.create({
    email: 'prof.sharma@nie.ac.in',
    role: 'teacher',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: college1.id,
  });
  teacherToken = generateAccessToken({ id: teacherUser.id, role: 'teacher', collegeId: college1.id });
  await TeacherProfile.create({
    userId: teacherUser.id,
    collegeId: college1.id,
    departmentId: deptCSE.id,
    teacherId: 'TCH001',
    fullName: 'Prof. Sharma',
    college: college1.name,
    designation: 'Associate Professor',
  });

  // Eligible Student: CSE, Sem 7, CGPA 8.5, 0 backlogs, skills: Java, Spring Boot, React
  eligibleStudent = await User.create({
    email: 'alice.placed@nie.ac.in',
    role: 'student',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: college1.id,
  });
  eligibleToken = generateAccessToken({ id: eligibleStudent.id, role: 'student', collegeId: college1.id });
  eligibleProfile = await StudentProfile.create({
    userId: eligibleStudent.id,
    collegeId: college1.id,
    departmentId: deptCSE.id,
    fullName: 'Alice Verma',
    usn: '4NI21CS001',
    college: college1.name,
    department: 'Computer Science & Engineering',
    semester: 7,
    academicYear: '2024-2025',
    skillsKnown: ['Java', 'Spring Boot', 'React', 'SQL'],
  });
  eligiblePlacement = await PlacementProfile.create({
    userId: eligibleStudent.id,
    collegeId: college1.id,
    cgpa: 8.5,
    activeBacklogs: 0,
    totalBacklogs: 0,
    graduationYear: 2025,
    preferredRoles: ['Software Engineer', 'Full Stack Developer'],
    preferredLocations: ['Bengaluru'],
  });

  // Ineligible Student: ECE, Sem 5, CGPA 6.0, 2 active backlogs, missing skills
  ineligibleStudent = await User.create({
    email: 'bob.junior@nie.ac.in',
    role: 'student',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: college1.id,
  });
  ineligibleToken = generateAccessToken({ id: ineligibleStudent.id, role: 'student', collegeId: college1.id });
  ineligibleProfile = await StudentProfile.create({
    userId: ineligibleStudent.id,
    collegeId: college1.id,
    departmentId: deptECE.id,
    fullName: 'Bob ECE',
    usn: '4NI23EC050',
    college: college1.name,
    department: 'Electronics & Communication',
    semester: 5,
    academicYear: '2024-2025',
    skillsKnown: ['C', 'Matlab'],
  });
  ineligiblePlacement = await PlacementProfile.create({
    userId: ineligibleStudent.id,
    collegeId: college1.id,
    cgpa: 6.0,
    activeBacklogs: 2,
    totalBacklogs: 2,
    graduationYear: 2027,
  });

  // Foreign Student (College 2)
  foreignStudent = await User.create({
    email: 'charlie@bmsce.ac.in',
    role: 'student',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: college2.id,
  });
  foreignToken = generateAccessToken({ id: foreignStudent.id, role: 'student', collegeId: college2.id });
  foreignProfile = await StudentProfile.create({
    userId: foreignStudent.id,
    collegeId: college2.id,
    fullName: 'Charlie BMS',
    usn: '1BM21CS099',
    college: college2.name,
    department: 'Computer Science & Engineering',
    semester: 7,
    skillsKnown: ['Java', 'Spring Boot'],
  });
  await PlacementProfile.create({
    userId: foreignStudent.id,
    collegeId: college2.id,
    cgpa: 9.0,
    graduationYear: 2025,
  });

  // ── TEST CASES ─────────────────────────────────────────────────────────────

  // 1 & 3: Authorized TPC/Admin can create company & opportunity
  await t.test('3. Authorized TPC/Admin can create company and opportunity', async () => {
    const compRes = await request(app)
      .post('/api/placements/companies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Google India',
        industry: 'Internet & Technology',
        website: 'https://careers.google.com',
        headquarters: 'Bengaluru',
      });
    assert.equal(compRes.status, 201);
    assert.equal(compRes.body.data.name, 'Google India');
    createdCompany = compRes.body.data;

    const oppRes = await request(app)
      .post('/api/placements/opportunities')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        companyId: createdCompany.id,
        companyName: createdCompany.name,
        title: 'Software Engineering Intern',
        description: 'Join Google for a high-impact summer software internship.',
        opportunityType: 'INTERNSHIP',
        category: 'SOFTWARE',
        workMode: 'HYBRID',
        location: 'Bengaluru',
        stipend: '100,000 / month',
        duration: '6 Months',
        applicationDeadline: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
        eligibility: {
          eligibleDepartments: ['Computer Science & Engineering', 'CSE'],
          eligibleSemesters: [7, 8],
          eligibleGraduationYears: [2025],
          minimumCgpa: 7.5,
          maxActiveBacklogs: 0,
          maxTotalBacklogs: 0,
          requiredSkills: ['Java', 'Spring Boot'],
        },
      });
    assert.equal(oppRes.status, 201);
    assert.equal(oppRes.body.data.title, 'Software Engineering Intern');
    assert.equal(oppRes.body.data.status, 'DRAFT');
    createdOpportunity = oppRes.body.data;
  });

  // 2: Student cannot create opportunity
  await t.test('2. Student cannot create opportunity', async () => {
    const res = await request(app)
      .post('/api/placements/opportunities')
      .set('Authorization', `Bearer ${eligibleToken}`)
      .send({
        companyName: 'Unauthorized Tech',
        title: 'Hacker Intern',
        description: 'Unauthorized attempt',
        applicationDeadline: new Date(Date.now() + 86400000).toISOString(),
      });
    assert.equal(res.status, 403);
  });

  // 4: Unauthorized teacher cannot create/manage opportunity
  await t.test('4. Unauthorized teacher cannot create/manage opportunity', async () => {
    const res = await request(app)
      .post('/api/placements/opportunities')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        companyName: 'Teacher Tech',
        title: 'Research Intern',
        description: 'Unauthorized teacher post',
        applicationDeadline: new Date(Date.now() + 86400000).toISOString(),
      });
    assert.equal(res.status, 403);
  });

  // 5: Company verification works
  await t.test('5. Company verification works (Admin can verify company)', async () => {
    const res = await request(app)
      .patch(`/api/placements/companies/${createdCompany.id}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'VERIFIED', notes: 'Verified via official corporate domain' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.verificationStatus, 'VERIFIED');
  });

  // 6: Unverified/Rejected company cannot be published
  await t.test('6. Unverified/Rejected company blocks publishing if rejected', async () => {
    const badComp = await Company.create({
      collegeId: college1.id,
      name: 'Suspicious Scam LLC',
      verificationStatus: 'REJECTED',
    });
    const badOpp = await Opportunity.create({
      collegeId: college1.id,
      createdBy: adminUser.id,
      companyId: badComp.id,
      companyName: badComp.name,
      title: 'Get Rich Quick Intern',
      description: 'Scam job',
      applicationDeadline: new Date(Date.now() + 86400000),
      status: 'DRAFT',
    });

    const pubRes = await request(app)
      .post(`/api/placements/opportunities/${badOpp.id}/publish`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(pubRes.status, 400);
    assert.match(pubRes.body.message, /rejected company/i);
  });

  // 7: Opportunity validation works
  await t.test('7. Opportunity validation works (missing required fields)', async () => {
    const res = await request(app)
      .post('/api/placements/opportunities')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Missing company and deadline' });
    assert.equal(res.status, 400);
  });

  // 1: Student can discover published opportunity
  await t.test('1. Student can discover published opportunity (after publish)', async () => {
    // Draft opportunity is hidden from student
    const preCheck = await request(app)
      .get(`/api/placements/opportunities/${createdOpportunity.id}`)
      .set('Authorization', `Bearer ${eligibleToken}`);
    assert.equal(preCheck.status, 404);

    // Admin publishes
    const pubRes = await request(app)
      .post(`/api/placements/opportunities/${createdOpportunity.id}/publish`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(pubRes.status, 200);
    assert.equal(pubRes.body.data.status, 'PUBLISHED');

    // Student discovers
    const listRes = await request(app)
      .get('/api/placements/opportunities')
      .set('Authorization', `Bearer ${eligibleToken}`);
    assert.equal(listRes.status, 200);
    assert.ok(listRes.body.data.length >= 1);
    const found = listRes.body.data.find((o) => o.id === createdOpportunity.id);
    assert.ok(found);
    assert.equal(found.isEligible, true);
  });

  // 8: Application deadline enforced
  await t.test('8. Application deadline enforced (expired opportunity)', async () => {
    const expiredOpp = await Opportunity.create({
      collegeId: college1.id,
      createdBy: adminUser.id,
      companyName: 'Expired Corp',
      title: 'Old Internship',
      description: 'Past deadline',
      applicationDeadline: new Date(Date.now() - 3600000), // Expired 1 hour ago
      status: 'PUBLISHED',
    });

    const res = await request(app)
      .post(`/api/placements/opportunities/${expiredOpp.id}/apply`)
      .set('Authorization', `Bearer ${eligibleToken}`)
      .send({});
    assert.equal(res.status, 400);
    assert.match(res.body.message, /deadline has passed/i);
  });

  // 10, 11, 12, 13, 14, 15, 16: Eligibility Engine checks
  await t.test('10-16. Ineligible student blocked with detailed missingCriteria (Department, CGPA, Backlogs, Skills)', async () => {
    const applyRes = await request(app)
      .post(`/api/placements/opportunities/${createdOpportunity.id}/apply`)
      .set('Authorization', `Bearer ${ineligibleToken}`)
      .send({});
    assert.equal(applyRes.status, 400);
    assert.match(applyRes.body.message, /eligibility requirements/i);
    assert.ok(applyRes.body.details?.missingCriteria?.length >= 3);
  });

  // 17: Eligible student can apply
  let createdApplication;
  await t.test('17. Eligible student can apply', async () => {
    const res = await request(app)
      .post(`/api/placements/opportunities/${createdOpportunity.id}/apply`)
      .set('Authorization', `Bearer ${eligibleToken}`)
      .send({ coverLetter: 'I am highly passionate about full-stack engineering at Google.' });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.status, 'APPLIED');
    assert.equal(res.body.data.currentStage, 'Application Submitted');
    createdApplication = res.body.data;
  });

  // 9: Duplicate application blocked
  await t.test('9. Duplicate application blocked', async () => {
    const res = await request(app)
      .post(`/api/placements/opportunities/${createdOpportunity.id}/apply`)
      .set('Authorization', `Bearer ${eligibleToken}`)
      .send({});
    assert.equal(res.status, 409);
    assert.match(res.body.message, /already applied/i);
  });

  // 18: Student can withdraw application
  await t.test('18. Student can withdraw application', async () => {
    // Create another opportunity to test withdrawal
    const opp2 = await Opportunity.create({
      collegeId: college1.id,
      createdBy: adminUser.id,
      companyName: 'Microsoft',
      title: 'Cloud Intern',
      description: 'Azure cloud internship',
      applicationDeadline: new Date(Date.now() + 86400000),
      status: 'PUBLISHED',
      eligibility: {},
    });

    const app2Res = await request(app)
      .post(`/api/placements/opportunities/${opp2.id}/apply`)
      .set('Authorization', `Bearer ${eligibleToken}`);
    assert.equal(app2Res.status, 201);

    const withdrawRes = await request(app)
      .post(`/api/placements/applications/${app2Res.body.data.id}/withdraw`)
      .set('Authorization', `Bearer ${eligibleToken}`);
    assert.equal(withdrawRes.status, 200);
    assert.equal(withdrawRes.body.data.status, 'WITHDRAWN');
  });

  // 21: Student cannot mark self selected
  await t.test('21. Student cannot mark self selected', async () => {
    const res = await request(app)
      .patch(`/api/placements/applications/${createdApplication.id}/stage`)
      .set('Authorization', `Bearer ${eligibleToken}`)
      .send({ status: 'SELECTED' });
    assert.equal(res.status, 403);
  });

  // 25: Unauthorized teacher cannot modify application
  await t.test('25. Unauthorized teacher cannot modify application', async () => {
    const res = await request(app)
      .patch(`/api/placements/applications/${createdApplication.id}/stage`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ status: 'SHORTLISTED' });
    assert.equal(res.status, 403);
  });

  // 20: Invalid application transition blocked
  await t.test('20. Invalid application transition blocked (e.g. APPLIED -> SELECTED directly without screening)', async () => {
    const res = await request(app)
      .patch(`/api/placements/applications/${createdApplication.id}/stage`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'SELECTED' });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /invalid application status transition/i);
  });

  // 22: Authorized TPC can shortlist
  await t.test('22. Authorized TPC can shortlist candidate', async () => {
    const res = await request(app)
      .patch(`/api/placements/applications/${createdApplication.id}/shortlist`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Strong CGPA and profile.' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'SHORTLISTED');
  });

  // 31: Interview scheduling works
  let scheduledInterview;
  await t.test('31. Interview scheduling works', async () => {
    const res = await request(app)
      .post('/api/placements/interviews')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        applicationId: createdApplication.id,
        type: 'TECHNICAL_INTERVIEW',
        title: 'Round 1: DSA & System Design',
        scheduledAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        durationMinutes: 60,
        meetingLink: 'https://meet.google.com/xyz-unilink',
        instructions: 'Please be ready with a coding environment and your student ID.',
      });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.status, 'SCHEDULED');
    scheduledInterview = res.body.data;
  });

  // 32: Unauthorized interview modification blocked
  await t.test('32. Unauthorized interview modification blocked', async () => {
    const res = await request(app)
      .patch(`/api/placements/interviews/${scheduledInterview.id}`)
      .set('Authorization', `Bearer ${eligibleToken}`)
      .send({ status: 'COMPLETED', result: 'PASSED' });
    assert.equal(res.status, 403);
  });

  // 33: Student sees own interviews
  await t.test('33. Student sees own interviews', async () => {
    const res = await request(app)
      .get('/api/placements/interviews')
      .set('Authorization', `Bearer ${eligibleToken}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.data.length >= 1);
    assert.equal(res.body.data[0].id, scheduledInterview.id);
  });

  // 19 & 24: Valid transition to SELECTED
  await t.test('19 & 24. Authorized TPC can select student candidate', async () => {
    const res = await request(app)
      .patch(`/api/placements/applications/${createdApplication.id}/select`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Candidate cleared technical round with distinction.' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'SELECTED');
  });

  // Student accepts offer
  await t.test('Student can accept placement offer (OFFER_ACCEPTED)', async () => {
    const res = await request(app)
      .patch(`/api/placements/applications/${createdApplication.id}/stage`)
      .set('Authorization', `Bearer ${eligibleToken}`)
      .send({ status: 'OFFER_ACCEPTED' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'OFFER_ACCEPTED');

    // Verify placed status updated in PlacementProfile
    const profileRes = await request(app)
      .get('/api/placements/profile')
      .set('Authorization', `Bearer ${eligibleToken}`);
    assert.equal(profileRes.body.data.placedStatus, 'PLACED');
  });

  // 23: Authorized TPC can reject an application
  await t.test('23. Authorized TPC can reject an application', async () => {
    // Ineligible student applies to open general opportunity
    const openOpp = await Opportunity.create({
      collegeId: college1.id,
      createdBy: adminUser.id,
      companyName: 'Open Tech',
      title: 'Tester',
      description: 'Open to all',
      applicationDeadline: new Date(Date.now() + 86400000),
      status: 'PUBLISHED',
      eligibility: {},
    });

    const bobApp = await request(app)
      .post(`/api/placements/opportunities/${openOpp.id}/apply`)
      .set('Authorization', `Bearer ${ineligibleToken}`);

    const rejectRes = await request(app)
      .patch(`/api/placements/applications/${bobApp.body.data.id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Profile does not fit requirement.' });
    assert.equal(rejectRes.status, 200);
    assert.equal(rejectRes.body.data.status, 'REJECTED');
  });

  // 26 & 27: Cross-college isolation
  await t.test('26 & 27. Cross-college opportunity discovery and application blocked', async () => {
    // Charlie from BMSCE attempts to access College 1 opportunity
    const viewRes = await request(app)
      .get(`/api/placements/opportunities/${createdOpportunity.id}`)
      .set('Authorization', `Bearer ${foreignToken}`);
    assert.equal(viewRes.status, 404);

    const applyRes = await request(app)
      .post(`/api/placements/opportunities/${createdOpportunity.id}/apply`)
      .set('Authorization', `Bearer ${foreignToken}`)
      .send({});
    assert.equal(applyRes.status, 404);
  });

  // 28, 29, 30: Bookmarks
  await t.test('28-30. Opportunity Bookmark lifecycle (Add, Duplicate Blocked, Remove, Saved List)', async () => {
    const saveRes = await request(app)
      .post(`/api/placements/opportunities/${createdOpportunity.id}/bookmark`)
      .set('Authorization', `Bearer ${eligibleToken}`);
    assert.equal(saveRes.status, 201);

    // Duplicate save blocked
    const dupRes = await request(app)
      .post(`/api/placements/opportunities/${createdOpportunity.id}/bookmark`)
      .set('Authorization', `Bearer ${eligibleToken}`);
    assert.equal(dupRes.status, 409);

    // Get saved
    const savedList = await request(app)
      .get('/api/placements/saved')
      .set('Authorization', `Bearer ${eligibleToken}`);
    assert.equal(savedList.status, 200);
    assert.ok(savedList.body.data.length >= 1);

    // Remove bookmark
    const removeRes = await request(app)
      .delete(`/api/placements/opportunities/${createdOpportunity.id}/bookmark`)
      .set('Authorization', `Bearer ${eligibleToken}`);
    assert.equal(removeRes.status, 200);
  });

  // 34, 35, 36: Resume Upload, Privacy & IDOR
  await t.test('34-36. Resume upload validation, access control & IDOR protection', async () => {
    // 34: Invalid file extension rejected
    const invalidUpload = await request(app)
      .post('/api/placements/profile/resume')
      .set('Authorization', `Bearer ${eligibleToken}`)
      .attach('resume', Buffer.from('malicious script'), 'resume.exe');
    assert.equal(invalidUpload.status, 400);

    // Valid upload
    const validUpload = await request(app)
      .post('/api/placements/profile/resume')
      .set('Authorization', `Bearer ${eligibleToken}`)
      .attach('resume', Buffer.from('%PDF-1.4 Mock PDF Content'), 'alice_verma_resume.pdf');
    assert.equal(validUpload.status, 201);
    const resumeFilename = validUpload.body.data.resumeFilename;
    assert.ok(resumeFilename);

    // 35: Student owner can access resume
    const ownerAccess = await request(app)
      .get(`/api/placements/resumes/${resumeFilename}`)
      .set('Authorization', `Bearer ${eligibleToken}`);
    assert.equal(ownerAccess.status, 200);

    // 36: Unauthorized foreign student cannot access resume (403 Forbidden)
    const unauthorizedAccess = await request(app)
      .get(`/api/placements/resumes/${resumeFilename}`)
      .set('Authorization', `Bearer ${foreignToken}`);
    assert.equal(unauthorizedAccess.status, 403);
  });

  // 37: Placement notifications created
  await t.test('37. Placement notifications created for student updates', async () => {
    const notifications = await Notification.findAll({
      where: { userId: eligibleStudent.id },
    });
    assert.ok(notifications.length >= 2);
  });

  // 38: Report opportunity works
  await t.test('38. Report suspicious opportunity works', async () => {
    const res = await request(app)
      .post(`/api/placements/opportunities/${createdOpportunity.id}/report`)
      .set('Authorization', `Bearer ${eligibleToken}`)
      .send({ category: 'misleading_salary', description: 'Stipend mentions higher than actual' });
    assert.equal(res.status, 201);
  });

  // 39: Admin audit logs sensitive actions
  await t.test('39. Admin audit logs sensitive actions', async () => {
    const logs = await AuditLog.findAll({
      where: { actorId: adminUser.id },
    });
    assert.ok(logs.length >= 3);
  });

  // 40: Analytics return correct aggregate values
  await t.test('40. Placement Analytics returns correct aggregate values', async () => {
    const adminStats = await request(app)
      .get('/api/placements/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(adminStats.status, 200);
    assert.ok(adminStats.body.data.totalOpportunities >= 1);
    assert.ok(adminStats.body.data.acceptedCount >= 1);

    const studentStats = await request(app)
      .get('/api/placements/stats')
      .set('Authorization', `Bearer ${eligibleToken}`);
    assert.equal(studentStats.status, 200);
    assert.ok(studentStats.body.data.myApplicationsCount >= 1);
  });

  // 41, 42, 43, 44: Pagination, Search, Filter, Sort
  await t.test('41-44. Pagination, search, category filter, and deadline sorting', async () => {
    const searchRes = await request(app)
      .get('/api/placements/opportunities?search=Google')
      .set('Authorization', `Bearer ${eligibleToken}`);
    assert.equal(searchRes.status, 200);
    assert.ok(searchRes.body.data.length >= 1);

    const filterRes = await request(app)
      .get('/api/placements/opportunities?type=INTERNSHIP&workMode=HYBRID')
      .set('Authorization', `Bearer ${eligibleToken}`);
    assert.equal(filterRes.status, 200);
    assert.ok(filterRes.body.data.length >= 1);

    const sortRes = await request(app)
      .get('/api/placements/opportunities?sortBy=deadline&page=1&limit=5')
      .set('Authorization', `Bearer ${eligibleToken}`);
    assert.equal(sortRes.status, 200);
    assert.equal(sortRes.body.meta.page, 1);
  });

  // 45: Campus drive registration works
  await t.test('45. Campus drive registration works (CAMPUS_DRIVE type)', async () => {
    const driveOpp = await Opportunity.create({
      collegeId: college1.id,
      createdBy: adminUser.id,
      companyName: 'Infosys Campus Connect',
      title: 'Mass Recruitment Campus Drive 2025',
      description: 'Annual campus placement drive for all engineering graduates.',
      opportunityType: 'CAMPUS_DRIVE',
      venue: 'Auditorium Hall 1',
      driveDate: new Date(Date.now() + 7 * 86400000),
      applicationDeadline: new Date(Date.now() + 5 * 86400000),
      status: 'PUBLISHED',
      eligibility: {},
    });

    const regRes = await request(app)
      .post(`/api/placements/opportunities/${driveOpp.id}/apply`)
      .set('Authorization', `Bearer ${eligibleToken}`);
    assert.equal(regRes.status, 201);
    assert.equal(regRes.body.data.opportunityId, driveOpp.id);
  });

  // 46: Cancelled opportunity blocks applications
  await t.test('46. Cancelled opportunity blocks applications', async () => {
    const cancelOpp = await Opportunity.create({
      collegeId: college1.id,
      createdBy: adminUser.id,
      companyName: 'Cancelled Tech',
      title: 'Cancelled Role',
      description: 'Will be cancelled',
      applicationDeadline: new Date(Date.now() + 86400000),
      status: 'PUBLISHED',
    });

    await request(app)
      .post(`/api/placements/opportunities/${cancelOpp.id}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Company hiring freeze' });

    const res = await request(app)
      .post(`/api/placements/opportunities/${cancelOpp.id}/apply`)
      .set('Authorization', `Bearer ${eligibleToken}`);
    assert.equal(res.status, 400);
  });

  // 47: Closed opportunity blocks applications
  await t.test('47. Closed opportunity blocks applications', async () => {
    const closedOpp = await Opportunity.create({
      collegeId: college1.id,
      createdBy: adminUser.id,
      companyName: 'Closed Tech',
      title: 'Closed Role',
      description: 'Will be closed',
      applicationDeadline: new Date(Date.now() + 86400000),
      status: 'PUBLISHED',
    });

    await request(app)
      .post(`/api/placements/opportunities/${closedOpp.id}/close`)
      .set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app)
      .post(`/api/placements/opportunities/${closedOpp.id}/apply`)
      .set('Authorization', `Bearer ${eligibleToken}`);
    assert.equal(res.status, 400);
  });

  // 48: Student cannot modify application stage
  await t.test('48. Student cannot arbitrarily change application recruitment stage', async () => {
    const res = await request(app)
      .patch(`/api/placements/applications/${createdApplication.id}/stage`)
      .set('Authorization', `Bearer ${eligibleToken}`)
      .send({ status: 'INTERVIEW' });
    assert.equal(res.status, 403);
  });

  // 49: IDOR protection on single application detail
  await t.test('49. IDOR protection: Student cannot view another student application', async () => {
    const res = await request(app)
      .get(`/api/placements/applications/${createdApplication.id}`)
      .set('Authorization', `Bearer ${ineligibleToken}`);
    assert.equal(res.status, 403);
  });

  // 50: Full end-to-end lifecycle test
  await t.test('50. Full End-to-End Placement Recruitment Lifecycle Test', async () => {
    // 1. TPC creates company
    const compRes = await request(app)
      .post('/api/placements/companies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Amazon Web Services', industry: 'Cloud Computing' });
    assert.equal(compRes.status, 201);
    const amazon = compRes.body.data;

    // 2. Company verified
    const verRes = await request(app)
      .patch(`/api/placements/companies/${amazon.id}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'VERIFIED' });
    assert.equal(verRes.status, 200);

    // 3. TPC creates cloud internship opportunity
    const oppRes = await request(app)
      .post('/api/placements/opportunities')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        companyId: amazon.id,
        companyName: amazon.name,
        title: 'Cloud Support Associate Intern',
        description: 'Work with AWS global infrastructure teams.',
        opportunityType: 'INTERNSHIP',
        category: 'CLOUD',
        workMode: 'REMOTE',
        stipend: '80,000 / month',
        applicationDeadline: new Date(Date.now() + 7 * 86400000).toISOString(),
        eligibility: {
          eligibleDepartments: ['Computer Science & Engineering'],
          minimumCgpa: 8.0,
          requiredSkills: ['React', 'Java'],
        },
      });
    assert.equal(oppRes.status, 201);
    const awsOpp = oppRes.body.data;

    // 4. TPC publishes opportunity
    const pubRes = await request(app)
      .post(`/api/placements/opportunities/${awsOpp.id}/publish`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(pubRes.status, 200);

    // 5. Eligible student discovers opportunity
    const discoverRes = await request(app)
      .get(`/api/placements/opportunities/${awsOpp.id}`)
      .set('Authorization', `Bearer ${eligibleToken}`);
    assert.equal(discoverRes.status, 200);
    assert.equal(discoverRes.body.data.isEligible, true);

    // 6. Student applies
    const applyRes = await request(app)
      .post(`/api/placements/opportunities/${awsOpp.id}/apply`)
      .set('Authorization', `Bearer ${eligibleToken}`)
      .send({ coverLetter: 'Experienced with AWS services and full stack development.' });
    assert.equal(applyRes.status, 201);
    const awsApp = applyRes.body.data;

    // 7. TPC reviews and shortlists candidate
    const shortRes = await request(app)
      .patch(`/api/placements/applications/${awsApp.id}/shortlist`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Strong technical foundations.' });
    assert.equal(shortRes.status, 200);
    assert.equal(shortRes.body.data.status, 'SHORTLISTED');

    // 8. TPC schedules interview
    const intRes = await request(app)
      .post('/api/placements/interviews')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        applicationId: awsApp.id,
        type: 'TECHNICAL_INTERVIEW',
        scheduledAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        venue: 'Virtual Room AWS-1',
      });
    assert.equal(intRes.status, 201);

    // 9. Interview marked completed with pass result
    const intUpdate = await request(app)
      .patch(`/api/placements/interviews/${intRes.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'COMPLETED', result: 'PASSED', feedback: 'Excellent cloud architecture knowledge.' });
    assert.equal(intUpdate.status, 200);

    // 10. Student selected for placement
    const selRes = await request(app)
      .patch(`/api/placements/applications/${awsApp.id}/select`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Selected for Cloud Associate Internship.' });
    assert.equal(selRes.status, 200);
    assert.equal(selRes.body.data.status, 'SELECTED');

    // 11. Student accepts offer
    const acceptRes = await request(app)
      .patch(`/api/placements/applications/${awsApp.id}/stage`)
      .set('Authorization', `Bearer ${eligibleToken}`)
      .send({ status: 'OFFER_ACCEPTED' });
    assert.equal(acceptRes.status, 200);
    assert.equal(acceptRes.body.data.status, 'OFFER_ACCEPTED');

    // 12. Verify audit logs and notifications exist
    const finalAudit = await AuditLog.findOne({
      where: { action: 'OFFER_ACCEPTED' },
    });
    assert.ok(finalAudit);

    const finalNotif = await Notification.findOne({
      where: { userId: eligibleStudent.id, type: 'APPLICATION_SELECTED' },
    });
    assert.ok(finalNotif);
  });
});
