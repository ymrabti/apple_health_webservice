const express = require("express");
const catchAsync = require("../utils/catchAsync");
const { userService } = require("../services");
const httpStatus = require("http-status");
const { checkModel, usersModel } = require("../models/database");
const { countChecks } = require("../services/user.service");

/**
 * Update user
 * @param {express.Request} req request
 * @param {express.Response} res response
 */
const myTodayChecks = async (req, res) => {
    const checks = await userService.myTodayChecks(
        req.user.id,
        req.user.role === "gate"
    );
    res.status(httpStatus.OK).send(checks);
};


async function uploadNewDaily (req, res) {
    try {
        const lastCheck = await checkModel.findOne({
            where: {
                userQrId: req.userOfferedQr.id,
                userScanId: req.user.id,
            },
            order: [["createdAt", "DESC"]],
        });

        if (lastCheck) {
            const diffTime = new Date() - new Date(lastCheck.scanTime);

            if (lastCheck && lastCheck.scanTime && diffTime / 60000 < 10) {
                return res.status(httpStatus.BAD_REQUEST).json({
                    error: "Short period between scans is not allowed",
                });
            }
        }
        const countChecksGate = await countChecks(
            req.user.id,
            req.userOfferedQr.id
        );

        const checkCreate = {
            qrId: req.qr_id,
            userQrId: req.userOfferedQr.id,
            userScanId: req.user.id,
            checkType: countChecksGate % 2 == 0 ? "in" : "out",
        };

        var checkCreated = await checkModel.create(checkCreate);
        if (!checkCreated) {
            return res.status(httpStatus.BAD_REQUEST).json({
                error: "Failed to create check record",
            });
        }

        const attrs = ["id", "role", "firstName", "lastName", "userName"];
        const includes = [
            {
                model: usersModel,
                as: "userQr",
                attributes: attrs,
            },
            {
                model: usersModel,
                as: "userScan",
                attributes: attrs,
            },
        ];
        const check = await checkModel.findByPk(
            checkCreated.getDataValue("id"),
            {
                attributes: ["id", "scanTime", "checkType"],
                include: includes,
            }
        );
        return res.status(httpStatus.OK).json(req.userOfferedQr);
    } catch (error) {
        console.error("Error creating check record:", error);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            error: "Internal server error",
        });
    }
}

module.exports = {
    myTodayChecks: catchAsync(myTodayChecks),
};
