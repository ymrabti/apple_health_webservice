const express = require("express");
const authCombined = require("../middlewares/auth");
const controller = require("../controllers/health.controller");
const validate = require("../middlewares/validate");

const router = express.Router();
router.use(authCombined());
// POST /api/apple-health/user-infos
router
    .route("/user-infos")
    // .get(controller.getUserInfos)
    .post(controller.saveUserInfos);

// POST /api/apple-health/daily-summaries
router
    .route("/daily-summaries")
    // .get(validate(), controller.getDailySummaries)
    .post(controller.saveDailySummaries);

// POST /api/apple-health/activity-summaries
router
    .route("/activity-summaries")
    // .get(validate(), controller.getActivitySummaries)
    .post(controller.saveActivitySummaries);

module.exports = router;
