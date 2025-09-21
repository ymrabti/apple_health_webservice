const express = require("express");
const { Socket } = require("socket.io");
const { uploadService } = require("../services");
const httpStatus = require("http-status");
const authQr = require("../middlewares/qr");
const { EVENTS } = require("../websockets/socket.io-config");
const auth = require("../middlewares/auth");
const { MySocketIO } = require("../websockets/socket.io");
const { allCapabilities } = require("../config/roles");
const { checkModel, usersModel } = require("../models/database");
const { countChecks } = require("../services/user.service");

const router = express.Router();

/**
 * Router With Socket
 * @param {Socket} socket socket instance from app.js
 * @param {MySocketIO} chatObject router
 * @returns {express.Router} Express router
 */
const ecoRouterRealtime = (socket, chatObject) => {
    router.post("/reset", auth(allCapabilities.resetTimer), (req, res) => {
        chatObject.resetTimer(socket, req.body.timer_in_seconds, false);
        res.status(httpStatus.OK).json();
    });

    router.post("/scan", auth(), authQr(), async (req, res) => {
        try {
            const lastCheck = await checkModel.findOne({
                where: {
                    userQrId: req.userOfferedQr.id,
                    userScanId: req.user.id,
                },
                order: [["scanTime", "DESC"]],
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
            } else {
                chatObject.resetTimer(
                    socket,
                    req.body.timer_in_seconds,
                    false,
                    req.userOfferedQr.id
                );
            }

            const attrs = ["id", "role", "firstName", "lastName", "username"];
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
            socket.to(req.userOfferedQr.id).emit(EVENTS.QR_SCANNE, req.user);
            socket
                .to([req.user.id, req.userOfferedQr.id])
                .emit(EVENTS.CHECK_CREATED, {
                    checkCreated: check.dataValues,
                });
            return res.status(httpStatus.OK).json(req.userOfferedQr);
        } catch (error) {
            console.error("Error creating check record:", error);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                error: "Internal server error",
            });
        }
    });

    return router;
};
module.exports = ecoRouterRealtime;
