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
  Club,
  ClubMembership,
  ClubOfficer,
  ClubAnnouncement,
  ClubActivity,
  ClubElection,
  ClubElectionPosition,
  ClubCandidate,
  ClubVote,
  Event,
  Report,
  AuditLog,
  Notification,
} = require('../src/models');
const { generateAccessToken } = require('../src/utils/jwt');
const collegeService = require('../src/services/collegeService');

test('CAMPUS CLUBS, STUDENT CHAPTERS & SOCIETIES MODULE TEST SUITE', async (t) => {
  let college1, college2;
  let deptCSE, deptECE;
  let adminUser, adminToken;
  let foreignAdminUser, foreignAdminToken;
  let teacherUser, teacherToken;
  let founderStudent, founderProfile, founderToken;
  let memberStudent, memberProfile, memberToken;
  let voterStudent, voterProfile, voterToken;
  let nonMemberStudent, nonMemberProfile, nonMemberToken;
  let foreignStudent, foreignProfile, foreignToken;

  let proposedClub, activeClub, rejectedClubCandidate;
  let memberJoinReq;
  let testOfficer;
  let testAnnouncement;
  let testActivity;
  let testElection, testPosition, testCandidate;

  await sequelize.sync({ force: true });
  college1 = await collegeService.getDefaultCollege();

  college2 = await College.create({
    name: 'National Institute of Technology Karnataka',
    code: 'NITK',
    domain: 'nitk.ac.in',
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

  // Admin College 1
  adminUser = await User.create({
    email: 'admin.clubs@institution.edu',
    passwordHash: 'hash',
    role: 'admin',
    adminRole: 'ADMIN',
    accountStatus: 'active',
    isEmailVerified: true,
    collegeId: college1.id,
  });
  adminToken = generateAccessToken({ id: adminUser.id, email: adminUser.email, role: 'admin', collegeId: college1.id });

  // Admin College 2 (Foreign)
  foreignAdminUser = await User.create({
    email: 'admin@nitk.ac.in',
    passwordHash: 'hash',
    role: 'admin',
    adminRole: 'ADMIN',
    accountStatus: 'active',
    isEmailVerified: true,
    collegeId: college2.id,
  });
  foreignAdminToken = generateAccessToken({ id: foreignAdminUser.id, email: foreignAdminUser.email, role: 'admin', collegeId: college2.id });

  // Teacher College 1
  teacherUser = await User.create({
    email: 'teacher.clubs@institution.edu',
    passwordHash: 'hash',
    role: 'teacher',
    accountStatus: 'active',
    isEmailVerified: true,
    collegeId: college1.id,
  });
  await TeacherProfile.create({
    userId: teacherUser.id,
    teacherId: 'T-CLUBS-101',
    fullName: 'Dr. Alan Turing',
    college: college1.name,
    department: 'CSE',
    departmentId: deptCSE.id,
  });
  teacherToken = generateAccessToken({ id: teacherUser.id, email: teacherUser.email, role: 'teacher', collegeId: college1.id });

  // Founder Student
  founderStudent = await User.create({
    email: 'founder@student.institution.edu',
    passwordHash: 'hash',
    role: 'student',
    accountStatus: 'active',
    isEmailVerified: true,
    collegeId: college1.id,
  });
  founderProfile = await StudentProfile.create({
    userId: founderStudent.id,
    usn: '1RV21CS001',
    fullName: 'Aarav Sharma',
    college: college1.name,
    department: 'CSE',
    departmentId: deptCSE.id,
    semester: 6,
  });
  founderToken = generateAccessToken({ id: founderStudent.id, email: founderStudent.email, role: 'student', collegeId: college1.id });

  // Member Student
  memberStudent = await User.create({
    email: 'member@student.institution.edu',
    passwordHash: 'hash',
    role: 'student',
    accountStatus: 'active',
    isEmailVerified: true,
    collegeId: college1.id,
  });
  memberProfile = await StudentProfile.create({
    userId: memberStudent.id,
    usn: '1RV21CS002',
    fullName: 'Bhavna Patel',
    college: college1.name,
    department: 'CSE',
    departmentId: deptCSE.id,
    semester: 6,
  });
  memberToken = generateAccessToken({ id: memberStudent.id, email: memberStudent.email, role: 'student', collegeId: college1.id });

  // Voter Student
  voterStudent = await User.create({
    email: 'voter@student.institution.edu',
    passwordHash: 'hash',
    role: 'student',
    accountStatus: 'active',
    isEmailVerified: true,
    collegeId: college1.id,
  });
  voterProfile = await StudentProfile.create({
    userId: voterStudent.id,
    usn: '1RV21CS003',
    fullName: 'Chirag Rao',
    college: college1.name,
    department: 'CSE',
    departmentId: deptCSE.id,
    semester: 6,
  });
  voterToken = generateAccessToken({ id: voterStudent.id, email: voterStudent.email, role: 'student', collegeId: college1.id });

  // Non-member Student
  nonMemberStudent = await User.create({
    email: 'outsider@student.institution.edu',
    passwordHash: 'hash',
    role: 'student',
    accountStatus: 'active',
    isEmailVerified: true,
    collegeId: college1.id,
  });
  nonMemberProfile = await StudentProfile.create({
    userId: nonMemberStudent.id,
    usn: '1RV21CS004',
    fullName: 'Divya Sen',
    college: college1.name,
    department: 'CSE',
    departmentId: deptCSE.id,
    semester: 6,
  });
  nonMemberToken = generateAccessToken({ id: nonMemberStudent.id, email: nonMemberStudent.email, role: 'student', collegeId: college1.id });

  // Foreign Student (College 2)
  foreignStudent = await User.create({
    email: 'student@nitk.ac.in',
    passwordHash: 'hash',
    role: 'student',
    accountStatus: 'active',
    isEmailVerified: true,
    collegeId: college2.id,
  });
  foreignProfile = await StudentProfile.create({
    userId: foreignStudent.id,
    usn: 'NITK21CS01',
    fullName: 'Foreign Peer',
    college: college2.name,
    department: 'CSE',
    semester: 6,
  });
  foreignToken = generateAccessToken({ id: foreignStudent.id, email: foreignStudent.email, role: 'student', collegeId: college2.id });

  // Seed an existing active club for immediate discovery tests
  const initialActiveClub = await Club.create({
    collegeId: college1.id,
    departmentId: deptCSE.id,
    name: 'Google Developer Student Club',
    shortName: 'GDSC',
    description: 'Community groups for college and university students interested in Google developer technologies.',
    category: 'TECHNICAL',
    status: 'ACTIVE',
    membershipApprovalRequired: false,
    electionsEnabled: true,
    createdBy: founderStudent.id,
  });
  await ClubMembership.create({
    clubId: initialActiveClub.id,
    studentId: founderStudent.id,
    status: 'ACTIVE',
    role: 'PRESIDENT',
    isCurrent: true,
  });

  // Seed another active club in a different category and department
  const culturalClub = await Club.create({
    collegeId: college1.id,
    departmentId: deptECE.id,
    name: 'Rhythm & Beats Cultural Society',
    shortName: 'RBCS',
    description: 'Music, drama, and campus cultural performances.',
    category: 'CULTURAL',
    status: 'ACTIVE',
    membershipApprovalRequired: true,
    electionsEnabled: false,
    createdBy: teacherUser.id,
  });

  // ── TEST 1: Student can discover active clubs ───────────────────────────────
  await t.test('1. Student can discover active clubs', async () => {
    const res = await request(app)
      .get('/api/clubs')
      .set('Authorization', `Bearer ${memberToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(Array.isArray(res.body.data), true);
    assert.equal(res.body.data.length >= 2, true);
    const names = res.body.data.map((c) => c.name);
    assert.equal(names.includes('Google Developer Student Club'), true);
  });

  // ── TEST 2: Search works ───────────────────────────────────────────────────
  await t.test('2. Search works by club name and short name', async () => {
    const res = await request(app)
      .get('/api/clubs?search=GDSC')
      .set('Authorization', `Bearer ${memberToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].shortName, 'GDSC');
  });

  // ── TEST 3: Category filtering works ───────────────────────────────────────
  await t.test('3. Category filtering works', async () => {
    const res = await request(app)
      .get('/api/clubs?category=CULTURAL')
      .set('Authorization', `Bearer ${memberToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].name, 'Rhythm & Beats Cultural Society');
  });

  // ── TEST 4: Department filtering works ─────────────────────────────────────
  await t.test('4. Department filtering works', async () => {
    const res = await request(app)
      .get(`/api/clubs?departmentId=${deptECE.id}`)
      .set('Authorization', `Bearer ${memberToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].shortName, 'RBCS');
  });

  // ── TEST 5: Student can submit club proposal ───────────────────────────────
  await t.test('5. Student can submit club proposal (status PENDING_REVIEW)', async () => {
    const res = await request(app)
      .post('/api/clubs')
      .set('Authorization', `Bearer ${founderToken}`)
      .send({
        name: 'ACM Student Chapter',
        shortName: 'ACM',
        description: 'Association for Computing Machinery student branch dedicated to computing excellence.',
        category: 'TECHNICAL',
        departmentId: deptCSE.id,
        foundedYear: 2024,
        contactEmail: 'acm@student.institution.edu',
        membershipApprovalRequired: true,
        electionsEnabled: true,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.name, 'ACM Student Chapter');
    assert.equal(res.body.data.status, 'PENDING_REVIEW');
    proposedClub = res.body.data;
  });

  // ── TEST 6: Student cannot activate own club ───────────────────────────────
  await t.test('6. Student cannot activate own club directly', async () => {
    const res = await request(app)
      .patch(`/api/clubs/${proposedClub.id}`)
      .set('Authorization', `Bearer ${founderToken}`)
      .send({ status: 'ACTIVE' });

    assert.equal(res.status, 403);
    const check = await Club.findByPk(proposedClub.id);
    assert.equal(check.status, 'PENDING_REVIEW');
  });

  // ── TEST 7: Admin can approve club ─────────────────────────────────────────
  await t.test('7. Admin can approve club (activates club, founder becomes President)', async () => {
    const res = await request(app)
      .patch(`/api/admin/clubs/${proposedClub.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'ACTIVE');

    activeClub = res.body.data;

    // Verify creator membership is now ACTIVE with role PRESIDENT
    const founderMem = await ClubMembership.findOne({
      where: { clubId: activeClub.id, studentId: founderStudent.id },
    });
    assert.equal(founderMem.status, 'ACTIVE');
    assert.equal(founderMem.role, 'PRESIDENT');
  });

  // ── TEST 8: Admin can reject club ─────────────────────────────────────────
  await t.test('8. Admin can reject club with reason', async () => {
    // Submit a dummy club to reject
    const propRes = await request(app)
      .post('/api/clubs')
      .set('Authorization', `Bearer ${nonMemberToken}`)
      .send({
        name: 'Video Game Testing Society',
        shortName: 'VGTS',
        description: 'Casual gaming club.',
        category: 'HOBBY',
      });
    assert.equal(propRes.status, 201);
    rejectedClubCandidate = propRes.body.data;

    const res = await request(app)
      .patch(`/api/admin/clubs/${rejectedClubCandidate.id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Does not align with campus academic or co-curricular standards' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'ARCHIVED');

    const audit = await AuditLog.findOne({ where: { action: 'CLUB_REJECTED' } });
    assert.notEqual(audit, null);
  });

  // ── TEST 9: Admin can suspend club ─────────────────────────────────────────
  await t.test('9. Admin can suspend club', async () => {
    const res = await request(app)
      .patch(`/api/admin/clubs/${culturalClub.id}/suspend`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Pending disciplinary investigation' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'SUSPENDED');
  });

  // ── TEST 10: Unapproved club not publicly discoverable ─────────────────────
  await t.test('10. Unapproved or suspended club not publicly discoverable in student catalog', async () => {
    const res = await request(app)
      .get('/api/clubs')
      .set('Authorization', `Bearer ${memberToken}`);

    assert.equal(res.status, 200);
    const ids = res.body.data.map((c) => c.id);
    assert.equal(ids.includes(rejectedClubCandidate.id), false);
    assert.equal(ids.includes(culturalClub.id), false);
  });

  // ── TEST 11: Student can request membership ─────────────────────────────────
  await t.test('11. Student can request membership (status PENDING)', async () => {
    const res = await request(app)
      .post(`/api/clubs/${activeClub.id}/join`)
      .set('Authorization', `Bearer ${memberToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'PENDING');
    memberJoinReq = res.body.data;
  });

  // ── TEST 12: Duplicate membership blocked ───────────────────────────────────
  await t.test('12. Duplicate membership request blocked with 409 Conflict', async () => {
    const res = await request(app)
      .post(`/api/clubs/${activeClub.id}/join`)
      .set('Authorization', `Bearer ${memberToken}`);

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
  });

  // ── TEST 13: Membership approval works ─────────────────────────────────────
  await t.test('13. Membership approval works (sets status ACTIVE)', async () => {
    const res = await request(app)
      .patch(`/api/clubs/membership-requests/${memberJoinReq.id}/approve`)
      .set('Authorization', `Bearer ${founderToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'ACTIVE');
  });

  // ── TEST 14: Membership rejection works ─────────────────────────────────────
  await t.test('14. Membership rejection works (sets status REJECTED)', async () => {
    // Non-member requests to join
    const joinRes = await request(app)
      .post(`/api/clubs/${activeClub.id}/join`)
      .set('Authorization', `Bearer ${nonMemberToken}`);
    assert.equal(joinRes.status, 200);

    const res = await request(app)
      .patch(`/api/clubs/membership-requests/${joinRes.body.data.id}/reject`)
      .set('Authorization', `Bearer ${founderToken}`)
      .send({ reason: 'Cohort capacity reached' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'REJECTED');
  });

  // ── TEST 15: Student can leave club ─────────────────────────────────────────
  await t.test('15. Student can leave club (sets status LEFT)', async () => {
    // Reapply and approve nonMemberStudent first
    await request(app)
      .post(`/api/clubs/${activeClub.id}/join`)
      .set('Authorization', `Bearer ${nonMemberToken}`);

    const mem = await ClubMembership.findOne({
      where: { clubId: activeClub.id, studentId: nonMemberStudent.id },
    });
    await request(app)
      .patch(`/api/clubs/membership-requests/${mem.id}/approve`)
      .set('Authorization', `Bearer ${founderToken}`);

    const leaveRes = await request(app)
      .delete(`/api/clubs/${activeClub.id}/join`)
      .set('Authorization', `Bearer ${nonMemberToken}`);

    assert.equal(leaveRes.status, 200);
    assert.equal(leaveRes.body.success, true);

    const memCheck = await ClubMembership.findOne({
      where: { clubId: activeClub.id, studentId: nonMemberStudent.id },
    });
    assert.equal(memCheck.status, 'LEFT');
  });

  // ── TEST 16: Member cannot manage club ─────────────────────────────────────
  await t.test('16. Member cannot manage club (403 Forbidden)', async () => {
    const res = await request(app)
      .patch(`/api/clubs/${activeClub.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ description: 'Hacked description by normal member' });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  // ── TEST 17: Officer permissions work ───────────────────────────────────────
  await t.test('17. Officer permissions work (appoint officer and verify)', async () => {
    const res = await request(app)
      .post(`/api/clubs/${activeClub.id}/officers`)
      .set('Authorization', `Bearer ${founderToken}`)
      .send({
        studentId: memberStudent.id,
        position: 'Vice President',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.position, 'Vice President');
    testOfficer = res.body.data;

    const mem = await ClubMembership.findOne({
      where: { clubId: activeClub.id, studentId: memberStudent.id },
    });
    assert.equal(mem.role, 'OFFICER');
  });

  // ── TEST 18: President permissions work ─────────────────────────────────────
  await t.test('18. President permissions work (manage club settings & officers)', async () => {
    const res = await request(app)
      .patch(`/api/clubs/${activeClub.id}`)
      .set('Authorization', `Bearer ${founderToken}`)
      .send({ meetingLocation: 'Room 401, CS Block' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.meetingLocation, 'Room 401, CS Block');
  });

  // ── TEST 19: Student cannot self-promote ───────────────────────────────────
  await t.test('19. Student cannot self-promote (403 Forbidden)', async () => {
    const mem = await ClubMembership.findOne({
      where: { clubId: activeClub.id, studentId: memberStudent.id },
    });

    const res = await request(app)
      .patch(`/api/clubs/members/${mem.id}/promote`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ newRole: 'PRESIDENT' });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  // ── TEST 20: Club announcement creation works ───────────────────────────────
  await t.test('20. Club announcement creation works (stores pinned status)', async () => {
    // Also approve voterStudent as an active member to receive notifications
    await request(app)
      .post(`/api/clubs/${activeClub.id}/join`)
      .set('Authorization', `Bearer ${voterToken}`);
    const voterMem = await ClubMembership.findOne({
      where: { clubId: activeClub.id, studentId: voterStudent.id },
    });
    await request(app)
      .patch(`/api/clubs/membership-requests/${voterMem.id}/approve`)
      .set('Authorization', `Bearer ${founderToken}`);

    const res = await request(app)
      .post(`/api/clubs/${activeClub.id}/announcements`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        title: 'Weekly Hack Night',
        content: 'Join us this Friday at 5 PM in Turing Lab for our ACM Hack Night!',
        pinned: true,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.title, 'Weekly Hack Night');
    assert.equal(res.body.data.pinned, true);
    testAnnouncement = res.body.data;
  });

  // ── TEST 21: Unauthorized announcement creation blocked ─────────────────────
  await t.test('21. Unauthorized announcement creation blocked (403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/clubs/${activeClub.id}/announcements`)
      .set('Authorization', `Bearer ${nonMemberToken}`)
      .send({ title: 'Spam Notice', content: 'Unauthorized advertisement' });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  // ── TEST 22: Announcement editing authorization works ───────────────────────
  await t.test('22. Announcement editing authorization works (author can edit, non-member blocked)', async () => {
    // Non-member edit -> 403
    const blockedRes = await request(app)
      .patch(`/api/clubs/announcements/${testAnnouncement.id}`)
      .set('Authorization', `Bearer ${nonMemberToken}`)
      .send({ title: 'Tampered' });
    assert.equal(blockedRes.status, 403);

    // Author (memberStudent) edit -> 200
    const editRes = await request(app)
      .patch(`/api/clubs/announcements/${testAnnouncement.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ title: 'Weekly Hack Night (Updated Venue)' });

    assert.equal(editRes.status, 200);
    assert.equal(editRes.body.data.title, 'Weekly Hack Night (Updated Venue)');
  });

  // ── TEST 23: Announcement deletion authorization works ─────────────────────
  await t.test('23. Announcement deletion authorization works (officer/leader can delete)', async () => {
    // Create an announcement to delete
    const annRes = await request(app)
      .post(`/api/clubs/${activeClub.id}/announcements`)
      .set('Authorization', `Bearer ${founderToken}`)
      .send({ title: 'Temporary Note', content: 'Will be deleted' });

    const delId = annRes.body.data.id;
    const res = await request(app)
      .delete(`/api/clubs/announcements/${delId}`)
      .set('Authorization', `Bearer ${founderToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  // ── TEST 24: Notification created ──────────────────────────────────────────
  await t.test('24. Notification created for club announcement', async () => {
    const notif = await Notification.findOne({
      where: { userId: voterStudent.id, type: 'CLUB_ANNOUNCEMENT' },
    });
    assert.notEqual(notif, null);
    assert.match(notif.title, /Hack Night/i);
  });

  // ── TEST 25: Club activity creation works ───────────────────────────────────
  await t.test('25. Club activity creation works', async () => {
    const res = await request(app)
      .post(`/api/clubs/${activeClub.id}/activities`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        title: 'Core Committee Strategy Sync',
        description: 'Internal leadership and sprint planning session.',
        activityType: 'MEETING',
        location: 'Room 304',
        startAt: new Date(Date.now() + 86400000).toISOString(),
        visibility: 'CLUB_ONLY',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.title, 'Core Committee Strategy Sync');
    testActivity = res.body.data;
  });

  // ── TEST 26: Club activity privacy works ───────────────────────────────────
  await t.test('26. Club activity privacy works (CLUB_ONLY hidden from non-members)', async () => {
    // Also create a COLLEGE visible activity
    await request(app)
      .post(`/api/clubs/${activeClub.id}/activities`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        title: 'Open Campus Tech Talk',
        description: 'Open to all students across the institute.',
        activityType: 'WORKSHOP',
        location: 'Main Auditorium',
        startAt: new Date(Date.now() + 172800000).toISOString(),
        visibility: 'COLLEGE',
      });

    // Active member sees both activities
    const memView = await request(app)
      .get(`/api/clubs/${activeClub.id}/activities`)
      .set('Authorization', `Bearer ${voterToken}`);
    assert.equal(memView.status, 200);
    assert.equal(memView.body.data.length, 2);

    // Non-member student only sees COLLEGE activity
    const outView = await request(app)
      .get(`/api/clubs/${activeClub.id}/activities`)
      .set('Authorization', `Bearer ${nonMemberToken}`);
    assert.equal(outView.status, 200);
    assert.equal(outView.body.data.length, 1);
    assert.equal(outView.body.data[0].title, 'Open Campus Tech Talk');
  });

  // ── TEST 27: Event-to-club association works ───────────────────────────────
  await t.test('27. Event-to-club association works (Event.clubId linked)', async () => {
    const event = await Event.create({
      collegeId: college1.id,
      createdBy: founderStudent.id,
      title: 'ACM Annual Hackathon',
      description: 'Campus-wide hackathon powered by ACM.',
      category: 'hackathon',
      eventType: 'in_person',
      organizerName: 'ACM Student Chapter',
      venue: 'Main Seminar Hall',
      startDateTime: new Date(Date.now() + 300000),
      endDateTime: new Date(Date.now() + 600000),
      status: 'PUBLISHED',
      clubId: activeClub.id,
    });

    assert.equal(event.clubId, activeClub.id);
    const clubWithEvents = await Club.findByPk(activeClub.id, {
      include: [{ model: Event, as: 'events' }],
    });
    assert.equal(clubWithEvents.events.length, 1);
    assert.equal(clubWithEvents.events[0].title, 'ACM Annual Hackathon');
  });

  // ── TEST 28: Cross-college club access blocked ─────────────────────────────
  await t.test('28. Cross-college club access blocked (404 Not Found)', async () => {
    const res = await request(app)
      .get(`/api/clubs/${activeClub.id}`)
      .set('Authorization', `Bearer ${foreignToken}`);

    assert.equal(res.status, 404);
  });

  // ── TEST 29: Cross-college membership blocked ───────────────────────────────
  await t.test('29. Cross-college membership blocked', async () => {
    const res = await request(app)
      .post(`/api/clubs/${activeClub.id}/join`)
      .set('Authorization', `Bearer ${foreignToken}`);

    assert.equal(res.status, 404);
  });

  // ── TEST 30: IDOR protection works ─────────────────────────────────────────
  await t.test('30. IDOR protection works (cannot modify foreign college club)', async () => {
    const res = await request(app)
      .patch(`/api/admin/clubs/${activeClub.id}/suspend`)
      .set('Authorization', `Bearer ${foreignAdminToken}`)
      .send({ reason: 'Malicious attempt' });

    assert.equal(res.status, 404);
  });

  // ── TEST 31: Election creation works ───────────────────────────────────────
  await t.test('31. Election creation works (creates DRAFT election)', async () => {
    const now = Date.now();
    const res = await request(app)
      .post(`/api/clubs/${activeClub.id}/elections`)
      .set('Authorization', `Bearer ${founderToken}`)
      .send({
        title: 'ACM Executive Board Elections 2026',
        description: 'Annual election for the new ACM Executive Board.',
        startAt: new Date(now - 10000).toISOString(),
        endAt: new Date(now + 3600000).toISOString(),
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.status, 'DRAFT');
    testElection = res.body.data;
  });

  // ── TEST 32: Election position creation works ───────────────────────────────
  await t.test('32. Election position creation works', async () => {
    const res = await request(app)
      .post(`/api/clubs/elections/${testElection.id}/positions`)
      .set('Authorization', `Bearer ${founderToken}`)
      .send({
        title: 'President',
        maxWinners: 1,
        description: 'Executive head of the student chapter',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.title, 'President');
    testPosition = res.body.data;
  });

  // ── TEST 33: Candidate nomination works ─────────────────────────────────────
  await t.test('33. Candidate nomination works', async () => {
    const res = await request(app)
      .post(`/api/clubs/elections/positions/${testPosition.id}/nominate`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ manifesto: 'Dedicated to computing workshops and open-source hackathons.' });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.approved, false);
    testCandidate = res.body.data;
  });

  // ── TEST 34: Ineligible candidate blocked ───────────────────────────────────
  await t.test('34. Ineligible candidate blocked (non-members cannot nominate)', async () => {
    const res = await request(app)
      .post(`/api/clubs/elections/positions/${testPosition.id}/nominate`)
      .set('Authorization', `Bearer ${nonMemberToken}`)
      .send({ manifesto: 'I am not a member' });

    assert.equal(res.status, 403);
  });

  // ── TEST 35: Election cannot open without valid configuration ───────────────
  await t.test('35. Election cannot open without valid configuration (approved candidates)', async () => {
    const res = await request(app)
      .post(`/api/clubs/elections/${testElection.id}/open`)
      .set('Authorization', `Bearer ${founderToken}`);

    assert.equal(res.status, 400);
    assert.match(res.body.message, /approved candidate/i);

    // Approve the candidate to proceed
    const appRes = await request(app)
      .patch(`/api/clubs/elections/candidates/${testCandidate.id}/approve`)
      .set('Authorization', `Bearer ${founderToken}`);
    assert.equal(appRes.status, 200);
    assert.equal(appRes.body.data.approved, true);
  });

  // ── TEST 36: Eligible member can vote ───────────────────────────────────────
  await t.test('36. Eligible member can vote in open election', async () => {
    // Open election
    const openRes = await request(app)
      .post(`/api/clubs/elections/${testElection.id}/open`)
      .set('Authorization', `Bearer ${founderToken}`);
    assert.equal(openRes.status, 200);
    assert.equal(openRes.body.data.status, 'OPEN');

    // Eligible active member (voterStudent) votes
    const res = await request(app)
      .post(`/api/clubs/elections/${testElection.id}/vote`)
      .set('Authorization', `Bearer ${voterToken}`)
      .send({ positionId: testPosition.id, candidateId: testCandidate.id });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  // ── TEST 37: Non-member cannot vote ─────────────────────────────────────────
  await t.test('37. Non-member cannot vote (403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/clubs/elections/${testElection.id}/vote`)
      .set('Authorization', `Bearer ${nonMemberToken}`)
      .send({ positionId: testPosition.id, candidateId: testCandidate.id });

    assert.equal(res.status, 403);
  });

  // ── TEST 38: Duplicate vote blocked ─────────────────────────────────────────
  await t.test('38. Duplicate vote blocked (409 Conflict)', async () => {
    const res = await request(app)
      .post(`/api/clubs/elections/${testElection.id}/vote`)
      .set('Authorization', `Bearer ${voterToken}`)
      .send({ positionId: testPosition.id, candidateId: testCandidate.id });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
  });

  // ── TEST 39: Vote before election opened is blocked ─────────────────────────
  await t.test('39. Vote before election window starts is blocked (400 Bad Request)', async () => {
    const futureElect = await ClubElection.create({
      clubId: activeClub.id,
      title: 'Future Election',
      description: 'Scheduled next month',
      startAt: new Date(Date.now() + 86400000), // starts tomorrow
      endAt: new Date(Date.now() + 172800000),
      status: 'OPEN',
      createdBy: founderStudent.id,
    });

    const res = await request(app)
      .post(`/api/clubs/elections/${futureElect.id}/vote`)
      .set('Authorization', `Bearer ${voterToken}`)
      .send({ positionId: testPosition.id, candidateId: testCandidate.id });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /not yet started/i);
  });

  // ── TEST 40: Vote after election closed is blocked ─────────────────────────
  await t.test('40. Vote after election window expires is blocked (400 Bad Request)', async () => {
    const expiredElect = await ClubElection.create({
      clubId: activeClub.id,
      title: 'Past Election',
      description: 'Expired yesterday',
      startAt: new Date(Date.now() - 172800000),
      endAt: new Date(Date.now() - 86400000), // ended yesterday
      status: 'OPEN',
      createdBy: founderStudent.id,
    });

    const res = await request(app)
      .post(`/api/clubs/elections/${expiredElect.id}/vote`)
      .set('Authorization', `Bearer ${voterToken}`)
      .send({ positionId: testPosition.id, candidateId: testCandidate.id });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /deadline has passed/i);
  });

  // ── TEST 41: Unapproved candidate cannot receive vote ───────────────────────
  await t.test('41. Unapproved candidate cannot receive vote (400 Bad Request)', async () => {
    const unapprovedCand = await ClubCandidate.create({
      electionPositionId: testPosition.id,
      studentId: founderStudent.id,
      manifesto: 'Pending review',
      approved: false,
    });

    const res = await request(app)
      .post(`/api/clubs/elections/${testElection.id}/vote`)
      .set('Authorization', `Bearer ${founderToken}`)
      .send({ positionId: testPosition.id, candidateId: unapprovedCand.id });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /approved candidate/i);
  });

  // ── TEST 42: Election close works ───────────────────────────────────────────
  await t.test('42. Election close works (changes status to CLOSED)', async () => {
    const res = await request(app)
      .post(`/api/clubs/elections/${testElection.id}/close`)
      .set('Authorization', `Bearer ${founderToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'CLOSED');
  });

  // ── TEST 43: Results calculation works ───────────────────────────────────────
  await t.test('43. Results calculation works (computes tallies and winner correctly)', async () => {
    // Publish results
    const pubRes = await request(app)
      .post(`/api/clubs/elections/${testElection.id}/publish`)
      .set('Authorization', `Bearer ${founderToken}`);
    assert.equal(pubRes.status, 200);
    assert.equal(pubRes.body.data.status, 'RESULTS_PUBLISHED');

    const res = await request(app)
      .get(`/api/clubs/elections/${testElection.id}/results`)
      .set('Authorization', `Bearer ${memberToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.totalVoters, 1);
    assert.equal(res.body.data.positions[0].candidates[0].voteCount, 1);
    assert.equal(res.body.data.positions[0].winners[0].id, testCandidate.id);
  });

  // ── TEST 44: Voter identity remains private ─────────────────────────────────
  await t.test('44. Voter identity remains private (no voter choices in results payload)', async () => {
    const res = await request(app)
      .get(`/api/clubs/elections/${testElection.id}/results`)
      .set('Authorization', `Bearer ${memberToken}`);

    const payloadStr = JSON.stringify(res.body.data);
    assert.equal(payloadStr.includes('voterStudentId'), false);
    assert.equal(payloadStr.includes(voterStudent.id), false);
  });

  // ── TEST 45: Admin election intervention works ───────────────────────────────
  await t.test('45. Admin election intervention works (admin can cancel election with reason)', async () => {
    const suspiciousElect = await ClubElection.create({
      clubId: activeClub.id,
      title: 'Disputed Special Election',
      description: 'Under investigation',
      startAt: new Date(),
      endAt: new Date(Date.now() + 3600000),
      status: 'OPEN',
      createdBy: founderStudent.id,
    });

    const res = await request(app)
      .post(`/api/admin/clubs/elections/${suspiciousElect.id}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Procedural violations observed' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'CANCELLED');
  });

  // ── TEST 46: Audit log created for sensitive actions ─────────────────────────
  await t.test('46. Audit log created for sensitive actions (club approve & archive)', async () => {
    const archiveRes = await request(app)
      .patch(`/api/admin/clubs/${activeClub.id}/archive`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(archiveRes.status, 200);

    const logs = await AuditLog.findAll({
      where: { action: 'CLUB_ARCHIVED' },
    });
    assert.equal(logs.length >= 1, true);
  });

  // ── TEST 47: Club report works ─────────────────────────────────────────────
  await t.test('47. Club report works (creates Report record)', async () => {
    const res = await request(app)
      .post(`/api/clubs/${initialActiveClub.id}/report`)
      .set('Authorization', `Bearer ${nonMemberToken}`)
      .send({
        category: 'club_violation',
        description: 'Misleading event announcements',
      });

    assert.equal(res.status, 201);
    const report = await Report.findOne({ where: { clubId: initialActiveClub.id } });
    assert.notEqual(report, null);
    assert.equal(report.category, 'club_violation');
  });

  // ── TEST 48: Pagination works ───────────────────────────────────────────────
  await t.test('48. Pagination works (page, limit, total meta for clubs catalog)', async () => {
    const res = await request(app)
      .get('/api/clubs?page=1&limit=1')
      .set('Authorization', `Bearer ${memberToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.meta.page, 1);
    assert.equal(res.body.meta.limit, 1);
  });

  // ── TEST 49: Authorization boundaries work ──────────────────────────────────
  await t.test('49. Authorization boundaries work (Teacher cannot promote club members, student cannot approve proposals)', async () => {
    const unauthApprove = await request(app)
      .patch(`/api/admin/clubs/${initialActiveClub.id}/approve`)
      .set('Authorization', `Bearer ${memberToken}`);
    assert.equal(unauthApprove.status, 403);

    const teacherPromote = await request(app)
      .patch(`/api/clubs/members/${memberStudent.id}/promote`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ newRole: 'PRESIDENT' });
    assert.equal([403, 404].includes(teacherPromote.status), true);
  });

  // ── TEST 50: Full end-to-end club lifecycle works ───────────────────────────
  await t.test('50. Full end-to-end club lifecycle works (proposal -> approval -> membership -> announcement -> activity -> election -> voting -> results)', async () => {
    // 1. Propose Robotics Club
    const propRes = await request(app)
      .post('/api/clubs')
      .set('Authorization', `Bearer ${voterToken}`)
      .send({
        name: 'Robotics & Automation Society',
        shortName: 'RAS',
        description: 'Pioneering robotics, drones, and autonomous systems.',
        category: 'TECHNICAL',
        departmentId: deptECE.id,
      });
    assert.equal(propRes.status, 201);
    const rasClubId = propRes.body.data.id;

    // 2. Admin approves
    const appRes = await request(app)
      .patch(`/api/admin/clubs/${rasClubId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(appRes.status, 200);
    assert.equal(appRes.body.data.status, 'ACTIVE');

    // 3. Member joins
    const joinRes = await request(app)
      .post(`/api/clubs/${rasClubId}/join`)
      .set('Authorization', `Bearer ${memberToken}`);
    assert.equal(joinRes.status, 200);

    // 4. Founder approves membership
    const memReq = await ClubMembership.findOne({
      where: { clubId: rasClubId, studentId: memberStudent.id },
    });
    const appMemRes = await request(app)
      .patch(`/api/clubs/membership-requests/${memReq.id}/approve`)
      .set('Authorization', `Bearer ${voterToken}`);
    assert.equal(appMemRes.status, 200);

    // 5. Post Announcement
    const annRes = await request(app)
      .post(`/api/clubs/${rasClubId}/announcements`)
      .set('Authorization', `Bearer ${voterToken}`)
      .send({
        title: 'Welcome to RAS',
        content: 'Orientation session this Wednesday.',
      });
    assert.equal(annRes.status, 201);

    // 6. Create internal activity
    const actRes = await request(app)
      .post(`/api/clubs/${rasClubId}/activities`)
      .set('Authorization', `Bearer ${voterToken}`)
      .send({
        title: 'Microcontroller Hands-on',
        description: 'ESP32 and Arduino workshop',
        startAt: new Date(Date.now() + 86400000).toISOString(),
        visibility: 'CLUB_ONLY',
      });
    assert.equal(actRes.status, 201);

    // 7. Leadership elections
    const electRes = await request(app)
      .post(`/api/clubs/${rasClubId}/elections`)
      .set('Authorization', `Bearer ${voterToken}`)
      .send({
        title: 'RAS Spring Elections',
        startAt: new Date(Date.now() - 5000).toISOString(),
        endAt: new Date(Date.now() + 3600000).toISOString(),
      });
    assert.equal(electRes.status, 201);
    const rasElectId = electRes.body.data.id;

    // Add position
    const posRes = await request(app)
      .post(`/api/clubs/elections/${rasElectId}/positions`)
      .set('Authorization', `Bearer ${voterToken}`)
      .send({ title: 'Hardware Lead' });
    assert.equal(posRes.status, 201);
    const posId = posRes.body.data.id;

    // Member nominates
    const nomRes = await request(app)
      .post(`/api/clubs/elections/positions/${posId}/nominate`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ manifesto: 'Experience with PCB design and ROS2.' });
    assert.equal(nomRes.status, 201);
    const candId = nomRes.body.data.id;

    // Approve candidate
    await request(app)
      .patch(`/api/clubs/elections/candidates/${candId}/approve`)
      .set('Authorization', `Bearer ${voterToken}`);

    // Open election
    await request(app)
      .post(`/api/clubs/elections/${rasElectId}/open`)
      .set('Authorization', `Bearer ${voterToken}`);

    // Vote
    const vRes = await request(app)
      .post(`/api/clubs/elections/${rasElectId}/vote`)
      .set('Authorization', `Bearer ${voterToken}`)
      .send({ positionId: posId, candidateId: candId });
    assert.equal(vRes.status, 200);

    // Close & Publish
    await request(app)
      .post(`/api/clubs/elections/${rasElectId}/close`)
      .set('Authorization', `Bearer ${voterToken}`);
    await request(app)
      .post(`/api/clubs/elections/${rasElectId}/publish`)
      .set('Authorization', `Bearer ${voterToken}`);

    // Verify results
    const results = await request(app)
      .get(`/api/clubs/elections/${rasElectId}/results`)
      .set('Authorization', `Bearer ${memberToken}`);
    assert.equal(results.status, 200);
    assert.equal(results.body.data.positions[0].winners[0].id, candId);
  });
});
