'use strict';

require('dotenv').config();

const { Sequelize } = require('sequelize');
const path = require('path');
const logger = require('../utils/logger');

const dialect = process.env.DB_DIALECT || (process.env.NODE_ENV === 'test' ? 'sqlite' : 'postgres');

let sequelize;

if (dialect === 'sqlite') {
  const storage = process.env.DB_STORAGE || (
    process.env.NODE_ENV === 'test'
      ? ':memory:'
      : path.join(__dirname, '../../unilink_dev.sqlite')
  );

  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage,
    logging: process.env.NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false,
    define: {
      underscored: true,
      timestamps: true,
      paranoid: false,
    },
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'unilink_db',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'postgres',
    {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      define: {
        underscored: true,
        timestamps: true,
        paranoid: false,
      },
    }
  );
}

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info(`Database connection established successfully (${sequelize.getDialect().toUpperCase()})`);
  } catch (error) {
    if (process.env.NODE_ENV === 'development' && dialect === 'postgres') {
      logger.warn('PostgreSQL connection failed. Falling back to SQLite for local development...');
      sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: path.join(__dirname, '../../unilink_dev.sqlite'),
        logging: false,
        define: {
          underscored: true,
          timestamps: true,
          paranoid: false,
        },
      });
      await sequelize.authenticate();
      logger.info('Fallback SQLite database initialized successfully.');
      return;
    }
    logger.error('Unable to connect to database:', error);
    throw error;
  }
};

module.exports = { sequelize, connectDB };
