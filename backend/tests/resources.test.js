'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const path = require('path');
const fs = require('fs');

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
  Resource,
  ResourceBookmark,
  Report,
  AuditLog,
  Notification,
} = require('../src/models');
const { generateAccessToken } = require('../src/utils/jwt');
const collegeService = require('../src/services/collegeService');
const resourceService = require('../src/services/resourceService');
const storageService = require('../src/services/storageService');

test('RESOURCE VAULT & ACADEMIC REPOSITORY MODULE TEST SUITE', async (t) => {
  let college1, college2;
  let deptCSE, deptECE;
  let teacherUser1, teacherToken1;
  let teacherUser2, teacherToken2;
  let studentUser1, studentProfile1, studentToken1;
  let studentUser2, studentProfile2, studentToken2;
  let foreignStudent, foreignToken;
  let adminUser, adminToken;

  await sequelize.sync({ force: true });
  college1 = await collegeService.getDefaultCollege();

  // College 2 for cross-college tests
  college2 = await College.create({
    name: 'BMS College of Engineering',
    code: 'BMSCE',
    domain: 'bmsce.ac.in',
  });

  // Departments
  deptCSE = await Department.create({
    collegeId: college1.id,
    name: 'Computer Science & Engineering',
    code: 'CSE',
  });
  deptECE = await Department.create({
    collegeId: college1.id,
    name: 'Electronics & Communication Engineering',
    code: 'ECE',
  });

  // Teacher 1 (CSE Faculty)
  teacherUser1 = await User.create({
    email: 'teacher.cse@nie.ac.in',
    role: 'teacher',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: college1.id,
  });
  await TeacherProfile.create({
    userId: teacherUser1.id,
    collegeId: college1.id,
    teacherId: 'TCH-CSE-101',
    fullName: 'Prof. Donald Knuth',
    college: college1.name,
    department: 'Computer Science',
    departmentId: deptCSE.id,
  });
  teacherToken1 = generateAccessToken({ id: teacherUser1.id, role: 'teacher', collegeId: college1.id });

  // Teacher 2 (ECE Faculty)
  teacherUser2 = await User.create({
    email: 'teacher.ece@nie.ac.in',
    role: 'teacher',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: college1.id,
  });
  await TeacherProfile.create({
    userId: teacherUser2.id,
    collegeId: college1.id,
    teacherId: 'TCH-ECE-102',
    fullName: 'Prof. Claude Shannon',
    college: college1.name,
    department: 'Electronics',
    departmentId: deptECE.id,
  });
  teacherToken2 = generateAccessToken({ id: teacherUser2.id, role: 'teacher', collegeId: college1.id });

  // Student 1 (CSE, Semester 5)
  studentUser1 = await User.create({
    email: 'student.cse5@nie.ac.in',
    role: 'student',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: college1.id,
  });
  studentProfile1 = await StudentProfile.create({
    userId: studentUser1.id,
    collegeId: college1.id,
    usn: '1NIE21CS101',
    fullName: 'Alice Walker',
    college: college1.name,
    department: 'Computer Science',
    departmentId: deptCSE.id,
    semester: 5,
  });
  studentToken1 = generateAccessToken({ id: studentUser1.id, role: 'student', collegeId: college1.id });

  // Student 2 (ECE, Semester 3)
  studentUser2 = await User.create({
    email: 'student.ece3@nie.ac.in',
    role: 'student',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: college1.id,
  });
  studentProfile2 = await StudentProfile.create({
    userId: studentUser2.id,
    collegeId: college1.id,
    usn: '1NIE22EC055',
    fullName: 'Bob Smith',
    college: college1.name,
    department: 'Electronics',
    departmentId: deptECE.id,
    semester: 3,
  });
  studentToken2 = generateAccessToken({ id: studentUser2.id, role: 'student', collegeId: college1.id });

  // Foreign Student (College 2)
  foreignStudent = await User.create({
    email: 'foreign.student@bmsce.ac.in',
    role: 'student',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: college2.id,
  });
  await StudentProfile.create({
    userId: foreignStudent.id,
    collegeId: college2.id,
    usn: '1BM21CS001',
    fullName: 'Charlie Foreign',
    college: college2.name,
    semester: 5,
  });
  foreignToken = generateAccessToken({ id: foreignStudent.id, role: 'student', collegeId: college2.id });

  // Admin User
  adminUser = await User.create({
    email: 'admin.resources@nie.ac.in',
    role: 'admin',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: college1.id,
  });
  adminToken = generateAccessToken({ id: adminUser.id, role: 'admin', collegeId: college1.id });

  let publishedResourceId;
  let draftResourceId;
  let deptRestrictedResourceId;
  let semRestrictedResourceId;

  // ──────────────────────────────────────────────────────────────────────────
  // 1 & 4. Teacher uploads resource & Student views published resource
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('1 & 4. Teacher can upload resource & Student can view published college resource', async () => {
    const res = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${teacherToken1}`)
      .send({
        title: 'Database Systems Module 1 Notes',
        description: 'Complete notes on Relational Algebra & SQL',
        resourceType: 'NOTES',
        subject: 'Database Management Systems',
        subjectCode: 'BCS501',
        departmentId: deptCSE.id,
        semester: 5,
        academicYear: '2025-26',
        tags: ['DBMS', 'SQL', 'VTU'],
        fileUrl: '/uploads/resources/dbms-mod1.pdf',
        fileName: 'dbms-mod1.pdf',
        fileType: 'application/pdf',
        fileSize: 2048500,
        status: 'PUBLISHED', // or auto approved
        visibility: 'COLLEGE',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.title, 'Database Systems Module 1 Notes');
    publishedResourceId = res.body.data.id;

    // Ensure it is published for discovery test
    await Resource.update({ status: 'PUBLISHED' }, { where: { id: publishedResourceId } });

    // Student 1 views it
    const viewRes = await request(app)
      .get(`/api/resources/${publishedResourceId}`)
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(viewRes.status, 200);
    assert.equal(viewRes.body.data.title, 'Database Systems Module 1 Notes');
    assert.equal(viewRes.body.data.isSaved, false);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Cross-college access blocked
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('2. Student cannot access another college resource', async () => {
    const res = await request(app)
      .get(`/api/resources/${publishedResourceId}`)
      .set('Authorization', `Bearer ${foreignToken}`);

    assert.equal(res.status, 403);
    assert.match(res.body.message, /cross-college/i);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Student cannot upload official resource
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('3. Student cannot upload official resource', async () => {
    const res = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${studentToken1}`)
      .send({
        title: 'Student Attempt Notes',
        resourceType: 'NOTES',
        subject: 'Algorithms',
        subjectCode: 'BCS502',
        fileName: 'notes.pdf',
        fileUrl: '/uploads/resources/fake.pdf',
      });

    assert.equal(res.status, 403);
    assert.match(res.body.message, /students cannot upload/i);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Teacher can edit own resource
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('5. Teacher can edit own resource', async () => {
    const res = await request(app)
      .patch(`/api/resources/${publishedResourceId}`)
      .set('Authorization', `Bearer ${teacherToken1}`)
      .send({
        description: 'Updated description with ER diagrams included',
        academicYear: '2026-27',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.description, 'Updated description with ER diagrams included');
    assert.equal(res.body.data.academicYear, '2026-27');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Teacher cannot edit another teacher's resource (IDOR)
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('6. Teacher cannot edit another teacher resource (IDOR protection)', async () => {
    const res = await request(app)
      .patch(`/api/resources/${publishedResourceId}`)
      .set('Authorization', `Bearer ${teacherToken2}`)
      .send({
        title: 'Malicious modification by Teacher 2',
      });

    assert.equal(res.status, 403);
    assert.match(res.body.message, /cannot modify another teacher/i);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Admin can manage resources
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('7. Admin can manage resources', async () => {
    const res = await request(app)
      .patch(`/api/resources/${publishedResourceId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Admin updated description',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.description, 'Admin updated description');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 8. Invalid resource type rejected
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('8. Invalid resource type rejected', async () => {
    const res = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${teacherToken1}`)
      .send({
        title: 'Invalid Type Doc',
        resourceType: 'PIRATED_MOVIE',
        subject: 'Math',
        subjectCode: 'MAT101',
        fileName: 'doc.pdf',
        fileUrl: '/uploads/resources/doc.pdf',
      });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /invalid resource type/i);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 9. Invalid file type rejected
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('9. Invalid file type rejected', async () => {
    const res = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${teacherToken1}`)
      .send({
        title: 'Script File',
        resourceType: 'NOTES',
        subject: 'Security',
        subjectCode: 'SEC101',
        fileName: 'exploit.exe',
        fileUrl: '/uploads/resources/exploit.exe',
      });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /executable and script files/i);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 10. Oversized file rejected
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('10. Oversized file rejected', async () => {
    const res = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${teacherToken1}`)
      .send({
        title: 'Huge Video',
        resourceType: 'NOTES',
        subject: 'Algorithms',
        subjectCode: 'ALG101',
        fileName: 'huge.pdf',
        fileSize: 100 * 1024 * 1024, // 100MB
        fileUrl: '/uploads/resources/huge.pdf',
      });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /exceeds maximum permitted limit/i);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 11. Filename / path traversal rejected
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('11. Filename path traversal rejected', async () => {
    const res = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${teacherToken1}`)
      .send({
        title: 'Malicious Traversal',
        resourceType: 'NOTES',
        subject: 'Security',
        subjectCode: 'SEC101',
        fileName: '../../etc/passwd.pdf',
        fileUrl: '/uploads/resources/passwd.pdf',
      });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /directory traversal/i);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 12. Draft cannot appear in student discovery
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('12. Draft cannot appear in student discovery', async () => {
    const draftRes = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${teacherToken1}`)
      .send({
        title: 'Hidden Draft Notes for Algorithms',
        resourceType: 'NOTES',
        subject: 'Algorithms',
        subjectCode: 'BCS502',
        isDraft: true,
        fileName: 'draft.pdf',
        fileUrl: '/uploads/resources/draft.pdf',
      });

    assert.equal(draftRes.status, 201);
    assert.equal(draftRes.body.data.status, 'DRAFT');
    draftResourceId = draftRes.body.data.id;

    // Student searches for Algorithms
    const studentSearch = await request(app)
      .get('/api/resources?search=Algorithms')
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(studentSearch.status, 200);
    const foundDraft = studentSearch.body.data.some((r) => r.id === draftResourceId);
    assert.equal(foundDraft, false);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 13. Pending resource cannot appear unless authorized
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('13. Pending resource cannot appear in student discovery', async () => {
    const pendingRes = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${teacherToken1}`)
      .send({
        title: 'Pending Lab Manual for OS',
        resourceType: 'LAB_MANUAL',
        subject: 'Operating Systems',
        subjectCode: 'BCS503',
        status: 'PENDING_REVIEW',
        fileName: 'os_manual.pdf',
        fileUrl: '/uploads/resources/os_manual.pdf',
      });

    assert.equal(pendingRes.status, 201);
    assert.equal(pendingRes.body.data.status, 'PENDING_REVIEW');
    const pendingId = pendingRes.body.data.id;

    // Student discovery should NOT list it
    const disc = await request(app)
      .get('/api/resources?search=Operating')
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(disc.status, 200);
    assert.equal(disc.body.data.some((r) => r.id === pendingId), false);

    // Direct access by student should return 403
    const directRes = await request(app)
      .get(`/api/resources/${pendingId}`)
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(directRes.status, 403);
    assert.match(directRes.body.message, /not accessible/i);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 14. Published resource appears correctly
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('14. Published resource appears correctly in student discovery', async () => {
    const res = await request(app)
      .get('/api/resources')
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.length >= 1);
    const pub = res.body.data.find((r) => r.id === publishedResourceId);
    assert.ok(pub);
    assert.equal(pub.status, 'PUBLISHED');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 15. Department visibility enforced
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('15. Department visibility enforced', async () => {
    const deptRes = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'CSE Exclusive Compilers Resource',
        resourceType: 'STUDY_MATERIAL',
        subject: 'Compiler Design',
        subjectCode: 'BCS601',
        departmentId: deptCSE.id,
        visibility: 'DEPARTMENT',
        status: 'PUBLISHED',
        fileName: 'compilers.pdf',
        fileUrl: '/uploads/resources/compilers.pdf',
      });

    assert.equal(deptRes.status, 201);
    deptRestrictedResourceId = deptRes.body.data.id;

    // Student 1 (CSE) can access
    const cseRes = await request(app)
      .get(`/api/resources/${deptRestrictedResourceId}`)
      .set('Authorization', `Bearer ${studentToken1}`);
    assert.equal(cseRes.status, 200);

    // Student 2 (ECE) receives 403 Forbidden
    const eceRes = await request(app)
      .get(`/api/resources/${deptRestrictedResourceId}`)
      .set('Authorization', `Bearer ${studentToken2}`);
    assert.equal(eceRes.status, 403);
    assert.match(eceRes.body.message, /targeted for another department/i);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 16. Semester visibility enforced
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('16. Semester visibility enforced', async () => {
    const semRes = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Semester 5 Only Project Guide',
        resourceType: 'OTHER',
        subject: 'Mini Project',
        subjectCode: 'BCS508',
        semester: 5,
        visibility: 'SEMESTER',
        status: 'PUBLISHED',
        fileName: 'miniproject.pdf',
        fileUrl: '/uploads/resources/miniproject.pdf',
      });

    assert.equal(semRes.status, 201);
    semRestrictedResourceId = semRes.body.data.id;

    // Student 1 (Semester 5) can access
    const sem5Res = await request(app)
      .get(`/api/resources/${semRestrictedResourceId}`)
      .set('Authorization', `Bearer ${studentToken1}`);
    assert.equal(sem5Res.status, 200);

    // Student 2 (Semester 3) receives 403 Forbidden
    const sem3Res = await request(app)
      .get(`/api/resources/${semRestrictedResourceId}`)
      .set('Authorization', `Bearer ${studentToken2}`);
    assert.equal(sem3Res.status, 403);
    assert.match(sem3Res.body.message, /targeted for semester 5/i);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 17. Bookmark works
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('17. Bookmark works', async () => {
    const res = await request(app)
      .post(`/api/resources/${publishedResourceId}/bookmark`)
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.resourceId, publishedResourceId);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 18. Duplicate bookmark blocked
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('18. Duplicate bookmark blocked (409 Conflict)', async () => {
    const res = await request(app)
      .post(`/api/resources/${publishedResourceId}/bookmark`)
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(res.status, 409);
    assert.match(res.body.message, /already saved/i);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 19. Remove bookmark works
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('19. Remove bookmark works', async () => {
    const res = await request(app)
      .delete(`/api/resources/${publishedResourceId}/bookmark`)
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    // Re-bookmark for saved list testing
    await request(app)
      .post(`/api/resources/${publishedResourceId}/bookmark`)
      .set('Authorization', `Bearer ${studentToken1}`);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 20. Saved resources list works
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('20. Saved resources list works', async () => {
    const res = await request(app)
      .get('/api/resources/saved')
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.length >= 1);
    assert.equal(res.body.data[0].id, publishedResourceId);
    assert.equal(res.body.data[0].isSaved, true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 21. Search works
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('21. Search works by title or subject', async () => {
    const res = await request(app)
      .get('/api/resources?search=Database')
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.length >= 1);
    assert.equal(res.body.data[0].subject, 'Database Management Systems');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 22. Category / Resource type filtering works
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('22. Category (resourceType) filtering works', async () => {
    const notesRes = await request(app)
      .get('/api/resources?resourceType=NOTES')
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(notesRes.status, 200);
    notesRes.body.data.forEach((r) => assert.equal(r.resourceType, 'NOTES'));

    const pyqRes = await request(app)
      .get('/api/resources?resourceType=PYQ')
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(pyqRes.status, 200);
    assert.equal(pyqRes.body.data.length, 0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 23. Semester filtering works
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('23. Semester filtering works', async () => {
    const res = await request(app)
      .get('/api/resources?semester=5')
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(res.status, 200);
    res.body.data.forEach((r) => assert.equal(r.semester, 5));
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 24. Department filtering works
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('24. Department filtering works', async () => {
    const res = await request(app)
      .get(`/api/resources?departmentId=${deptCSE.id}`)
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(res.status, 200);
    res.body.data.forEach((r) => assert.equal(r.departmentId, deptCSE.id));
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 25. Subject filtering works
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('25. Subject filtering works', async () => {
    const res = await request(app)
      .get('/api/resources?subject=Database')
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.some((r) => r.subjectCode === 'BCS501'));
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 26. Pagination works
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('26. Pagination works', async () => {
    const res = await request(app)
      .get('/api/resources?page=1&limit=2')
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.length <= 2);
    assert.equal(res.body.meta.page, 1);
    assert.ok(res.body.meta.total >= 1);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 27. View count logic works
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('27. View count logic works', async () => {
    const res = await request(app)
      .post(`/api/resources/${publishedResourceId}/view`)
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.viewCount >= 1);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 28. Download access authorization works
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('28. Download access authorization works and redirects/streams', async () => {
    const res = await request(app)
      .get(`/api/resources/${publishedResourceId}/download`)
      .set('Authorization', `Bearer ${studentToken1}`);

    // Since mock fileUrl is /uploads/resources/dbms-mod1.pdf and no real physical file was written,
    // it falls back to redirecting to the URL
    assert.ok(res.status === 302 || res.status === 200);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 29. Unauthorized download blocked
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('29. Unauthorized download blocked for foreign college student', async () => {
    const res = await request(app)
      .get(`/api/resources/${publishedResourceId}/download`)
      .set('Authorization', `Bearer ${foreignToken}`);

    assert.equal(res.status, 403);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 30. Resource reporting works
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('30. Resource reporting works', async () => {
    const res = await request(app)
      .post(`/api/resources/${publishedResourceId}/report`)
      .set('Authorization', `Bearer ${studentToken1}`)
      .send({
        category: 'Incorrect content',
        description: 'Page 4 formula is outdated according to 2026 syllabus.',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.category, 'Incorrect content');

    // Duplicate report returns 409
    const dupRes = await request(app)
      .post(`/api/resources/${publishedResourceId}/report`)
      .set('Authorization', `Bearer ${studentToken1}`)
      .send({
        category: 'Incorrect content',
        description: 'Duplicate report attempt.',
      });

    assert.equal(dupRes.status, 409);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 31, 32, 33, 34. Admin moderation workflow: Approve, Reject with reason & AuditLog
  // ──────────────────────────────────────────────────────────────────────────
  let reviewResourceId;

  await t.test('31, 32, 33, 34. Admin moderation: Approve, Reject requires reason, and creates AuditLog', async () => {
    // Create resource in PENDING_REVIEW
    const createRes = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${teacherToken1}`)
      .send({
        title: 'Computer Networks Question Bank 2025',
        resourceType: 'QUESTION_BANK',
        subject: 'Computer Networks',
        subjectCode: 'BCS504',
        fileName: 'cn_qb.pdf',
        fileUrl: '/uploads/resources/cn_qb.pdf',
        status: 'PENDING_REVIEW',
      });

    assert.equal(createRes.status, 201);
    reviewResourceId = createRes.body.data.id;

    // 33. Rejection requires reason
    const failReject = await request(app)
      .patch(`/api/admin/resources/${reviewResourceId}/moderate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'reject' }); // no reason

    assert.equal(failReject.status, 400);
    assert.match(failReject.body.message, /rejection reason is required/i);

    // 32. Rejection with reason works
    const rejectRes = await request(app)
      .patch(`/api/admin/resources/${reviewResourceId}/moderate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'reject', reason: 'Missing answer keys for module 3' });

    assert.equal(rejectRes.status, 200);
    assert.equal(rejectRes.body.data.status, 'REJECTED');
    assert.equal(rejectRes.body.data.moderationReason, 'Missing answer keys for module 3');

    // Verify rejection notification was created for teacher
    const teacherNotifs = await Notification.findAll({
      where: { userId: teacherUser1.id, type: 'RESOURCE_REJECTED' },
    });
    assert.ok(teacherNotifs.length >= 1);

    // 31. Admin approves resource
    const approveRes = await request(app)
      .patch(`/api/admin/resources/${reviewResourceId}/moderate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'approve' });

    assert.equal(approveRes.status, 200);
    assert.equal(approveRes.body.data.status, 'PUBLISHED');

    // 34. AuditLog created for sensitive moderation actions
    const auditLogs = await AuditLog.findAll({
      where: {
        actorId: adminUser.id,
        category: 'RESOURCE_MODERATION',
      },
    });
    assert.ok(auditLogs.length >= 2); // rejected + approved
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 35. Teacher sees own resource statistics
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('35. Teacher sees own resource statistics', async () => {
    const res = await request(app)
      .get('/api/teacher/resources/stats')
      .set('Authorization', `Bearer ${teacherToken1}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.total >= 2);
    assert.ok(res.body.data.published >= 1);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 36. Student cannot access private resource
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('36. Student cannot access private resource', async () => {
    const privRes = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Private Teacher Exam Draft Solutions',
        resourceType: 'OTHER',
        subject: 'Database Systems',
        subjectCode: 'BCS501',
        visibility: 'PRIVATE',
        status: 'PUBLISHED',
        fileName: 'exam_solutions.pdf',
        fileUrl: '/uploads/resources/solutions.pdf',
      });

    assert.equal(privRes.status, 201);
    const privId = privRes.body.data.id;

    const accessRes = await request(app)
      .get(`/api/resources/${privId}`)
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(accessRes.status, 403);
    assert.match(accessRes.body.message, /marked as private/i);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 37. Cross-college access blocked in admin moderation
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('37. Cross-college moderation blocked for foreign admin', async () => {
    const foreignAdmin = await User.create({
      email: 'admin.foreign@bmsce.ac.in',
      role: 'admin',
      accountStatus: 'active',
      isAdminVerified: true,
      collegeId: college2.id,
    });
    const foreignAdminToken = generateAccessToken({ id: foreignAdmin.id, role: 'admin', collegeId: college2.id });

    const modRes = await request(app)
      .patch(`/api/admin/resources/${publishedResourceId}/moderate`)
      .set('Authorization', `Bearer ${foreignAdminToken}`)
      .send({ action: 'archive' });

    assert.equal(modRes.status, 403);
    assert.match(modRes.body.message, /cross-college/i);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 38 & 39. Resource archive works and is hidden from normal student discovery
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('38 & 39. Resource archive works and hides resource from student discovery', async () => {
    const archiveRes = await request(app)
      .post(`/api/resources/${publishedResourceId}/archive`)
      .set('Authorization', `Bearer ${teacherToken1}`);

    assert.equal(archiveRes.status, 200);
    assert.equal(archiveRes.body.data.status, 'ARCHIVED');

    // 39. Student can no longer find it in discovery
    const studentSearch = await request(app)
      .get(`/api/resources?search=Database%20Systems%20Module%201`)
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(studentSearch.status, 200);
    assert.equal(studentSearch.body.data.some((r) => r.id === publishedResourceId), false);

    // Un-archive (re-publish) for any further tests
    await Resource.update({ status: 'PUBLISHED' }, { where: { id: publishedResourceId } });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 40. Full lifecycle integration test
  // ──────────────────────────────────────────────────────────────────────────
  await t.test('40. Full lifecycle integration test: Teacher upload -> Admin review -> Student discover & save -> Download & View -> Report -> AuditLog', async () => {
    // 1. Teacher uploads PDF resource into review workflow
    const uploadRes = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${teacherToken1}`)
      .send({
        title: 'Full Lifecycle AI & ML Comprehensive Study Pack',
        description: 'Complete lecture notes, past papers and lab code for 2026',
        resourceType: 'STUDY_MATERIAL',
        subject: 'Artificial Intelligence & Machine Learning',
        subjectCode: 'BCS602',
        departmentId: deptCSE.id,
        semester: 5,
        academicYear: '2025-26',
        tags: ['AI', 'ML', 'Python', 'VTU'],
        fileName: 'aiml_full_pack.pdf',
        fileUrl: '/uploads/resources/aiml_full_pack.pdf',
        status: 'PENDING_REVIEW',
      });

    assert.equal(uploadRes.status, 201);
    const lifeResourceId = uploadRes.body.data.id;
    assert.equal(uploadRes.body.data.status, 'PENDING_REVIEW');

    // 2. Admin inspects pending queue and approves
    const pendingList = await request(app)
      .get('/api/admin/resources/pending')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(pendingList.status, 200);
    assert.ok(pendingList.body.data.some((r) => r.id === lifeResourceId));

    const approveRes = await request(app)
      .patch(`/api/admin/resources/${lifeResourceId}/moderate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'approve' });

    assert.equal(approveRes.status, 200);
    assert.equal(approveRes.body.data.status, 'PUBLISHED');

    // 3. Student discovers resource
    const discoverRes = await request(app)
      .get('/api/resources?search=Artificial%20Intelligence')
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(discoverRes.status, 200);
    assert.ok(discoverRes.body.data.some((r) => r.id === lifeResourceId));

    // 4. Student opens details
    const detailsRes = await request(app)
      .get(`/api/resources/${lifeResourceId}`)
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(detailsRes.status, 200);
    assert.equal(detailsRes.body.data.subjectCode, 'BCS602');
    assert.equal(detailsRes.body.data.isSaved, false);

    // 5. Student saves/bookmarks resource
    const bookmarkRes = await request(app)
      .post(`/api/resources/${lifeResourceId}/bookmark`)
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(bookmarkRes.status, 201);

    // 6. Student records view and downloads
    const viewRes = await request(app)
      .post(`/api/resources/${lifeResourceId}/view`)
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(viewRes.status, 200);
    assert.ok(viewRes.body.data.viewCount >= 1);

    const downloadRes = await request(app)
      .get(`/api/resources/${lifeResourceId}/download`)
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.ok(downloadRes.status === 200 || downloadRes.status === 302);

    // 7. Student reports resource
    const reportRes = await request(app)
      .post(`/api/resources/${lifeResourceId}/report`)
      .set('Authorization', `Bearer ${studentToken1}`)
      .send({
        category: 'Copyright concern',
        description: 'Contains chapter 3 from proprietary textbook.',
      });

    assert.equal(reportRes.status, 201);

    // 8. Admin reviews and takes moderation action (archive)
    const archiveRes = await request(app)
      .patch(`/api/admin/resources/${lifeResourceId}/moderate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'archive' });

    assert.equal(archiveRes.status, 200);
    assert.equal(archiveRes.body.data.status, 'ARCHIVED');

    // 9. Audit log verified
    const finalAudit = await AuditLog.findOne({
      where: {
        actorId: adminUser.id,
        action: 'RESOURCE_ARCHIVED',
        category: 'RESOURCE_MODERATION',
      },
    });
    assert.ok(finalAudit);
    assert.equal(finalAudit.details.resourceId, lifeResourceId);
  });
});
