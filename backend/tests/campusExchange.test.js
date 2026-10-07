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
  MarketplaceListing,
  MarketplaceInquiry,
  MarketplaceBookmark,
  LostFoundItem,
  LostFoundClaim,
  Report,
  AuditLog,
  Notification,
} = require('../src/models');
const { generateAccessToken } = require('../src/utils/jwt');
const collegeService = require('../src/services/collegeService');

test('CAMPUS EXCHANGE & LOST & FOUND MODULE SECURITY TEST SUITE', async (t) => {
  let college1, college2;
  let deptCSE, deptECE;
  let adminUser, adminToken;
  let foreignAdminUser, foreignAdminToken;
  let teacherUser, teacherToken;
  let studentA, profileA, tokenA; // Seller / Lost reporter
  let studentB, profileB, tokenB; // Buyer / Finder / Claimant
  let foreignStudent, foreignProfile, foreignToken; // College 2 student

  let activeListing;
  let foundItem, lostItem;
  let activeClaim;

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
    email: 'admin.exchange@institution.edu',
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
    email: 'prof.sharma@institution.edu',
    passwordHash: 'hash',
    role: 'teacher',
    accountStatus: 'active',
    isEmailVerified: true,
    collegeId: college1.id,
  });
  teacherToken = generateAccessToken({ id: teacherUser.id, email: teacherUser.email, role: 'teacher', collegeId: college1.id });

  // Student A (Seller / Reporter)
  studentA = await User.create({
    email: 'aarav.seller@student.institution.edu',
    passwordHash: 'hash',
    role: 'student',
    accountStatus: 'active',
    isEmailVerified: true,
    collegeId: college1.id,
  });
  profileA = await StudentProfile.create({
    userId: studentA.id,
    usn: '1RV21CS001',
    fullName: 'Aarav Sharma',
    college: college1.name,
    department: 'CSE',
    departmentId: deptCSE.id,
    semester: 6,
  });
  tokenA = generateAccessToken({ id: studentA.id, email: studentA.email, role: 'student', collegeId: college1.id });

  // Student B (Buyer / Claimant)
  studentB = await User.create({
    email: 'bhavna.buyer@student.institution.edu',
    passwordHash: 'hash',
    role: 'student',
    accountStatus: 'active',
    isEmailVerified: true,
    collegeId: college1.id,
  });
  profileB = await StudentProfile.create({
    userId: studentB.id,
    usn: '1RV21CS002',
    fullName: 'Bhavna Patel',
    college: college1.name,
    department: 'CSE',
    departmentId: deptCSE.id,
    semester: 6,
  });
  tokenB = generateAccessToken({ id: studentB.id, email: studentB.email, role: 'student', collegeId: college1.id });

  // Foreign Student (College 2)
  foreignStudent = await User.create({
    email: 'foreign.peer@nitk.ac.in',
    passwordHash: 'hash',
    role: 'student',
    accountStatus: 'active',
    isEmailVerified: true,
    collegeId: college2.id,
  });
  foreignProfile = await StudentProfile.create({
    userId: foreignStudent.id,
    usn: 'NITK21CS099',
    fullName: 'Kiran Rao',
    college: college2.name,
    department: 'CSE',
    semester: 6,
  });
  foreignToken = generateAccessToken({ id: foreignStudent.id, email: foreignStudent.email, role: 'student', collegeId: college2.id });

  // ══════════════════════════════════════════════════════════════════════════════
  // PART 1: CAMPUS MARKETPLACE TESTS (1 - 25)
  // ══════════════════════════════════════════════════════════════════════════════

  // ── TEST 1: Student can browse marketplace ──────────────────────────────────
  await t.test('1. Student can browse marketplace', async () => {
    const res = await request(app)
      .get('/api/campus-exchange/marketplace')
      .set('Authorization', `Bearer ${tokenB}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(Array.isArray(res.body.data), true);
  });

  // ── TEST 2: Student can create marketplace listing ─────────────────────────
  await t.test('2. Student can create marketplace listing', async () => {
    const res = await request(app)
      .post('/api/campus-exchange/marketplace')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        title: 'Data Structures and Algorithms in C++ (Mark Weiss)',
        category: 'BOOKS',
        price: 450.00,
        condition: 'LIKE_NEW',
        location: 'Central Library Gate',
        description: 'Hardcover textbook in pristine condition, no pen markings.',
        isNegotiable: true,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.title, 'Data Structures and Algorithms in C++ (Mark Weiss)');
    assert.equal(res.body.data.price, 450);
    activeListing = res.body.data;
  });

  // ── TEST 3: Teacher can create permitted listing ────────────────────────────
  await t.test('3. Teacher can create permitted listing', async () => {
    const res = await request(app)
      .post('/api/campus-exchange/marketplace')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'Microcontroller 8051 Development Board Kit',
        category: 'PROJECT_MATERIAL',
        price: 0, // Free donation
        condition: 'GOOD',
        location: 'ECE Department Lab 3',
        description: 'Surplus developmental kits for embedded systems projects. Free for students.',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.price, 0); // FREE price
  });

  // ── TEST 4: Duplicate/invalid listing blocked ───────────────────────────────
  await t.test('4. Duplicate/invalid listing blocked', async () => {
    const res = await request(app)
      .post('/api/campus-exchange/marketplace')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        title: '', // Missing title
        price: -50, // Negative price invalid
        category: 'BOOKS',
      });

    assert.equal(res.status, 400);
  });

  // ── TEST 5: Seller can edit own listing ─────────────────────────────────────
  await t.test('5. Seller can edit own listing', async () => {
    const res = await request(app)
      .patch(`/api/campus-exchange/marketplace/${activeListing.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        price: 400.00,
        description: 'Price dropped: Hardcover textbook in pristine condition.',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.price, 400);
  });

  // ── TEST 6: Seller cannot edit another user's listing ──────────────────────
  await t.test('6. Seller cannot edit another user listing', async () => {
    const res = await request(app)
      .patch(`/api/campus-exchange/marketplace/${activeListing.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        price: 10.00,
      });

    assert.equal(res.status, 403);
  });

  // ── TEST 7: Seller can mark listing reserved ───────────────────────────────
  await t.test('7. Seller can mark listing reserved', async () => {
    const res = await request(app)
      .patch(`/api/campus-exchange/marketplace/${activeListing.id}/reserve`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'RESERVED');
  });

  // ── TEST 8: Seller can mark listing sold ───────────────────────────────────
  await t.test('8. Seller can mark listing sold', async () => {
    // Reactivate first for next tests, then test sold
    await request(app)
      .patch(`/api/campus-exchange/marketplace/${activeListing.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ status: 'ACTIVE' });

    const res = await request(app)
      .patch(`/api/campus-exchange/marketplace/${activeListing.id}/sold`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'SOLD');

    // Put back to ACTIVE for subsequent inquiry/search tests
    await request(app)
      .patch(`/api/campus-exchange/marketplace/${activeListing.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ status: 'ACTIVE' });
  });

  // ── TEST 9: Buyer cannot mark someone else's listing sold ──────────────────
  await t.test('9. Buyer cannot mark someone else listing sold', async () => {
    const res = await request(app)
      .patch(`/api/campus-exchange/marketplace/${activeListing.id}/sold`)
      .set('Authorization', `Bearer ${tokenB}`);

    assert.equal(res.status, 403);
  });

  // ── TEST 10: Bookmark works ────────────────────────────────────────────────
  await t.test('10. Bookmark works', async () => {
    const res = await request(app)
      .post(`/api/campus-exchange/marketplace/${activeListing.id}/bookmark`)
      .set('Authorization', `Bearer ${tokenB}`);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
  });

  // ── TEST 11: Duplicate bookmark blocked ────────────────────────────────────
  await t.test('11. Duplicate bookmark blocked', async () => {
    const res = await request(app)
      .post(`/api/campus-exchange/marketplace/${activeListing.id}/bookmark`)
      .set('Authorization', `Bearer ${tokenB}`);

    assert.equal(res.status, 409);
  });

  // ── TEST 12: Remove bookmark works ─────────────────────────────────────────
  await t.test('12. Remove bookmark works', async () => {
    const res = await request(app)
      .delete(`/api/campus-exchange/marketplace/${activeListing.id}/bookmark`)
      .set('Authorization', `Bearer ${tokenB}`);

    assert.equal(res.status, 200);
  });

  // ── TEST 13: Inquiry creation works ────────────────────────────────────────
  let inquiryId;
  await t.test('13. Inquiry creation works', async () => {
    const res = await request(app)
      .post(`/api/campus-exchange/marketplace/${activeListing.id}/inquiries`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        message: 'Hi! Can I collect this book tomorrow afternoon near the library?',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.listingId, activeListing.id);
    assert.equal(res.body.data.buyerId, studentB.id);
    inquiryId = res.body.data.id;
  });

  // ── TEST 14: Unauthorized inquiry access blocked ───────────────────────────
  await t.test('14. Unauthorized inquiry access blocked', async () => {
    // Foreign user cannot see seller inquiries for activeListing
    const res = await request(app)
      .get(`/api/campus-exchange/marketplace/${activeListing.id}/inquiries`)
      .set('Authorization', `Bearer ${foreignToken}`);

    // Cross college or non-seller blocked
    assert.equal([403, 404].includes(res.status), true);
  });

  // ── TEST 15: Seller receives notification ──────────────────────────────────
  await t.test('15. Seller receives notification', async () => {
    const notif = await Notification.findOne({
      where: {
        userId: studentA.id,
        type: 'MARKETPLACE_INQUIRY',
      },
    });

    assert.equal(!!notif, true);
    assert.equal(notif.data.listingId, activeListing.id);
  });

  // ── TEST 16: Search works ──────────────────────────────────────────────────
  await t.test('16. Search works', async () => {
    const res = await request(app)
      .get('/api/campus-exchange/marketplace?q=Weiss')
      .set('Authorization', `Bearer ${tokenB}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.length >= 1, true);
    assert.equal(res.body.data[0].title.includes('Weiss'), true);
  });

  // ── TEST 17: Category filter works ─────────────────────────────────────────
  await t.test('17. Category filter works', async () => {
    const res = await request(app)
      .get('/api/campus-exchange/marketplace?category=BOOKS')
      .set('Authorization', `Bearer ${tokenB}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.length >= 1, true);
    assert.equal(res.body.data.every((i) => i.category === 'BOOKS'), true);
  });

  // ── TEST 18: Price filter works ────────────────────────────────────────────
  await t.test('18. Price filter works', async () => {
    const res = await request(app)
      .get('/api/campus-exchange/marketplace?minPrice=100&maxPrice=500')
      .set('Authorization', `Bearer ${tokenB}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.length >= 1, true);
    assert.equal(Number(res.body.data[0].price) >= 100 && Number(res.body.data[0].price) <= 500, true);
  });

  // ── TEST 19: Pagination works ──────────────────────────────────────────────
  await t.test('19. Pagination works', async () => {
    const res = await request(app)
      .get('/api/campus-exchange/marketplace?page=1&limit=1')
      .set('Authorization', `Bearer ${tokenB}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.meta.page, 1);
  });

  // ── TEST 20: Cross-college marketplace access blocked ──────────────────────
  await t.test('20. Cross-college marketplace access blocked', async () => {
    const res = await request(app)
      .get(`/api/campus-exchange/marketplace/${activeListing.id}`)
      .set('Authorization', `Bearer ${foreignToken}`);

    // Should return 404 Not Found due to multi-college isolation
    assert.equal(res.status, 404);
  });

  // ── TEST 21: Marketplace IDOR blocked ──────────────────────────────────────
  await t.test('21. Marketplace IDOR blocked', async () => {
    const res = await request(app)
      .delete(`/api/campus-exchange/marketplace/${activeListing.id}`)
      .set('Authorization', `Bearer ${studentB.id ? tokenB : foreignToken}`);

    assert.equal(res.status, 403);
  });

  // ── TEST 22: Prohibited item validation works ──────────────────────────────
  await t.test('22. Prohibited item validation works', async () => {
    const res = await request(app)
      .post('/api/campus-exchange/marketplace')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        title: 'Original hunting knife and tactical dagger',
        category: 'OTHER',
        price: 900,
        description: 'Sharp steel dagger knife with holster.',
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.message.includes('prohibited'), true);
  });

  // ── TEST 23: Report listing works ──────────────────────────────────────────
  await t.test('23. Report listing works', async () => {
    const res = await request(app)
      .post(`/api/campus-exchange/marketplace/${activeListing.id}/report`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        category: 'scam_or_fake',
        description: 'Listing seems suspicious, book may be counterfeit edition.',
      });

    assert.equal(res.status, 201);
    const report = await Report.findOne({ where: { marketplaceListingId: activeListing.id } });
    assert.equal(!!report, true);
  });

  // ── TEST 24: Admin can remove listing ──────────────────────────────────────
  await t.test('24. Admin can remove listing', async () => {
    const tempListing = await MarketplaceListing.create({
      collegeId: college1.id,
      sellerId: studentA.id,
      title: 'Spam listing to be moderated',
      description: 'Will be removed by admin.',
      category: 'OTHER',
      price: 10,
    });

    const res = await request(app)
      .delete(`/api/campus-exchange/admin/marketplace/${tempListing.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Violates campus commercial sales policy.' });

    assert.equal(res.status, 200);

    const audit = await AuditLog.findOne({
      where: {
        action: 'MARKETPLACE_LISTING_REMOVED',
      },
    });
    assert.equal(!!audit, true);
  });

  // ── TEST 25: Admin analytics use real data ─────────────────────────────────
  await t.test('25. Admin analytics use real data', async () => {
    const res = await request(app)
      .get('/api/campus-exchange/admin/analytics')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(typeof res.body.data.marketplace.activeListings, 'number');
    assert.equal(typeof res.body.data.marketplace.averagePrice, 'string');
    assert.equal(typeof res.body.data.lostAndFound.totalReports, 'number');
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // PART 2: LOST & FOUND TESTS (26 - 50)
  // ══════════════════════════════════════════════════════════════════════════════

  // ── TEST 26: Student can create LOST report ────────────────────────────────
  await t.test('26. Student can create LOST report', async () => {
    const res = await request(app)
      .post('/api/campus-exchange/lost-found')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        type: 'LOST',
        category: 'ID_CARD',
        title: 'College ID Card for Aarav Sharma',
        description: 'Lost near the cafeteria during lunch break. CSE department ID.',
        location: 'Cafeteria Ground Floor',
        itemDate: new Date().toISOString(),
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.type, 'LOST');
    lostItem = res.body.data;
  });

  // ── TEST 27: Student can create FOUND report ───────────────────────────────
  await t.test('27. Student can create FOUND report', async () => {
    const res = await request(app)
      .post('/api/campus-exchange/lost-found')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        type: 'FOUND',
        category: 'ID_CARD',
        title: 'Found Student ID Card Aarav Sharma',
        description: 'Found plastic student ID card lying near cafeteria juice counter.',
        location: 'Cafeteria Ground Floor',
        itemDate: new Date().toISOString(),
        verificationQuestion: 'What is the color of the lanyard strap attached?',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.type, 'FOUND');
    foundItem = res.body.data;
  });

  // ── TEST 28: Search works ──────────────────────────────────────────────────
  await t.test('28. Search works', async () => {
    const res = await request(app)
      .get('/api/campus-exchange/lost-found?q=Cafeteria')
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.length >= 1, true);
  });

  // ── TEST 29: Category filter works ─────────────────────────────────────────
  await t.test('29. Category filter works', async () => {
    const res = await request(app)
      .get('/api/campus-exchange/lost-found?category=ID_CARD')
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.every((i) => i.category === 'ID_CARD'), true);
  });

  // ── TEST 30: Date filtering works ──────────────────────────────────────────
  await t.test('30. Date filtering works', async () => {
    const today = new Date().toISOString().split('T')[0];
    const res = await request(app)
      .get(`/api/campus-exchange/lost-found?startDate=${today}`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.length >= 1, true);
  });

  // ── TEST 31: Student can claim found item ──────────────────────────────────
  await t.test('31. Student can claim found item', async () => {
    const res = await request(app)
      .post(`/api/campus-exchange/lost-found/${foundItem.id}/claim`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        message: 'This is my college ID card. I dropped it while having lunch.',
        verificationAnswer: 'Navy blue lanyard with IEEE logo printed.',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.status, 'PENDING');
    activeClaim = res.body.data;
  });

  // ── TEST 32: Duplicate claim blocked ───────────────────────────────────────
  await t.test('32. Duplicate claim blocked', async () => {
    const res = await request(app)
      .post(`/api/campus-exchange/lost-found/${foundItem.id}/claim`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        message: 'Trying to claim again.',
      });

    assert.equal(res.status, 409);
  });

  // ── TEST 33: Claimant cannot approve own claim ─────────────────────────────
  await t.test('33. Claimant cannot approve own claim', async () => {
    const res = await request(app)
      .patch(`/api/campus-exchange/lost-found/claims/${activeClaim.id}/accept`)
      .set('Authorization', `Bearer ${tokenA}`); // tokenA is claimant

    assert.equal(res.status, 403);
  });

  // ── TEST 34: Owner/reporter can accept claim ───────────────────────────────
  await t.test('34. Owner/reporter can accept claim', async () => {
    const res = await request(app)
      .patch(`/api/campus-exchange/lost-found/claims/${activeClaim.id}/accept`)
      .set('Authorization', `Bearer ${tokenB}`); // tokenB reported the found item

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'ACCEPTED');

    const updatedItem = await LostFoundItem.findByPk(foundItem.id);
    assert.equal(updatedItem.status, 'CLAIMED');
  });

  // ── TEST 35: Claim rejection works ─────────────────────────────────────────
  await t.test('35. Claim rejection works', async () => {
    // Create another test item & claim
    const tempItem = await LostFoundItem.create({
      collegeId: college1.id,
      reporterId: studentB.id,
      type: 'FOUND',
      category: 'KEYS',
      title: 'Bike key with Honda logo',
      description: 'Found near parking slot B2.',
      location: 'Parking B2',
    });

    const tempClaim = await LostFoundClaim.create({
      itemId: tempItem.id,
      claimantId: studentA.id,
      message: 'I think that is my bike key.',
      status: 'PENDING',
    });

    const res = await request(app)
      .patch(`/api/campus-exchange/lost-found/claims/${tempClaim.id}/reject`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ reason: 'Key brand does not match your description.' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'REJECTED');
  });

  // ── TEST 36: Possible matching works ───────────────────────────────────────
  await t.test('36. Possible matching works', async () => {
    const res = await request(app)
      .get(`/api/campus-exchange/lost-found/${lostItem.id}/matches`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(Array.isArray(res.body.data.matches), true);
    // Should identify foundItem as top match
    const matchFound = res.body.data.matches.find((m) => m.item.id === foundItem.id);
    assert.equal(!!matchFound, true);
    assert.equal(matchFound.score >= 50, true);
  });

  // ── TEST 37: Match notification works ──────────────────────────────────────
  await t.test('37. Match notification works', async () => {
    // Creating an item with strong keyword and category correlation triggers deterministic match
    const itemWithMatch = await request(app)
      .post('/api/campus-exchange/lost-found')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        type: 'LOST',
        category: 'LAPTOP',
        title: 'Dell XPS 15 Silver Laptop',
        description: 'Left in Computer Science Lab 1 on 2nd floor.',
        location: 'CS Lab 1',
      });

    // Opposite found item
    await request(app)
      .post('/api/campus-exchange/lost-found')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        type: 'FOUND',
        category: 'LAPTOP',
        title: 'Dell XPS 15 Laptop Found',
        description: 'Found in CS Lab 1 charging near desktop 12.',
        location: 'CS Lab 1',
      });

    const notif = await Notification.findOne({
      where: {
        userId: studentB.id,
        type: 'LOST_FOUND_MATCH',
      },
    });

    assert.equal(!!notif, true);
  });

  // ── TEST 38: Item can be marked resolved ───────────────────────────────────
  await t.test('38. Item can be marked resolved', async () => {
    const res = await request(app)
      .patch(`/api/campus-exchange/lost-found/${lostItem.id}/resolve`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'RESOLVED');
  });

  // ── TEST 39: Resolved item cannot accept new claim ─────────────────────────
  await t.test('39. Resolved item cannot accept new claim', async () => {
    const res = await request(app)
      .post(`/api/campus-exchange/lost-found/${lostItem.id}/claim`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        message: 'Trying to claim already resolved item.',
      });

    assert.equal(res.status, 400);
  });

  // ── TEST 40: Cross-college Lost & Found access blocked ──────────────────────
  await t.test('40. Cross-college Lost & Found access blocked', async () => {
    const res = await request(app)
      .get(`/api/campus-exchange/lost-found/${lostItem.id}`)
      .set('Authorization', `Bearer ${foreignToken}`);

    assert.equal(res.status, 404);
  });

  // ── TEST 41: IDOR protection works ─────────────────────────────────────────
  await t.test('41. IDOR protection works', async () => {
    const res = await request(app)
      .delete(`/api/campus-exchange/lost-found/${lostItem.id}`)
      .set('Authorization', `Bearer ${tokenB}`); // studentB is not the reporter

    assert.equal(res.status, 403);
  });

  // ── TEST 42: Private claim information protected ───────────────────────────
  await t.test('42. Private claim information protected', async () => {
    // Non-reporter, non-admin browsing item details should not see claims list
    const res = await request(app)
      .get(`/api/campus-exchange/lost-found/${foundItem.id}`)
      .set('Authorization', `Bearer ${teacherToken}`); // teacher is neither reporter nor admin

    assert.equal(res.status, 200);
    assert.equal(res.body.data.claims, undefined);
  });

  // ── TEST 43: Sensitive document image access protected ─────────────────────
  await t.test('43. Sensitive document image access protected', async () => {
    // Test reporting ID_CARD with sensitive number: automatically redacted in description
    const res = await request(app)
      .post('/api/campus-exchange/lost-found')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        type: 'LOST',
        category: 'DOCUMENT',
        title: 'Lost Government ID Certificate',
        description: 'Contains Aadhaar number 2345 6789 1011 in plastic pouch.',
        location: 'Admin Block',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.description.includes('[REDACTED_GOV_ID]'), true);
  });

  // ── TEST 44: Unauthorized user cannot modify report ────────────────────────
  await t.test('44. Unauthorized user cannot modify report', async () => {
    const res = await request(app)
      .patch(`/api/campus-exchange/lost-found/${foundItem.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        title: 'Malicious title hijack',
      });

    assert.equal(res.status, 403);
  });

  // ── TEST 45: Report abuse flow works ───────────────────────────────────────
  await t.test('45. Report abuse flow works', async () => {
    const res = await request(app)
      .post(`/api/campus-exchange/lost-found/${foundItem.id}/report`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        category: 'sensitive_leak',
        description: 'Flagged for moderation by campus peer.',
      });

    assert.equal(res.status, 201);
    const report = await Report.findOne({ where: { lostFoundItemId: foundItem.id } });
    assert.equal(!!report, true);
  });

  // ── TEST 46: Pagination works ──────────────────────────────────────────────
  await t.test('46. Pagination works', async () => {
    const res = await request(app)
      .get('/api/campus-exchange/lost-found?page=1&limit=2')
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.length <= 2, true);
    assert.equal(res.body.meta.page, 1);
  });

  // ── TEST 47: Expiration logic works ────────────────────────────────────────
  await t.test('47. Expiration logic works', async () => {
    const item = await LostFoundItem.findByPk(foundItem.id);
    assert.equal(item.expiresAt instanceof Date, true);
    assert.equal(item.expiresAt.getTime() > Date.now(), true);
  });

  // ── TEST 48: Admin moderation works ────────────────────────────────────────
  await t.test('48. Admin moderation works', async () => {
    const tempItem = await LostFoundItem.create({
      collegeId: college1.id,
      reporterId: studentA.id,
      type: 'LOST',
      category: 'OTHER',
      title: 'Stale item for archiving',
      description: 'Test archive flow.',
      location: 'Block C',
    });

    const res = await request(app)
      .patch(`/api/campus-exchange/admin/lost-found/${tempItem.id}/archive`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Stale record older than retention policy.' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'ARCHIVED');
  });

  // ── TEST 49: Audit logs generated for sensitive moderation ─────────────────
  await t.test('49. Audit logs generated for sensitive moderation', async () => {
    const auditLogs = await AuditLog.findAll({
      where: {
        action: 'LOST_FOUND_ITEM_ARCHIVED',
      },
    });

    assert.equal(auditLogs.length >= 1, true);
  });

  // ── TEST 50: Full end-to-end Lost & Found lifecycle works ──────────────────
  await t.test('50. Full end-to-end Lost & Found lifecycle works', async () => {
    // Step 1: Student B finds a calculator and posts FOUND report
    const createRes = await request(app)
      .post('/api/campus-exchange/lost-found')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        type: 'FOUND',
        category: 'ELECTRONICS',
        title: 'Casio fx-991EX Scientific Calculator',
        description: 'Found on desk 44 in Exam Hall 2.',
        location: 'Exam Hall 2',
        verificationQuestion: 'What initials are engraved on the sliding plastic cover?',
      });
    assert.equal(createRes.status, 201);
    const calculator = createRes.body.data;

    // Step 2: Student A searches and views detail
    const detailRes = await request(app)
      .get(`/api/campus-exchange/lost-found/${calculator.id}`)
      .set('Authorization', `Bearer ${tokenA}`);
    assert.equal(detailRes.status, 200);

    // Step 3: Student A submits claim with verification answer
    const claimRes = await request(app)
      .post(`/api/campus-exchange/lost-found/${calculator.id}/claim`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        message: 'I forgot my calculator right after the engineering mathematics mid-term.',
        verificationAnswer: 'Initials "AS" carved on the bottom right of the cover.',
      });
    assert.equal(claimRes.status, 201);
    const lifeCycleClaim = claimRes.body.data;

    // Step 4: Student B reviews claims and accepts ownership proof
    const acceptRes = await request(app)
      .patch(`/api/campus-exchange/lost-found/claims/${lifeCycleClaim.id}/accept`)
      .set('Authorization', `Bearer ${tokenB}`);
    assert.equal(acceptRes.status, 200);

    // Step 5: Mark resolved
    const resolveRes = await request(app)
      .patch(`/api/campus-exchange/lost-found/${calculator.id}/resolve`)
      .set('Authorization', `Bearer ${tokenB}`);
    assert.equal(resolveRes.status, 200);

    // Step 6: Verify final DB state
    const finalItem = await LostFoundItem.findByPk(calculator.id);
    assert.equal(finalItem.status, 'RESOLVED');
    assert.equal(finalItem.resolvedBy, studentB.id);
  });
});
