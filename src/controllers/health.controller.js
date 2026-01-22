const httpStatus = require("http-status");
const moment = require("moment");
const { Namespace, Socket } = require("socket.io");
const ApiError = require("../utils/ApiError");
const {
    dailySummariesModel,
    activitySummariesModel,
    usersModel,
} = require("../models/database");
const {
    convertHKBiologicalSex,
    convertHKBloodType,
    convertHKFitzpatrickSkinType,
    convertHKCardioFitnessMedicationsUse,
} = require("../utils/Apple.Convertions");
const logger = require("../config/logger");
const { Op } = require("sequelize");
const fs = require("fs").promises;
const fsSync = require("fs");
const unzipper = require("unzipper");
const { generateWorkerToken } = require("../config/passport");
const { join, resolve } = require("path");
const config = require("../config/config");
const catchAsync = require("../utils/catchAsync");
const { generateToken } = require("../services/token.service");
const { tokenTypes } = require("../config/tokens");

function getUserId(req) {
    if (req.user && req.user.id) return req.user.id;
    if (req.body && req.body.userId) return req.body.userId;
    throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Missing userId in request or auth context",
    );
}

function normalizeDate(d) {
    if (!d) return null;
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return null;
    return dt.toISOString().slice(0, 10);
}

function isFiniteNumber(n) {
    return Number.isFinite(n);
}

function toDateOnly(dateStr) {
    if (!dateStr) return null;
    return new Date(`${dateStr}T00:00:00.000Z`);
}

function computeHealthScore(summary) {
    const toRatio = (value, goal) => {
        if (goal == null || goal === 0 || value == null) return null;
        const v = Number(value);
        const g = Number(goal);
        if (!isFiniteNumber(v) || !isFiniteNumber(g) || g === 0) return null;
        return Math.min(1, v / g);
    };

    const weights = {
        energy: 0.4,
        moveTime: 0.2,
        exercise: 0.2,
        stand: 0.2,
    };

    const ratios = {
        energy: toRatio(
            summary.activeEnergyBurned,
            summary.activeEnergyBurnedGoal,
        ),
        moveTime: toRatio(summary.appleMoveTime, summary.appleMoveTimeGoal),
        exercise: toRatio(
            summary.appleExerciseTime,
            summary.appleExerciseTimeGoal,
        ),
        stand: toRatio(summary.appleStandHours, summary.appleStandHoursGoal),
    };

    let score = 0;
    let totalWeight = 0;
    for (const key of Object.keys(weights)) {
        const r = ratios[key];
        if (r != null && isFiniteNumber(r)) {
            score += r * weights[key];
            totalWeight += weights[key];
        }
    }
    if (totalWeight === 0) return null;
    const normalized = score / totalWeight;
    return isFiniteNumber(normalized) ? Math.round(normalized * 100) : null;
}

function computeStepsScore(dailies) {
    if (!Array.isArray(dailies) || dailies.length === 0) return null;
    const byDate = new Map();
    for (const row of dailies) {
        const dateKey = normalizeDate(row.date);
        if (!dateKey) continue;
        const steps = row.steps != null ? Number(row.steps) : 0;
        byDate.set(dateKey, Math.max(byDate.get(dateKey) || 0, steps));
    }
    const dates = Array.from(byDate.keys());
    if (dates.length === 0) return null;
    const hits = dates.filter((d) => byDate.get(d) >= 10000).length;
    return Math.round((hits / dates.length) * 100);
}

function computeStreakScore(dailies) {
    if (!Array.isArray(dailies) || dailies.length === 0) return null;
    const sorted = [...dailies].sort(
        (a, b) => new Date(b.date) - new Date(a.date),
    );
    let streak = 0;
    for (const row of sorted) {
        const steps = row.steps != null ? Number(row.steps) : 0;
        if (steps >= 10000) {
            streak += 1;
        } else {
            break;
        }
    }
    if (streak === 0) return 0;
    return Math.min(100, Math.round((streak / 30) * 100));
}

