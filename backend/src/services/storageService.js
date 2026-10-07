'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * STORAGE SERVICE ABSTRACTION
 * Decouples file persistence from resource business logic.
 * Default: Local filesystem under /uploads/resources/.
 * Pluggable for AWS S3, Cloudinary, Firebase Storage, Supabase Storage.
 */

const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.txt',
  '.jpg',
  '.jpeg',
  '.png',
];

const DISALLOWED_EXTENSIONS = [
  '.exe',
  '.sh',
  '.bat',
  '.cmd',
  '.js',
  '.mjs',
  '.php',
  '.py',
  '.html',
  '.htm',
  '.vbs',
  '.bin',
  '.jar',
  '.war',
  '.dll',
  '.so',
];

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'image/jpeg',
  'image/png',
];

const MAX_FILE_SIZE_BYTES = (parseInt(process.env.MAX_RESOURCE_FILE_SIZE_MB, 10) || parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 25) * 1024 * 1024;

class LocalStorageProvider {
  constructor() {
    this.baseDir = path.resolve(__dirname, '../../uploads/resources');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async saveFile({ buffer, originalname, mimetype, size }) {
    // 1. Sanitize filename & prevent path traversal
    const safeBaseName = path.basename(originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = path.extname(safeBaseName).toLowerCase();
    const nameWithoutExt = path.basename(safeBaseName, ext).slice(0, 80);
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const safeFileName = `${nameWithoutExt}-${uniqueSuffix}${ext}`;

    const targetPath = path.join(this.baseDir, safeFileName);

    // Verify resolved path stays inside base directory (anti path-traversal)
    if (!targetPath.startsWith(this.baseDir)) {
      const err = new Error('Path traversal attempt detected in filename.');
      err.statusCode = 400;
      throw err;
    }

    await fs.promises.writeFile(targetPath, buffer);

    return {
      fileUrl: `/uploads/resources/${safeFileName}`,
      fileName: originalname.replace(/[\/\\]/g, '_'),
      fileType: mimetype || 'application/octet-stream',
      fileSize: size || buffer.length,
      storageProvider: 'local',
      localPath: targetPath,
    };
  }

  async deleteFile(fileUrl) {
    try {
      if (!fileUrl || !fileUrl.startsWith('/uploads/resources/')) return false;
      const fileName = path.basename(fileUrl);
      const targetPath = path.join(this.baseDir, fileName);
      if (fs.existsSync(targetPath) && targetPath.startsWith(this.baseDir)) {
        await fs.promises.unlink(targetPath);
        return true;
      }
      return false;
    } catch (err) {
      logger.warn(`Failed to delete local file ${fileUrl}: ${err.message}`);
      return false;
    }
  }

  getFilePath(fileUrl) {
    if (!fileUrl) return null;
    const fileName = path.basename(fileUrl);
    const targetPath = path.join(this.baseDir, fileName);
    if (fs.existsSync(targetPath) && targetPath.startsWith(this.baseDir)) {
      return targetPath;
    }
    return null;
  }
}

// Current provider: Local (pluggable with S3Provider, CloudinaryProvider, etc.)
const defaultProvider = new LocalStorageProvider();

const ALLOWED_RESUME_EXTENSIONS = ['.pdf', '.doc', '.docx'];
const ALLOWED_RESUME_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_RESUME_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

class ResumeStorageProvider {
  constructor() {
    this.baseDir = path.resolve(__dirname, '../../uploads/resumes');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async saveResume({ buffer, originalname, mimetype, size }) {
    const safeBaseName = path.basename(originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = path.extname(safeBaseName).toLowerCase();
    const nameWithoutExt = path.basename(safeBaseName, ext).slice(0, 80);
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const safeFileName = `${nameWithoutExt}-${uniqueSuffix}${ext}`;

    const targetPath = path.join(this.baseDir, safeFileName);
    if (!targetPath.startsWith(this.baseDir)) {
      const err = new Error('Path traversal attempt detected in filename.');
      err.statusCode = 400;
      throw err;
    }

    await fs.promises.writeFile(targetPath, buffer);

    return {
      fileUrl: `/uploads/resumes/${safeFileName}`,
      fileName: safeFileName,
      originalName: originalname.replace(/[\/\\]/g, '_'),
      fileType: mimetype || 'application/pdf',
      fileSize: size || buffer.length,
      localPath: targetPath,
    };
  }

  async deleteResume(fileUrlOrName) {
    try {
      if (!fileUrlOrName) return false;
      const fileName = path.basename(fileUrlOrName);
      const targetPath = path.join(this.baseDir, fileName);
      if (fs.existsSync(targetPath) && targetPath.startsWith(this.baseDir)) {
        await fs.promises.unlink(targetPath);
        return true;
      }
      return false;
    } catch (err) {
      logger.warn(`Failed to delete resume file ${fileUrlOrName}: ${err.message}`);
      return false;
    }
  }

  getResumePath(fileUrlOrName) {
    if (!fileUrlOrName) return null;
    const fileName = path.basename(fileUrlOrName);
    const targetPath = path.join(this.baseDir, fileName);
    if (fs.existsSync(targetPath) && targetPath.startsWith(this.baseDir)) {
      return targetPath;
    }
    return null;
  }
}

const resumeProvider = new ResumeStorageProvider();

/**
 * Validate incoming resume file before storage
 */
const validateResumeFile = ({ originalname, mimetype, size }) => {
  if (!originalname) {
    const err = new Error('Resume file name is required.');
    err.statusCode = 400;
    throw err;
  }

  if (originalname.includes('..') || originalname.includes('/') || originalname.includes('\\')) {
    const err = new Error('Invalid resume file name: Directory traversal characters are forbidden.');
    err.statusCode = 400;
    throw err;
  }

  const ext = path.extname(originalname).toLowerCase();

  if (DISALLOWED_EXTENSIONS.includes(ext)) {
    const err = new Error(`Executable and script files (${ext}) are strictly forbidden.`);
    err.statusCode = 400;
    throw err;
  }

  if (!ALLOWED_RESUME_EXTENSIONS.includes(ext)) {
    const err = new Error(`Resume format '${ext}' is not supported. Allowed formats: ${ALLOWED_RESUME_EXTENSIONS.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  if (mimetype && mimetype !== 'application/octet-stream' && !ALLOWED_RESUME_MIME_TYPES.includes(mimetype)) {
    const err = new Error(`MIME type '${mimetype}' is not permitted for student resumes.`);
    err.statusCode = 400;
    throw err;
  }

  if (size && size > MAX_RESUME_SIZE_BYTES) {
    const maxMb = Math.round(MAX_RESUME_SIZE_BYTES / (1024 * 1024));
    const err = new Error(`Resume file size exceeds maximum permitted limit of ${maxMb}MB.`);
    err.statusCode = 400;
    throw err;
  }

  return true;
};

/**
 * Store uploaded resume
 */
const saveResume = async ({ buffer, originalname, mimetype, size }) => {
  validateResumeFile({ originalname, mimetype, size });
  return await resumeProvider.saveResume({ buffer, originalname, mimetype, size });
};

/**
 * Delete stored resume
 */
const deleteResume = async (fileUrlOrName) => {
  return await resumeProvider.deleteResume(fileUrlOrName);
};

/**
 * Get physical resume path
 */
const getResumeFilePath = (fileUrlOrName) => {
  return resumeProvider.getResumePath(fileUrlOrName);
};

/**
 * Validate incoming file before storage
 */
const validateFile = ({ originalname, mimetype, size }) => {
  if (!originalname) {
    const err = new Error('File name is required.');
    err.statusCode = 400;
    throw err;
  }

  // Prevent path traversal sequences
  if (originalname.includes('..') || originalname.includes('/') || originalname.includes('\\')) {
    const err = new Error('Invalid file name: Directory traversal characters are forbidden.');
    err.statusCode = 400;
    throw err;
  }

  const ext = path.extname(originalname).toLowerCase();

  // Check blacklist
  if (DISALLOWED_EXTENSIONS.includes(ext)) {
    const err = new Error(`Executable and script files (${ext}) are strictly forbidden.`);
    err.statusCode = 400;
    throw err;
  }

  // Check whitelist
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    const err = new Error(`File format '${ext}' is not supported. Allowed formats: ${ALLOWED_EXTENSIONS.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  // Validate MIME type if provided
  if (mimetype && mimetype !== 'application/octet-stream' && !ALLOWED_MIME_TYPES.includes(mimetype)) {
    const err = new Error(`MIME type '${mimetype}' is not permitted for academic resources.`);
    err.statusCode = 400;
    throw err;
  }

  // Validate size
  if (size && size > MAX_FILE_SIZE_BYTES) {
    const maxMb = Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024));
    const err = new Error(`File size exceeds maximum permitted limit of ${maxMb}MB.`);
    err.statusCode = 400;
    throw err;
  }

  return true;
};

/**
 * Store uploaded file
 */
const saveFile = async ({ buffer, originalname, mimetype, size }) => {
  validateFile({ originalname, mimetype, size });
  return await defaultProvider.saveFile({ buffer, originalname, mimetype, size });
};

/**
 * Delete stored file
 */
const deleteFile = async (fileUrl) => {
  return await defaultProvider.deleteFile(fileUrl);
};

/**
 * Get physical path for download streaming
 */
const getFilePath = (fileUrl) => {
  return defaultProvider.getFilePath(fileUrl);
};

const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

class ExchangeImageStorageProvider {
  constructor() {
    this.baseDir = path.resolve(__dirname, '../../uploads/exchange');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async saveImage({ buffer, originalname, mimetype, size }) {
    const safeBaseName = path.basename(originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = path.extname(safeBaseName).toLowerCase();
    const nameWithoutExt = path.basename(safeBaseName, ext).slice(0, 80);
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const safeFileName = `${nameWithoutExt}-${uniqueSuffix}${ext}`;

    const targetPath = path.join(this.baseDir, safeFileName);
    if (!targetPath.startsWith(this.baseDir)) {
      const err = new Error('Path traversal attempt detected in filename.');
      err.statusCode = 400;
      throw err;
    }

    await fs.promises.writeFile(targetPath, buffer);

    return {
      fileUrl: `/uploads/exchange/${safeFileName}`,
      fileName: safeFileName,
      originalName: originalname.replace(/[\/\\]/g, '_'),
      fileType: mimetype || 'image/jpeg',
      fileSize: size || buffer.length,
      localPath: targetPath,
    };
  }

  async deleteImage(fileUrlOrName) {
    try {
      if (!fileUrlOrName) return false;
      const fileName = path.basename(fileUrlOrName);
      const targetPath = path.join(this.baseDir, fileName);
      if (fs.existsSync(targetPath) && targetPath.startsWith(this.baseDir)) {
        await fs.promises.unlink(targetPath);
        return true;
      }
      return false;
    } catch (err) {
      logger.warn(`Failed to delete exchange image ${fileUrlOrName}: ${err.message}`);
      return false;
    }
  }

  getImagePath(fileUrlOrName) {
    if (!fileUrlOrName) return null;
    const fileName = path.basename(fileUrlOrName);
    const targetPath = path.join(this.baseDir, fileName);
    if (fs.existsSync(targetPath) && targetPath.startsWith(this.baseDir)) {
      return targetPath;
    }
    return null;
  }
}

const exchangeImageProvider = new ExchangeImageStorageProvider();

const validateImageFile = ({ originalname, mimetype, size }) => {
  if (!originalname) {
    const err = new Error('Image file name is required.');
    err.statusCode = 400;
    throw err;
  }

  if (originalname.includes('..') || originalname.includes('/') || originalname.includes('\\')) {
    const err = new Error('Invalid image file name: Directory traversal characters are forbidden.');
    err.statusCode = 400;
    throw err;
  }

  const ext = path.extname(originalname).toLowerCase();

  if (DISALLOWED_EXTENSIONS.includes(ext)) {
    const err = new Error(`Executable and script files (${ext}) are strictly forbidden.`);
    err.statusCode = 400;
    throw err;
  }

  if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
    const err = new Error(`Image format '${ext}' is not supported. Allowed formats: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  if (mimetype && mimetype !== 'application/octet-stream' && !ALLOWED_IMAGE_MIME_TYPES.includes(mimetype)) {
    const err = new Error(`MIME type '${mimetype}' is not permitted. Allowed: ${ALLOWED_IMAGE_MIME_TYPES.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  if (size && size > MAX_IMAGE_SIZE_BYTES) {
    const maxMb = Math.round(MAX_IMAGE_SIZE_BYTES / (1024 * 1024));
    const err = new Error(`Image file size exceeds maximum permitted limit of ${maxMb}MB.`);
    err.statusCode = 400;
    throw err;
  }

  return true;
};

const saveExchangeImage = async ({ buffer, originalname, mimetype, size }) => {
  validateImageFile({ originalname, mimetype, size });
  return await exchangeImageProvider.saveImage({ buffer, originalname, mimetype, size });
};

const deleteExchangeImage = async (fileUrlOrName) => {
  return await exchangeImageProvider.deleteImage(fileUrlOrName);
};

const getExchangeImagePath = (fileUrlOrName) => {
  return exchangeImageProvider.getImagePath(fileUrlOrName);
};

module.exports = {
  saveFile,
  deleteFile,
  getFilePath,
  validateFile,
  saveResume,
  deleteResume,
  getResumeFilePath,
  validateResumeFile,
  saveExchangeImage,
  deleteExchangeImage,
  getExchangeImagePath,
  validateImageFile,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_RESUME_EXTENSIONS,
  ALLOWED_RESUME_MIME_TYPES,
  MAX_RESUME_SIZE_BYTES,
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
};

