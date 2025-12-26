const { resolve, join } = require("path");
const fs = require("fs");
const fsp = require("fs/promises");
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

async function ensureDir(dirPath) {
    await fsp.mkdir(dirPath, { recursive: true });
}

async function readJson(filePath, fallback = {}) {
    try {
        const buf = await fsp.readFile(filePath);
        return JSON.parse(buf.toString("utf8"));
    } catch (e) {
        return fallback;
    }
}

async function writeJson(filePath, data) {
    const json = JSON.stringify(data, null, 2);
    await ensureDir(join(filePath, ".."));
    await fsp.writeFile(filePath, json, "utf8");
}

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

// 2) Save daily summaries with uniqueness on (date + type)
async function saveDailySummaries(req, res, next) {
    try {
        const userId = getUserId(req);
        const { summaries } = req.body || {};
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
            const type = String(item.type || "").trim();
            if (!dateStr || !type) continue;
            const exportDateStr = normalizeDate(item.exportDate);
            const value = item.value != null ? Number(item.value) : null;
            const unit = item.unit || null;
            const date = toDateOnly(dateStr);
            const exportDate = exportDateStr ? toDateOnly(exportDateStr) : null;
            // Upsert via compound unique (userId, date, type)
            await dailySummariesModel.upsert({
                where: { userId_date_type: { userId, date, type } },
                update: { value, unit, exportDate },
                create: { userId, date, type, value, unit, exportDate },
            });
            upserts += 1;
        }
        return res.status(httpStatus.OK).json({ ok: true, upserts });
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

module.exports = {
    saveUserInfos,
    saveDailySummaries,
    saveActivitySummaries,
};
