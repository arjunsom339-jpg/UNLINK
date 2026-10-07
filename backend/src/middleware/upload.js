'use strict';

const multer = require('multer');
const { MAX_FILE_SIZE_BYTES } = require('../services/storageService');
const { sendError } = require('../utils/response');

// Use MemoryStorage so that storageService can perform deep validation and route to configured provider
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
});

/**
 * Single file upload wrapper with standardized error handling
 */
const singleUpload = (fieldName = 'file') => {
  const handler = upload.single(fieldName);
  return (req, res, next) => {
    handler(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            const maxMb = Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024));
            return sendError(res, {
              statusCode: 400,
              message: `File size exceeds the allowed limit of ${maxMb}MB.`,
            });
          }
          return sendError(res, {
            statusCode: 400,
            message: `Upload error: ${err.message}`,
          });
        }
        return sendError(res, {
          statusCode: err.statusCode || 400,
          message: err.message,
        });
      }
      next();
    });
  };
};

module.exports = {
  singleUpload,
};
