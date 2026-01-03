const express = require("express");
const authCombined = require("../middlewares/auth");
const controller = require("../controllers/health.controller");
const validate = require("../middlewares/validate");
const { healthValidation } = require("../validations");
const multer = require("multer");

const router = express.Router();
router.use(authCombined());
// POST /api/apple-health/user-infos
router
    .route("/user-infos")
    .get(controller.getUserInfos)
    .post(validate(healthValidation.saveUserInfos), controller.saveUserInfos);

// POST /api/apple-health/daily-summaries
router
    .route("/daily-summaries")
    .get(
        validate(healthValidation.getDailySummaries),
        controller.getDailySummaries
    )
    .post(
        validate(healthValidation.saveDailySummaries),
        controller.saveDailySummaries
    );

// POST /api/apple-health/activity-summaries
router
    .route("/activity-summaries")
    .get(
        validate(healthValidation.getActivitySummaries),
        controller.getActivitySummaries
    )
    .post(
        validate(healthValidation.saveActivitySummaries),
        controller.saveActivitySummaries
    );

// POST /api/apple-health/stats-summaries
router
    .route("/stats-summaries")
    .get(
        validate(healthValidation.getActivitySummaries),
        controller.getStatsSummaries
    );

// Configure multer for file uploads
const upload = multer({
    dest: '/tmp/uploads/',
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    }
});

router.post("/import", upload.single("file"), controller.importHealthData);

module.exports = router;
