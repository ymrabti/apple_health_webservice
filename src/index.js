// const { v4 } = require("uuid");
const app = require("./app");
const config = require("./config/config");
const logger = require("./config/logger");
const { setupDatabase } = require("./utils/database-setup");

let server;

// Setup database before starting server
(async () => {
    try {
        logger.info("Starting database setup...");
        await setupDatabase();
        logger.info("Database setup completed successfully");

        // Start server after database is ready
        server = app.httpServer.listen(config.port, () => {
            logger.info(`Listening to port ${config.port}`);
        });
    } catch (error) {
        logger.error("Failed to setup database:", error);
        process.exit(1);
    }
})();

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
