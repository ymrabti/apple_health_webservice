const httpStatus = require("http-status");
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

function getUserId(req) {
    // Prefer authenticated user if available; else fallback to body.userId
    if (req.user && req.user.id) return req.user.id;
    if (req.body && req.body.userId) return req.body.userId;
    throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Missing userId in request or auth context"
    );
}

function normalizeDate(d) {
    if (!d) return null;
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return null;
    return dt.toISOString().slice(0, 10);
}

function toDateOnly(dateStr) {
    // Convert YYYY-MM-DD string to Date at midnight UTC
    if (!dateStr) return null;
    return new Date(`${dateStr}T00:00:00.000Z`);
}

function computeHealthScore(summary) {
    // Weighted score based on completion ratios; skip weights with missing goals
    const toRatio = (value, goal) => {
        if (goal == null || goal === 0 || value == null) return null;
        return Math.min(1, Number(value) / Number(goal));
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
            summary.activeEnergyBurnedGoal
        ),
        moveTime: toRatio(summary.appleMoveTime, summary.appleMoveTimeGoal),
        exercise: toRatio(
            summary.appleExerciseTime,
            summary.appleExerciseTimeGoal
        ),
        stand: toRatio(summary.appleStandHours, summary.appleStandHoursGoal),
    };

    let score = 0;
    let totalWeight = 0;
    for (const key of Object.keys(weights)) {
        if (ratios[key] != null) {
            score += ratios[key] * weights[key];
            totalWeight += weights[key];
        }
    }
    if (totalWeight === 0) return null;
    const normalized = score / totalWeight; // 0..1
    return Math.round(normalized * 100); // percentage 0..100
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

// 1) Save user infos (Me.attributes) marked by exportDate
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
                "Invalid payload: exportDate and attributes are required"
            );
        }
        // Upsert by (userId + exportDate)
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
                        cardioFitnessMedicationsUse
                    ),
                weightInKilograms,
                heightInCentimeters,
            },
            { where: { id: existing.id } }
        );
        let diff = {};
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
        return res.status(httpStatus.OK).json({ ok: true, diff });
    } catch (err) {
        console.error(err);
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
                "Invalid userId: user does not exist"
            );
        }
        if (!Array.isArray(summaries)) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                "Invalid payload: summaries array required"
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
            // Normalize numeric fields if present
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

// GET daily summaries for a user
/**
 * Get daily summaries for a user
 * @param {import('express').Request} req request
 * @param {import('express').Response} res response
 * @param {import('express').NextFunction} next next middleware function
 * @returns {Promise<void>}
 */
async function getDailySummaries(req, res, next) {
    try {
        const { dateFrom, dateTo } = req.query;
        const userId = getUserId(req);
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
            `Fetched ${items.length} daily summaries for user ${userId}`
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
                "Invalid payload: exportDate and summaries array required"
            );
        }
        const lastDateDomponents = await activitySummariesModel.findOne({
            where: { userId },
            order: [["dateComponents", "DESC"]],
        });
        /* const newRowsSummaries = summaries.filter((item) => {
            const dateComponentsStr = normalizeDate(item.dateComponents);
            if (!dateComponentsStr) return false;
            const dateComponents = toDateOnly(dateComponentsStr);
            if (!lastDateDomponents) return true;
            const lastDateOnly = toDateOnly(lastDateDomponents.dataValues.dateComponents);
            return (
                dateComponents >= lastDateOnly
            );
        }); */
        let upserts = 0;
        for (const item of summaries) {
            if (!item || typeof item !== "object") continue;
            const dateComponentsStr = normalizeDate(item.dateComponents);
            if (!dateComponentsStr) continue;
            const dateComponents = toDateOnly(dateComponentsStr);
            // Normalize numeric fields if present
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
        const items = await activitySummariesModel.findAll({
            where: { userId },
            order: [["exportDate", "DESC"]],
        });
        return res.status(httpStatus.OK).json({ ok: true, items });
    } catch (err) {
        next(err);
    }
}

// GET stats for a user
async function getStatsSummaries(req, res, next) {
    try {
        const userId = getUserId(req);
        const sumDistance = await dailySummariesModel.sum("distance", {
            where: { userId },
        });
        const sequelize = activitySummariesModel.sequelize;
        const goalAchievements = await activitySummariesModel.count({
            where: sequelize.and(
                { userId },
                sequelize.where(
                    sequelize.col("activeEnergyBurned"),
                    ">=",
                    sequelize.col("activeEnergyBurnedGoal")
                )
            ),
        });
        const daysTracked = await dailySummariesModel.count({
            where: { userId },
        });
        const allActivities = await activitySummariesModel.findAll({
            where: { userId },
        });
        const scores = allActivities
            .map((row) => computeHealthScore(row.get({ plain: true })))
            .filter((v) => v != null);
        const healthScore =
            scores.length > 0
                ? Math.round(
                      scores.reduce((sum, v) => sum + v, 0) / scores.length
                  )
                : null;
        const healthGrade = healthScoreToGrade(healthScore);
        return res.status(httpStatus.OK).json({
            ok: true,
            sumDistance,
            goalAchievements,
            daysTracked,
            healthScore,
            healthGrade,
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getUserInfos,
    saveUserInfos,
    getDailySummaries,
    getStatsSummaries,
    saveDailySummaries,
    getActivitySummaries,
    saveActivitySummaries,
};