function healthScoreToGrade(score) {
    if (score == null) return null;
    const s = Number(score);
    if (s >= 97) return "A+";
    if (s >= 93) return "A";
    if (s >= 90) return "A-";
    if (s >= 87) return "B+";
    if (s >= 83) return "B";
    if (s >= 80) return "B-";
    if (s >= 77) return "C+";
    if (s >= 73) return "C";
    if (s >= 70) return "C-";
    if (s >= 67) return "D+";
    if (s >= 63) return "D";
    if (s >= 60) return "D-";
    return "F";
}

/**
 * Get Socket.IO instance from request
 * @param {import('express').Request} req request
 * @returns {Socket} socket.io instance
 */
function getSocketIO(req) {
    return req.app.get("socketio");
}

/**
 * Save user infos (Me.attributes) marked by exportDate
 * @param {import('express').Request} req request
 * @param {import('express').Response} res response
 * @param {import('express').NextFunction} next next middleware
 * @returns
 */
async function saveUserInfos(req, res, next) {
    try {
        const userId = getUserId(req);
        const { exportDate, attributes } = req.body || {};
        const {
            HKCharacteristicTypeIdentifierDateOfBirth: dateOfBirth,
            HKCharacteristicTypeIdentifierBiologicalSex: biologicalSex,
            HKCharacteristicTypeIdentifierBloodType: bloodType,
            HKCharacteristicTypeIdentifierFitzpatrickSkinType:
                fitzpatrickSkinType,
            HKCharacteristicTypeIdentifierCardioFitnessMedicationsUse:
                cardioFitnessMedicationsUse,
            weightInKilograms,
            heightInCentimeters,
        } = attributes || {};
        const expDate = normalizeDate(exportDate);
        if (!expDate || !attributes || typeof attributes !== "object") {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                "Invalid payload: exportDate and attributes are required",
            );
        }
        const existing = await usersModel.findByPk(userId);
        await usersModel.update(
            {
                dateOfBirth,
                biologicalSex: convertHKBiologicalSex(biologicalSex),
                bloodType: convertHKBloodType(bloodType),
                fitzpatrickSkinType:
                    convertHKFitzpatrickSkinType(fitzpatrickSkinType),
                cardioFitnessMedicationsUse:
                    convertHKCardioFitnessMedicationsUse(
                        cardioFitnessMedicationsUse,
                    ),
                weightInKilograms,
                heightInCentimeters,
            },
            { where: { id: existing.id } },
        );
        const diff = {};
        if (existing.dateOfBirth !== dateOfBirth)
            diff.dateOfBirth = { old: existing.dateOfBirth, new: dateOfBirth };
        if (existing.biologicalSex !== biologicalSex)
            diff.biologicalSex = {
                old: existing.biologicalSex,
                new: biologicalSex,
            };
        if (existing.bloodType !== bloodType)
            diff.bloodType = { old: existing.bloodType, new: bloodType };
        if (existing.fitzpatrickSkinType !== fitzpatrickSkinType)
            diff.fitzpatrickSkinType = {
                old: existing.fitzpatrickSkinType,
                new: fitzpatrickSkinType,
            };
        if (
            existing.cardioFitnessMedicationsUse !== cardioFitnessMedicationsUse
        )
            diff.cardioFitnessMedicationsUse = {
                old: existing.cardioFitnessMedicationsUse,
                new: cardioFitnessMedicationsUse,
            };

        const io = getSocketIO(req);
        io.to(userId).emit("import_success");
        return res.status(httpStatus.OK).json({ ok: true, diff });
    } catch (err) {
        logger.error(err);
        next(err);
    }
}

// GET user infos (current user)
async function getUserInfos(req, res, next) {
    try {
        const userId = getUserId(req);
        const user = await usersModel.findByPk(userId);
        if (!user) {
            throw new ApiError(httpStatus.NOT_FOUND, "User not found");
        }
        return res.status(httpStatus.OK).json({
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            dateOfBirth: user.dateOfBirth,
            biologicalSex: user.biologicalSex,
            bloodType: user.bloodType,
            fitzpatrickSkinType: user.fitzpatrickSkinType,
            cardioFitnessMedicationsUse: user.cardioFitnessMedicationsUse,
            isEmailVerified: user.isEmailVerified,
            userName: user.userName,
            photo: user.photo,
            weightInKilograms: user.weightInKilograms,
            heightInCentimeters: user.heightInCentimeters,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        });
    } catch (err) {
        next(err);
    }
}

