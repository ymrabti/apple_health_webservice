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
            email: user.email,
            role: user.role,
            photo: user.photo,
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
            if (item.flights != null) payload.flights = Number(item.flights) || 0;
            if (item.distance != null)
                payload.distance = Number(item.distance);
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
async function getDailySummaries(req, res, next) {
    try {
        const userId = getUserId(req);
        const items = await dailySummariesModel.findAll({
            where: { userId },
            order: [["date", "DESC"]],
        });
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
        // Replace per (userId + exportDate)
        await activitySummariesModel.destroy({
            where: { userId, exportDate: toDateOnly(expDate) },
        });
        const record = await activitySummariesModel.bulkCreate(
            summaries.map((item) => {
                const dateStr = normalizeDate(item.date);
                const date = toDateOnly(dateStr);
                return {
                    userId,
                    exportDate: toDateOnly(expDate),
                    date,
                    ...item,
                };
            })
        );
        return res
            .status(httpStatus.OK)
            .json({ ok: true, count: summaries.length, id: record.id });
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

module.exports = {
    getUserInfos,
    saveUserInfos,
    getDailySummaries,
    saveDailySummaries,
    getActivitySummaries,
    saveActivitySummaries,
};
