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

            // logger.info(JSON.stringify(socket.user, null, 4));
            socket.on(EVENTS.DISCONNECT, (reason) =>
                this.disconnect(socket, reason)
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
     * @param {any} reason msocket
     */
    disconnect(socket, reason) {
        logger.info(`CLIENT DISCONNECTED WITH A REASON: ${reason}`);
        socket.broadcast.emit(EVENTS.USER_LEAVE, null);
    }
}

module.exports = {
    MySocketIO,
};