// 2) Save daily summaries with uniqueness on (date + type)
async function saveDailySummaries(req, res, next) {
    try {
        const userId = getUserId(req);
        const { summaries } = req.body || {};
        const userExists = await usersModel.findByPk(userId);
        if (!userExists) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                "Invalid userId: user does not exist",
            );
        }
        if (!Array.isArray(summaries)) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                "Invalid payload: summaries array required",
            );
        }
        let upserts = 0;
        for (const item of summaries) {
            if (!item || typeof item !== "object") continue;
            const dateStr = normalizeDate(item.date);
            if (!dateStr) continue;
            const exportDateStr = normalizeDate(item.exportDate);
            const date = toDateOnly(dateStr);
            const exportDate = exportDateStr ? toDateOnly(exportDateStr) : null;
            const payload = {
                userId,
                exportDate,
                date,
            };
            if (item.steps != null) payload.steps = Number(item.steps) || 0;
            if (item.flights != null)
                payload.flights = Number(item.flights) || 0;
            if (item.distance != null) payload.distance = Number(item.distance);
            if (item.active != null) payload.active = Number(item.active);
            if (item.basal != null) payload.basal = Number(item.basal);
            if (item.exercise != null) payload.exercise = Number(item.exercise);
            await dailySummariesModel.upsert(payload);
            upserts += 1;
        }
        return res.status(httpStatus.OK).json({ ok: true, upserts });
    } catch (err) {
        next(err);
    }
}

function calculateItemsByDays(days) {
    if (days <= 180) {
        return Math.floor((45 / 180) * days);
    }

    const baseDays = 180;
    const baseItems = 45;

    return Math.floor(baseItems * Math.sqrt(days / baseDays));
}

// GET daily summaries for a user
async function getDailySummaries(req, res, next) {
    try {
        const { dateFrom, dateTo } = req.query;
        const userId = getUserId(req);
        if (!dateFrom || !dateTo) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                "dateFrom and dateTo query parameters are required",
            );
        }
        if (new Date(dateFrom) > new Date(dateTo)) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                "dateFrom cannot be later than dateTo",
            );
        }
        const timeDifference = new Date(dateTo) - new Date(dateFrom);
        const rangeDays = Math.ceil(timeDifference / (24 * 60 * 60 * 1000));
        if (timeDifference >= 180 * 24 * 60 * 60 * 1000) {
            const MAX_RANGE_DAYS = 180;
            const MIN_SAMPLES = 45;
            const MAX_SAMPLES = 80;
            const GAPS = calculateItemsByDays(rangeDays);
            /* const query = `
                SELECT *
                FROM (
                    SELECT r.*,
                           ROW_NUMBER() OVER (ORDER BY date DESC) AS rn
                    FROM daily_summaries r
                    WHERE userId = :userId
                      AND date >= :dateFrom
                      AND date <= :dateTo
                ) AS subquery
                WHERE (rn - 1) % :gaps = 0
                ORDER BY date DESC;
            `; */
            const query = `WITH ordered AS (
    SELECT
        r.*,
        ROW_NUMBER() OVER (ORDER BY r.date) AS rn,
        COUNT(*) OVER () AS total_rows
    FROM daily_summaries r
    WHERE userId = '7d835ab7-835d-4a38-b133-6392a0445fb8'
),
params AS (
    SELECT
        total_rows,
        GREATEST(
            45,
            FLOOR(45 * SQRT(:days_range / 180))
        ) AS target_items
    FROM ordered
    LIMIT 1
)
SELECT o.*
FROM ordered o
JOIN params p
WHERE MOD(o.rn - 1, CEILING(p.total_rows / p.target_items)) = 0
ORDER BY o.date DESC;
`;

            const desiredSamples = Math.min(
                MAX_SAMPLES,
                Math.max(
                    MIN_SAMPLES,
                    Math.round((rangeDays / MAX_RANGE_DAYS) * MIN_SAMPLES),
                ),
            );

            const allItems = await dailySummariesModel.sequelize.query(query, {
                replacements: {
                    userId,
                    dateFrom: toDateOnly(normalizeDate(dateFrom)),
                    dateTo: toDateOnly(normalizeDate(dateTo)),
                    days_range: rangeDays,
                    gaps: GAPS,
                },
                // logging: (msg) => logger.debug(msg),
                type: dailySummariesModel.sequelize.QueryTypes.SELECT,
            });

            return res.status(httpStatus.OK).json({
                ok: true,
                length: allItems.length,
                daysRange: rangeDays,
                desiredSamples,
                gaps: GAPS,
                items: allItems,
            });
        }
        const items = await dailySummariesModel.findAll({
            where: {
                userId,
                date: {
                    [Op.gte]: toDateOnly(normalizeDate(dateFrom)),
                    [Op.lte]: toDateOnly(normalizeDate(dateTo)),
                },
            },
            order: [["date", "DESC"]],
        });
        logger.info(
            `Fetched ${items.length} daily summaries for user ${userId}`,
        );
        return res.status(httpStatus.OK).json({ ok: true, items });
    } catch (err) {
        next(err);
    }
}

