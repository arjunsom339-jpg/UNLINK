'use strict';

const express = require('express');
const { authenticate } = require('../middleware/authenticate');
const { sendSuccess, sendError } = require('../utils/response');
const skillService = require('../services/skillService');

const router = express.Router();

/**
 * GET /api/skills — Public/Authenticated skill catalog with category and search
 */
router.get('/', async (req, res, next) => {
  try {
    const { category, query, popularOnly } = req.query;
    const skills = await skillService.getSkills({
      category,
      query,
      popularOnly: popularOnly === 'true',
    });
    return sendSuccess(res, { data: skills });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
