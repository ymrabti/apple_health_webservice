const admin = require("firebase-admin");
const { NextFunction, Request, Response } = require("express");
const config = require("../config/config");
const { Socket } = require("socket.io");
const { resolve } = require("path");
const httpStatus = require("http-status");
const logger = require("../config/logger");

const servicesFilePath = resolve(config.google_Application_Credentials);

/* const serviceAccount = JSON.parse(fs.readFileSync(servicesFilePath, "utf-8"));

const app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
}); */

/**
 *
 * @param {Request} req request
 * @param {Response} res response
 * @param {NextFunction} next next function
 * @returns {Promise<any>} any
 */
const firebaseAppcheck = async (req, res, next) => {
    const appCheckToken = req.headers["x-firebase-appcheck"];

    if (!appCheckToken)
        return res
            .status(httpStatus.BAD_REQUEST)
            .json({ error: "Missing App Check token" });

    try {
        await admin.appCheck().verifyToken(appCheckToken);
        next();
    } catch (err) {
        logger.error(err);
        return res
            .status(httpStatus.FORBIDDEN)
            .json({ error: "Invalid App Check token" });
    }
};
/**
 *
 * @param {Socket} socket Socket
 * @param {NextFunction} next next Function
 * @returns {Promise(NextFunction)}
 */
const firebaseAppcheckSocket = async (socket, next) => {
    const appCheckToken = socket.handshake.headers["x-firebase-appcheck"];

    if (!appCheckToken) {
        logger.error("Missing App Check token");
        return next(new Error("Unauthorized: Missing App Check token"));
    }

    try {
        await admin.appCheck().verifyToken(appCheckToken);
        return next();
    } catch (err) {
        logger.error("Invalid App Check token", err);
        return next(new Error("Unauthorized: Invalid App Check token"));
    }
};

/**
 * Send Notification
 * @param {admin.messaging.Message} message
 * @return {Promise<boolean>} true or false
 */
async function sendNotification(message) {
    try {
        const response = await admin.messaging().send(message);
        logger.info("Successfully sent message:", response);
        return true;
    } catch (error) {
        logger.error("Error sending message:", error);
        return false;
    }
}

module.exports = { firebaseAppcheck, firebaseAppcheckSocket, sendNotification };
