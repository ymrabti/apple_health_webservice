// const { v4 } = require("uuid");
const app = require("./app");
const config = require("./config/config");
const logger = require("./config/logger");
let server;

server = app.httpServer.listen(config.port, () => {
    logger.info(`Listening to port ${config.port}`);
});

/* 
const db = require("./models/database");
(async () => {
    try {
        const user = await db.usersModel.create({
            email: "john2@example.com",
            password: "Test1234",
            userName: "johnny12",
            firstName: "John",
            lastName: "Doe",
            photo: "avatar.png",
        });

        console.log(user.toJSON());
    } catch (err) {
        console.error("❌ DB error:", err);
    }
})(); */

const exitHandler = () => {
    if (server) {
        server.close(() => {
            logger.info("Server closed");
            process.exit(1);
        });
    } else {
        process.exit(1);
    }
};

const unexpectedErrorHandler = (error) => {
    logger.error(error);
    exitHandler();
};

process.on("uncaughtException", unexpectedErrorHandler);
process.on("unhandledRejection", unexpectedErrorHandler);

process.on("SIGTERM", () => {
    logger.info("SIGTERM received");
    if (server) {
        server.close();
    }
});
