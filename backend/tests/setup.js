'use strict';

process.env.NODE_ENV = 'test';
process.env.DB_DIALECT = 'sqlite';
process.env.DB_STORAGE = ':memory:';
process.env.JWT_ACCESS_SECRET = 'test_jwt_access_secret_min_64_characters_super_secure_random_string_xyz';
process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_secret_min_64_characters_super_secure_random_string_xyz';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

const bcrypt = require('bcryptjs');
const {
  sequelize,
  User,
  StudentProfile,
  TeacherProfile,
  College,
  VerificationRequest,
} = require('../src/models');
const authService = require('../src/services/authService');
const collegeService = require('../src/services/collegeService');

let seededData = {};

const initTestDb = async () => {
  await sequelize.sync({ force: true });

  // 1. Seed Institution
  const college = await collegeService.getDefaultCollege();

  const passwordHash = await bcrypt.hash('Password@123', 8);

  // 2. Seed Verified Student
  const studentUser = await User.create({
    email: 'verified.student@nie.ac.in',
    passwordHash,
    role: 'student',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: college.id,
  });
  const studentProfile = await StudentProfile.create({
    userId: studentUser.id,
    collegeId: college.id,
    usn: '1NIE21CS001',
    fullName: 'Verified Student One',
    college: college.name,
    semester: 5,
  });

  // 3. Seed Verified Teacher
  const teacherUser = await User.create({
    email: 'verified.teacher@nie.ac.in',
    passwordHash,
    role: 'teacher',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: college.id,
  });
  const teacherProfile = await TeacherProfile.create({
    userId: teacherUser.id,
    collegeId: college.id,
    teacherId: 'TCH-CS-001',
    fullName: 'Prof. Verified Teacher',
    college: college.name,
    designation: 'Professor',
  });

  // 4. Seed Verified Admin (Super Admin)
  const adminUser = await User.create({
    email: 'admin@nie.ac.in',
    passwordHash,
    role: 'admin',
    adminRole: 'SUPER_ADMIN',
    accountStatus: 'active',
    isAdminVerified: true,
    collegeId: college.id,
  });

  // 5. Seed Pending Student
  const pendingStudent = await User.create({
    email: 'pending.student@nie.ac.in',
    passwordHash,
    role: 'student',
    accountStatus: 'pending',
    isAdminVerified: false,
    collegeId: college.id,
  });
  await StudentProfile.create({
    userId: pendingStudent.id,
    collegeId: college.id,
    usn: '1NIE21CS099',
    fullName: 'Pending Student',
    college: college.name,
    semester: 3,
  });
  await VerificationRequest.create({
    userId: pendingStudent.id,
    collegeId: college.id,
    role: 'student',
    identifier: '1NIE21CS099',
    collegeEmail: pendingStudent.email,
    status: 'pending',
  });

  // 6. Seed Suspended User
  const suspendedUser = await User.create({
    email: 'suspended.student@nie.ac.in',
    passwordHash,
    role: 'student',
    accountStatus: 'suspended',
    isAdminVerified: true,
    collegeId: college.id,
  });

  // 7. Seed Banned User
  const bannedUser = await User.create({
    email: 'banned.student@nie.ac.in',
    passwordHash,
    role: 'student',
    accountStatus: 'banned',
    isAdminVerified: true,
    collegeId: college.id,
  });

  // Generate tokens for test users
  const studentTokens = await authService.createSession(studentUser);
  const teacherTokens = await authService.createSession(teacherUser);
  const adminTokens   = await authService.createSession(adminUser);

  seededData = {
    college,
    studentUser,
    studentProfile,
    studentTokens,
    teacherUser,
    teacherProfile,
    teacherTokens,
    adminUser,
    adminTokens,
    pendingStudent,
    suspendedUser,
    bannedUser,
  };

  return seededData;
};

const getSeededData = () => seededData;

module.exports = {
  initTestDb,
  getSeededData,
};
