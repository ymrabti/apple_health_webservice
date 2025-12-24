const express = require('express');
const authCombined = require('../middlewares/auth');
const controller = require('../controllers/health_import.controller');

const router = express.Router();

// POST /api/apple-health/user-infos
router.post('/user-infos', authCombined(), controller.saveUserInfos);

// POST /api/apple-health/daily-summaries
router.post('/daily-summaries', authCombined(), controller.saveDailySummaries);

// POST /api/apple-health/activity-summaries
router.post('/activity-summaries', authCombined(), controller.saveActivitySummaries);

module.exports = router;