// 3) Save activity summaries array (by exportDate file)
async function saveActivitySummaries(req, res, next) {
    try {
        const userId = getUserId(req);
        const { exportDate, summaries } = req.body || {};
        const expDate = normalizeDate(exportDate);
        if (!expDate || !Array.isArray(summaries)) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                "Invalid payload: exportDate and summaries array required",
            );
        }
        let upserts = 0;
        for (const item of summaries) {
            if (!item || typeof item !== "object") continue;
            const dateComponentsStr = normalizeDate(item.dateComponents);
            if (!dateComponentsStr) continue;
            const dateComponents = toDateOnly(dateComponentsStr);
            const payload = {
                userId,
                exportDate: toDateOnly(expDate),
                dateComponents,
            };
            if (item.activeEnergyBurned != null)
                payload.activeEnergyBurned =
                    Number(item.activeEnergyBurned) || 0;
            if (item.activeEnergyBurnedGoal != null)
                payload.activeEnergyBurnedGoal =
                    Number(item.activeEnergyBurnedGoal) || 0;
            if (item.activeEnergyBurnedUnit != null)
                payload.activeEnergyBurnedUnit = item.activeEnergyBurnedUnit;
            if (item.appleMoveTime != null)
                payload.appleMoveTime = Number(item.appleMoveTime) || 0;
            if (item.appleMoveTimeGoal != null)
                payload.appleMoveTimeGoal = Number(item.appleMoveTimeGoal) || 0;
            if (item.appleExerciseTime != null)
                payload.appleExerciseTime = Number(item.appleExerciseTime) || 0;
            if (item.appleExerciseTimeGoal != null)
                payload.appleExerciseTimeGoal =
                    Number(item.appleExerciseTimeGoal) || 0;
            if (item.appleStandHours != null)
                payload.appleStandHours = Number(item.appleStandHours) || 0;
            if (item.appleStandHoursGoal != null)
                payload.appleStandHoursGoal =
                    Number(item.appleStandHoursGoal) || 0;

            await activitySummariesModel.upsert(payload);
            upserts += 1;
        }
        return res
            .status(httpStatus.OK)
            .json({ ok: true, count: upserts, attempted: summaries.length });
    } catch (err) {
        next(err);
    }
}

