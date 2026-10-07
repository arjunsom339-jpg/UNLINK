'use strict';

require('dotenv').config();

const bcrypt = require('bcryptjs');
const { sequelize, User } = require('../models');
const collegeService = require('../services/collegeService');
const logger = require('../utils/logger');

const bootstrapAdmin = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();

    const college = await collegeService.getDefaultCollege();
    logger.info(`Institution resolved: ${college.name} (${college.code})`);

    const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@unilink.edu';
    let adminPassword = process.env.SUPER_ADMIN_PASSWORD;

    if (!adminPassword) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('SUPER_ADMIN_PASSWORD environment variable is strictly required in production.');
      }
      adminPassword = 'Admin@DevDefault!2026';
      logger.warn('SUPER_ADMIN_PASSWORD not set. Using dev default. Ensure SUPER_ADMIN_PASSWORD is set in .env.');
    }

    const existingAdmin = await User.findOne({ where: { email: adminEmail } });

    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      const admin = await User.create({
        email: adminEmail,
        passwordHash,
        role: 'admin',
        adminRole: 'SUPER_ADMIN',
        accountStatus: 'active',
        isAdminVerified: true,
        isEmailVerified: true,
        collegeId: college.id,
      });
      logger.info(`Super Admin provisioned successfully: ${admin.email}`);
    } else {
      logger.info(`Super Admin already exists: ${existingAdmin.email}`);
    }

    return true;
  } catch (err) {
    logger.error('Failed to bootstrap super admin:', err);
    throw err;
  }
};

if (require.main === module) {
  bootstrapAdmin()
    .then(() => {
      logger.info('Admin bootstrapping complete.');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Bootstrap failed:', err);
      process.exit(1);
    });
}

module.exports = { bootstrapAdmin };
