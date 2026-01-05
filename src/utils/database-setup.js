/**
 * Database Setup Utility
 *
 * Checks if database tables exist and applies Sequelize migrations if needed.
 * This runs automatically when the server starts.
 */

const { Sequelize } = require("sequelize");
const logger = require("../config/logger");
const config = require("../config/config");

console.info(config.mysql);
// Create Sequelize instance with environment variables (Docker) or config.json (local)
let sequelize;
if (config.mysql.DATABASE_URL) {
    // Use DATABASE_URL if available (Docker)
    sequelize = new Sequelize(config.mysql.DATABASE_URL, {
        dialect: "mysql",
        logging: false,
    });
} else if (config.mysql.DB_HOST) {
    // Use individual environment variables
    sequelize = new Sequelize(
        config.mysql.DB_DATABASE,
        config.mysql.DB_USER,
        config.mysql.DB_PASSWORD || null,
        {
            host: config.mysql.DB_HOST,
            port: config.mysql.DB_PORT || 3306,
            dialect: "mysql",
            logging: false,
        }
    );
}

// Get database name for table checking
const dbName = config.mysql.DB_DATABASE;

/**
 * Check if database connection is available with retry logic
 */
async function checkDatabaseConnection(retries = 5, delay = 3000) {
    for (let i = 1; i <= retries; i++) {
        try {
            await sequelize.authenticate();
            logger.info("✓ Database connection established");
            return true;
        } catch (error) {
            logger.error(
                `✗ Database connection attempt ${i}/${retries} failed:`,
                error.message
            );
            if (i < retries) {
                logger.info(`→ Retrying in ${delay / 1000} seconds...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }
    logger.error("✗ All database connection attempts failed");
    return false;
}

/**
 * Check if tables exist in the database
 */
async function checkTablesExist() {
    try {
        // Check if users table exists
        const [results] = await sequelize.query(
            "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = :database AND table_name = 'users'",
            {
                replacements: { database: dbName },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        const tableExists = results && results.count > 0;

        if (tableExists) {
            logger.info("✓ Database tables already exist");
        } else {
            logger.info("✗ Database tables do not exist");
        }

        return tableExists;
    } catch (error) {
        logger.error("Error checking tables:", error.message);
        return false;
    }
}

/**
 * SQL Migrations generated from Prisma schema
 */
const migrations = [
    // Create users table
    `CREATE TABLE IF NOT EXISTS users (
        id CHAR(36) PRIMARY KEY,
        firstName VARCHAR(100) NOT NULL,
        lastName VARCHAR(100) NOT NULL,
        dateOfBirth DATE DEFAULT NULL,
        userName VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin', 'moderator') DEFAULT 'user',
        photo VARCHAR(255) NOT NULL,
        isEmailVerified BOOLEAN DEFAULT false,
        createdAt DATETIME DEFAULT NULL,
        updatedAt DATETIME DEFAULT NULL,
        biologicalSex ENUM('NOT_SET', 'FEMALE', 'MALE', 'OTHER') DEFAULT 'NOT_SET',
        bloodType ENUM('NOT_SET', 'A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE') DEFAULT 'NOT_SET',
        fitzpatrickSkinType ENUM('NOT_SET', 'TYPE_I', 'TYPE_II', 'TYPE_III', 'TYPE_IV', 'TYPE_V', 'TYPE_VI') DEFAULT 'NOT_SET',
        cardioFitnessMedicationsUse ENUM('NOT_SET', 'NONE', 'BETA_BLOCKERS', 'CALCIUM_CHANNEL_BLOCKERS', 'COMBINATION') DEFAULT 'NOT_SET',
        weightInKilograms DECIMAL(5, 2) DEFAULT NULL,
        heightInCentimeters DECIMAL(5, 2) DEFAULT NULL,
        INDEX idx_userName (userName),
        INDEX idx_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Create tokens table
    `CREATE TABLE IF NOT EXISTS tokens (
        id CHAR(36) PRIMARY KEY,
        token VARCHAR(255) NOT NULL,
        userId CHAR(36) NOT NULL,
        type ENUM('refresh', 'resetPassword', 'verifyEmail') NOT NULL,
        expires DATETIME NOT NULL,
        blacklisted BOOLEAN DEFAULT false,
        createdAt DATETIME DEFAULT NULL,
        updatedAt DATETIME DEFAULT NULL,
        INDEX idx_userId (userId),
        INDEX idx_token (token)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Create daily_summaries table
    `CREATE TABLE IF NOT EXISTS daily_summaries (
        id CHAR(36) PRIMARY KEY,
        userId CHAR(36) NOT NULL,
        date DATE NOT NULL,
        steps INT DEFAULT NULL,
        flights INT DEFAULT NULL,
        distance DECIMAL(12, 4) DEFAULT NULL,
        active DECIMAL(12, 4) DEFAULT NULL,
        basal DECIMAL(12, 4) DEFAULT NULL,
        exercise DECIMAL(12, 4) DEFAULT NULL,
        exportDate DATE DEFAULT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT NULL,
        UNIQUE KEY unique_userId_date (userId, date),
        INDEX idx_userId (userId),
        INDEX idx_date (date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Create activity_summaries table
    `CREATE TABLE IF NOT EXISTS activity_summaries (
        id CHAR(36) PRIMARY KEY,
        userId CHAR(36) NOT NULL,
        exportDate DATE NOT NULL,
        dateComponents DATE NOT NULL,
        activeEnergyBurned DECIMAL(12, 4) DEFAULT NULL,
        activeEnergyBurnedGoal DECIMAL(12, 4) DEFAULT NULL,
        activeEnergyBurnedUnit VARCHAR(50) DEFAULT NULL,
        appleMoveTime DECIMAL(12, 4) DEFAULT NULL,
        appleMoveTimeGoal DECIMAL(12, 4) DEFAULT NULL,
        appleExerciseTime DECIMAL(12, 4) DEFAULT NULL,
        appleExerciseTimeGoal DECIMAL(12, 4) DEFAULT NULL,
        appleStandHours DECIMAL(12, 4) DEFAULT NULL,
        appleStandHoursGoal DECIMAL(12, 4) DEFAULT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT NULL,
        UNIQUE KEY user_datecomponents_unique (userId, dateComponents),
        INDEX idx_userId_exportDate (userId, exportDate)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

/**
 * Apply SQL migrations directly
 */
async function applyMigrations() {
    try {
        logger.info("→ Applying SQL migrations...");

        for (let i = 0; i < migrations.length; i++) {
            logger.info(
                `→ Applying migration ${i + 1}/${migrations.length}...`
            );
            await sequelize.query(migrations[i]);
        }

        logger.info("✓ Migrations applied successfully");
        return true;
    } catch (error) {
        logger.error("✗ Migration failed:", error.message);
        throw error;
    }
}

/**
 * Main setup function
 */
async function setupDatabase() {
    logger.info("=== Database Setup Started ===");

    try {
        // Step 1: Check database connection
        const isConnected = await checkDatabaseConnection();
        if (!isConnected) {
            throw new Error("Cannot proceed without database connection");
        }

        // Step 2: Check if tables exist
        const tablesExist = await checkTablesExist();

        // Step 3: Apply migrations if tables don't exist or apply pending ones
        if (!tablesExist) {
            logger.info("→ Database is empty. Initializing schema...");
            await applyMigrations();

            // Verify tables were created
            const tablesCreated = await checkTablesExist();
            if (!tablesCreated) {
                throw new Error("Tables were not created after migration");
            }

            logger.info("✓ Database initialized successfully");
        } else {
            logger.info(
                "→ Database schema is already set up. Checking for pending migrations..."
            );
            await applyMigrations();
        }

        logger.info("=== Database Setup Completed Successfully ===");
    } catch (error) {
        logger.error("✗ Database setup failed:", error.message);
        throw error;
    } finally {
        await sequelize.close();
    }
}

module.exports = {
    setupDatabase: setupDatabase,
    checkDatabaseConnection: checkDatabaseConnection,
    checkTablesExist: checkTablesExist,
    applyMigrations: applyMigrations,
};
