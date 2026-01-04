/**
 * Database Setup Utility
 * 
 * Checks if database tables exist and applies Sequelize migrations if needed.
 * This runs automatically when the server starts.
 */

const { Sequelize } = require('sequelize');
const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const logger = require('../config/logger');
const config = require('../config/config');

const execPromise = util.promisify(exec);

// Get environment
const env = config.env || 'development';
logger.info(config.mysql);
// Create Sequelize instance with environment variables (Docker) or config.json (local)
let sequelize;
if (config.mysql.DATABASE_URL) {
    // Use DATABASE_URL if available (Docker)
    sequelize = new Sequelize(config.mysql.DATABASE_URL, {
        dialect: 'mysql',
        logging: false
    });
} else if (config.mysql.DB_HOST) {
    // Use individual environment variables
    sequelize = new Sequelize(
        config.mysql.DB_DATABASE || 'health_db',
        config.mysql.DB_USER || 'root',
        config.mysql.DB_PASSWORD || null,
        {
            host: config.mysql.DB_HOST,
            port: config.mysql.DB_PORT || 3306,
            dialect: 'mysql',
            logging: false
        }
    );
}

// Get database name for table checking
const dbName = config.mysql.DB_DATABASE || 'health_db';

/**
 * Check if database connection is available with retry logic
 */
async function checkDatabaseConnection(retries = 5, delay = 3000) {
    for (let i = 1; i <= retries; i++) {
        try {
            await sequelize.authenticate();
            logger.info('✓ Database connection established');
            return true;
        } catch (error) {
            logger.error(`✗ Database connection attempt ${i}/${retries} failed:`, error.message);
            if (i < retries) {
                logger.info(`→ Retrying in ${delay/1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    logger.error('✗ All database connection attempts failed');
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
                type: Sequelize.QueryTypes.SELECT
            }
        );

        const tableExists = results && results.count > 0;
        
        if (tableExists) {
            logger.info('✓ Database tables already exist');
        } else {
            logger.info('✗ Database tables do not exist');
        }
        
        return tableExists;
    } catch (error) {
        logger.error('Error checking tables:', error.message);
        return false;
    }
}

/**
 * Apply Sequelize migrations
 */
async function applyMigrations() {
    try {
        logger.info('→ Applying Sequelize migrations...');
        
        // Determine the correct working directory
        // In production (Docker), app is always at /usr/src/app
        // In development, calculate relative to src/utils
        const appRoot = process.env.NODE_ENV === 'production' 
            ? '/usr/src/app'
            : path.resolve(__dirname, '../..');
        
        logger.info(`→ Running migrations from: ${appRoot}`);
        
        // Run sequelize-cli db:migrate
        const { stdout, stderr } = await execPromise('npx sequelize-cli db:migrate', {
            cwd: appRoot,
            env: { ...process.env, NODE_ENV: env }
        });

        if (stdout) logger.info(stdout);
        if (stderr && !stderr.includes('warning')) logger.error(stderr);

        logger.info('✓ Migrations applied successfully');
        return true;
    } catch (error) {
        logger.error('✗ Migration failed:', error.message);
        if (error.stdout) logger.info(error.stdout);
        if (error.stderr) logger.error(error.stderr);
        throw error;
    }
}

/**
 * Main setup function
 */
async function setupDatabase() {
    logger.info('=== Database Setup Started ===');

    try {
        // Step 1: Check database connection
        const isConnected = await checkDatabaseConnection();
        if (!isConnected) {
            throw new Error('Cannot proceed without database connection');
        }

        // Step 2: Check if tables exist
        const tablesExist = await checkTablesExist();

        // Step 3: Apply migrations if tables don't exist or apply pending ones
        if (!tablesExist) {
            logger.info('→ Database is empty. Initializing schema...');
            await applyMigrations();
            
            // Verify tables were created
            const tablesCreated = await checkTablesExist();
            if (!tablesCreated) {
                throw new Error('Tables were not created after migration');
            }

            logger.info('✓ Database initialized successfully');
        } else {
            logger.info('→ Database schema is already set up. Checking for pending migrations...');
            await applyMigrations();
        }

        logger.info('=== Database Setup Completed Successfully ===');

    } catch (error) {
        logger.error('✗ Database setup failed:', error.message);
        throw error;
    } finally {
        await sequelize.close();
    }
}

module.exports = {
    setupDatabase,
    checkDatabaseConnection,
    checkTablesExist,
    applyMigrations
};
