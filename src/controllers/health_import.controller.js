const { resolve, join } = require("path");
const fs = require("fs");
const fsp = require("fs/promises");
const httpStatus = require("http-status");
const ApiError = require("../utils/ApiError");
const { prisma } = require("../prisma");

const STATIC_ROOT = resolve("static");

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
    throw new ApiError(httpStatus.BAD_REQUEST, "Missing userId in request or auth context");
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
        const expDate = normalizeDate(exportDate);
        if (!expDate || !attributes || typeof attributes !== "object") {
            throw new ApiError(httpStatus.BAD_REQUEST, "Invalid payload: exportDate and attributes are required");
        }
        // Upsert by (userId + exportDate)
        const existing = await prisma.userInfo.findFirst({ where: { userId, exportDate: toDateOnly(expDate) } });
        let record;
        if (existing) {
            record = await prisma.userInfo.update({
                where: { id: existing.id },
                data: { attributes },
            });
        } else {
            record = await prisma.userInfo.create({
                data: { userId, exportDate: toDateOnly(expDate), attributes },
            });
        }
        return res.status(httpStatus.OK).json({ ok: true, id: record.id });
    } catch (err) {
        next(err);
    }
}

// 2) Save daily summaries with uniqueness on (date + type)
async function saveDailySummaries(req, res, next) {
    try {
        const userId = getUserId(req);
        const { summaries } = req.body || {};
        if (!Array.isArray(summaries)) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Invalid payload: summaries array required");
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
            await prisma.dailySummary.upsert({
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
            throw new ApiError(httpStatus.BAD_REQUEST, "Invalid payload: exportDate and summaries array required");
        }
        // Replace per (userId + exportDate)
        await prisma.activitySummary.deleteMany({ where: { userId, exportDate: toDateOnly(expDate) } });
        const record = await prisma.activitySummary.create({
            data: { userId, exportDate: toDateOnly(expDate), summaries },
        });
        return res.status(httpStatus.OK).json({ ok: true, count: summaries.length, id: record.id });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    saveUserInfos,
    saveDailySummaries,
    saveActivitySummaries,
};