// GET activity summaries for a user
async function getActivitySummaries(req, res, next) {
    try {
        const userId = getUserId(req);

        const { dateFrom, dateTo } = req.query;

        const from = toDateOnly(normalizeDate(dateFrom));
        const to = toDateOnly(normalizeDate(dateTo));

        const whereDaily = { userId };
        if (from || to) {
            whereDaily.dateComponents = {};
            if (from) whereDaily.dateComponents[Op.gte] = from;
            if (to) whereDaily.dateComponents[Op.lte] = to;
        }

        if (new Date(dateFrom) > new Date(dateTo)) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                "dateFrom cannot be later than dateTo",
            );
        }
        const timeDifference = new Date(dateTo) - new Date(dateFrom);
        const rangeDays = Math.ceil(timeDifference / (24 * 60 * 60 * 1000));
        if (timeDifference >= 180 * 24 * 60 * 60 * 1000) {
            const MAX_RANGE_DAYS = 180;
            const MIN_SAMPLES = 45;
            const MAX_SAMPLES = 80;
            const GAPS = calculateItemsByDays(rangeDays);
            const desiredSamples = Math.min(
                MAX_SAMPLES,
                Math.max(
                    MIN_SAMPLES,
                    Math.round((rangeDays / MAX_RANGE_DAYS) * MIN_SAMPLES),
                ),
            );
            const query = `WITH ordered AS (
    SELECT
        r.*,
        ROW_NUMBER() OVER (ORDER BY r.dateComponents) AS rn,
        COUNT(*) OVER () AS total_rows
    FROM activity_summaries r
    WHERE userId = :userId
      AND dateComponents >= :dateFrom
      AND dateComponents <= :dateTo
),params AS (
    SELECT
        total_rows,
        GREATEST(
            45,
            FLOOR(45 * SQRT(:days_range / 180))
        ) AS target_items
    FROM ordered
    LIMIT 1
)
SELECT o.*
FROM ordered o
JOIN params p
WHERE MOD(o.rn - 1, CEILING(p.total_rows / p.target_items)) = 0
ORDER BY o.dateComponents DESC;
`;
            const allItems = await dailySummariesModel.sequelize.query(query, {
                replacements: {
                    userId,
                    dateFrom: toDateOnly(normalizeDate(dateFrom)),
                    dateTo: toDateOnly(normalizeDate(dateTo)),
                    days_range: rangeDays,
                    gaps: GAPS,
                },
                // logging: (msg) => logger.debug(msg),
                type: dailySummariesModel.sequelize.QueryTypes.SELECT,
            });
            return res.status(httpStatus.OK).json({
                ok: true,
                length: allItems.length,
                daysRange: rangeDays,
                desiredSamples,
                gaps: GAPS,
                items: allItems,
            });
        }

        const items = await activitySummariesModel.findAll({
            where: whereDaily,
            order: [["exportDate", "DESC"]],
        });
        return res.status(httpStatus.OK).json({ ok: true, items });
    } catch (err) {
        next(err);
    }
}

// GET stats for a user
// example: /api/health/stats?dateFrom=2024-01-01&dateTo=2024-06-30
async function getStatsSummaries(req, res, next) {
    try {
        const userId = getUserId(req);
        const { dateFrom, dateTo } = req.query;

        const from = toDateOnly(normalizeDate(dateFrom));
        const to = toDateOnly(normalizeDate(dateTo));

        const whereDaily = { userId };
        if (from || to) {
            whereDaily.date = {};
            if (from) whereDaily.date[Op.gte] = from;
            if (to) whereDaily.date[Op.lte] = to;
        }

        const whereActivity = { userId };
        if (from || to) {
            whereActivity.dateComponents = {};
            if (from) whereActivity.dateComponents[Op.gte] = from;
            if (to) whereActivity.dateComponents[Op.lte] = to;
        }

        const sumDistance = await dailySummariesModel.sum("distance", {
            where: whereDaily,
        });

        const sequelize = activitySummariesModel.sequelize;
        const goalAchievements = await activitySummariesModel.count({
            where: sequelize.and(
                whereActivity,
                sequelize.where(
                    sequelize.col("activeEnergyBurned"),
                    ">=",
                    sequelize.col("activeEnergyBurnedGoal"),
                ),
            ),
        });

        const daysTracked = await dailySummariesModel.count({
            where: whereDaily,
        });

        const allActivities = await activitySummariesModel.findAll({
            where: whereActivity,
        });
        const activityScores = allActivities
            .map((row) => computeHealthScore(row.get({ plain: true })))
            .filter((v) => v != null && isFiniteNumber(v));
        const activityScore =
            activityScores.length > 0
                ? Math.round(
                      activityScores.reduce((sum, v) => sum + v, 0) /
                          activityScores.length,
                  )
                : null;

        const allDaily = await dailySummariesModel.findAll({
            where: whereDaily,
        });
        const stepsScore = computeStepsScore(allDaily);
        const streakScore = computeStreakScore(allDaily);

        const weights = { activity: 0.6, steps: 0.25, streak: 0.15 };
        let weightedSum = 0;
        let weightTotal = 0;
        const add = (val, w) => {
            if (val != null && isFiniteNumber(val)) {
                weightedSum += val * w;
                weightTotal += w;
            }
        };
        add(activityScore, weights.activity);
        add(stepsScore, weights.steps);
        add(streakScore, weights.streak);
        const healthScore =
            weightTotal > 0 && isFiniteNumber(weightedSum)
                ? Math.round(weightedSum / weightTotal)
                : null;
        const healthGrade = healthScoreToGrade(healthScore);

        return res.status(httpStatus.OK).json({
            sumDistance,
            goalAchievements,
            daysTracked,
            healthScore,
            healthGrade,
            components: { activityScore, stepsScore, streakScore },
        });
    } catch (err) {
        next(err);
    }
}

