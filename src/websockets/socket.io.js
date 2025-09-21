const { Socket } = require("socket.io");
const logger = require("../config/logger");
const moment = require("moment");
const { v4 } = require("uuid");
const passport = require("passport");
const { EVENTS } = require("./socket.io-config");
const config = require("../config/config");
const { generateToken } = require("../services/token.service");
const { tokenTypes } = require("../config/tokens");
const { firebaseAppcheckSocket } = require("../middlewares/app_check");

class MySocketIO {
    timer;
    socket;

    /**
     * auth for Socket.io
     * @param {Socket} socket socketto
     * @param {*} next next
     */
    async authSocket(socket, next) {
        await passport.authenticate(
            "jwtSocketHeaders",
            { session: false, failWithError: true },
            (err, user, info) => {
                if (err || !user || info) {
                    logger.error("Authentication error => ", err || info);
                    socket.emit(EVENTS.JWT_EXPIRED, "");
                    return;
                }

                socket.user = user;
                socket.join(user.id);
                next();
            }
        )(socket.request, {}, next);
    }

    /**
     * auth for Socket.io
     * @param {Socket} socket socketto
     * @param {*} next next
     */
    async authAppCheck(socket, next) {
        try {
            await firebaseAppcheckSocket(socket, async (err) => {
                if (err) {
                    return next(err);
                }

                // AppCheck OK, now JWT auth
                await passport.authenticate(
                    "jwtSocketHeaders",
                    { session: false, failWithError: true },
                    (err, user, info) => {
                        if (err || !user || info) {
                            logger.error(
                                "Authentication error => ",
                                err || info
                            );
                            socket.emit(EVENTS.JWT_EXPIRED, "");
                            return next(new Error("Unauthorized: Invalid JWT"));
                        }

                        socket.user = user;
                        socket.join(user.id);
                        next();
                    }
                )(socket.request, {}, next);
            });
        } catch (error) {
            logger.error("Fatal error in auth Socket", error);
            return next(new Error("Internal server error"));
        }
    }

    /**
     *
     * @param {Socket} sock socket
     */
    constructor(sock) {
        this.socket = sock;
        this.socket.use(this.authSocket);
        /**
         *
         * @param {Socket} socket msocket
         */

        this.socket.on("connection", (socket) => {
            this.resetTimer(socket, config.jwt.qrExpirationSeconds, true);

            // logger.info(JSON.stringify(socket.user, null, 4));
            socket.on(EVENTS.DISCONNECT, (reason) =>
                this.disconnect(socket, reason)
            );
            socket.on(EVENTS.RESET_TIMER, () =>
                this.resetTimer(socket, config.jwt.qrExpirationSeconds, false)
            );
            socket.on(EVENTS.CONNECT_ERROR, (err) => {
                logger.info(`CONNECT_ERROR DUE TO ${err.message}`);
            });

            logger.info(`NEW CLIENT CONNECTED ${socket.id}, 
            ID: ${socket.user.id}
            Role = ${socket.user.role}`);
        });
    }

    /**
     *
     * @param {Socket} socket msocket
     * @param {number} newTimer msocket
     * @param {boolean} firstTime msocket
     * @param {string} id fallback_id
     */
    resetTimer(socket, newTimer, firstTime, id) {
        const role = socket.user?.role;
        if (!firstTime || (firstTime && role === "gate")) {
            if (this.timer != null) clearInterval(this.timer);
            this.handleQr(socket, id);
            this.timer = setInterval(() => {
                this.handleQr(socket, id);
            }, (newTimer ?? 15) * 1000);
        }
    }

    /**
     *
     * @param {Socket} socket msocket
     * @param {any} reason msocket
     */
    disconnect(socket, reason) {
        logger.info(`CLIENT DISCONNECTED WITH A REASON: ${reason}`);
        socket.broadcast.emit(EVENTS.USER_LEAVE, null);
    }

    /**
     *
     * @param {Socket} msocket msocket
     * @param {string} id fallback_id
     */
    handleQr(msocket, id) {
        const qrExpires = moment().add(
            config.jwt.qrExpirationSeconds,
            "seconds"
        );
        const qr_new = generateToken(
            msocket.user?.id ?? id,
            qrExpires,
            tokenTypes.QR,
            v4()
        );
        msocket.emit(EVENTS.QR_STREAM, {
            qr: qr_new,
            generated: new Date().toISOString(),
            lifecyle_in_seconds: config.jwt.qrExpirationSeconds,
        });
    }
}

module.exports = {
    MySocketIO,
};