async function importHealthData(req, res, next) {
    const zipPath = req.file?.path;

    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const userId = req.user.userId || req.user.id;
        logger.info(`📦 Processing upload for user: ${userId}`);

        // Create user-specific directory
        const uploadDir = config.persistent_Storage_Dir;
        const userDir = join(uploadDir, "health_imports", userId.toString());
        await fs.mkdir(userDir, { recursive: true });

        const xmlPath = join(userDir, "export.xml");
        let xmlFound = false;

        // Extract export.xml from zip
        await new Promise((resolve, reject) => {
            fsSync
                .createReadStream(zipPath)
                .pipe(unzipper.Parse())
                .on("entry", (entry) => {
                    const fileName = entry.path;

                    // Look for export.xml in various locations
                    if (fileName.endsWith("export.xml")) {
                        logger.info(`📄 Found export.xml: ${fileName}`);
                        xmlFound = true;
                        entry.pipe(fsSync.createWriteStream(xmlPath));
                    } else {
                        entry.autodrain();
                    }
                })
                .on("error", reject)
                .on("close", resolve);
        });

        if (!xmlFound) {
            throw new Error("export.xml not found in zip file");
        }

        // Clean up zip file
        await fs.unlink(zipPath);

        // Create job file for Python worker
        const accessWorkerExpires = moment().add(2, "minutes");
        const workerToken = generateToken(
            userId,
            accessWorkerExpires,
            tokenTypes.ACCESS,
        );
        const exportXmlFilePath = resolve(
            config.persistent_Storage_Dir,
            "health_imports",
            userId.toString(),
            "export.xml",
        );
        const jobData = {
            xml_path: exportXmlFilePath,
            token: workerToken,
            user_id: userId.toString(),
            created_at: new Date().toISOString(),
        };

        const jobPath = join(userDir, `${userId}_job.json`);
        await fs.writeFile(jobPath, JSON.stringify(jobData, null, 2));

        logger.info(`✅ Created processing job for user ${userId}`);

        res.json({
            success: true,
            message: "File uploaded and queued for processing",
            jobId: userId.toString(),
        });
    } catch (error) {
        logger.error("❌ Upload error:", error);

        // Clean up on error
        if (zipPath) {
            try {
                await fs.unlink(zipPath);
            } catch (e) {
                // Ignore cleanup errors
            }
        }

        res.status(500).json({
            error: "Failed to process upload",
            details: error.message,
        });
    }
}

module.exports = {
    getUserInfos: catchAsync(getUserInfos),
    saveUserInfos: catchAsync(saveUserInfos),
    importHealthData: catchAsync(importHealthData),
    getDailySummaries: catchAsync(getDailySummaries),
    getStatsSummaries: catchAsync(getStatsSummaries),
    saveDailySummaries: catchAsync(saveDailySummaries),
    getActivitySummaries: catchAsync(getActivitySummaries),
    saveActivitySummaries: catchAsync(saveActivitySummaries),
};
