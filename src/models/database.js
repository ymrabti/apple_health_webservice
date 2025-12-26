const { Sequelize } = require("sequelize");
const config = require("../config/config");
const { users: husers } = require("./users");
const { tokens } = require("./tokens");
const { health: checks } = require("./checks");
const { dailySummaries } = require("./daily_summaries");
const { activitySummaries } = require("./activity_summaries");

const { DB_HOST, DB_DATABASE, DB_USER, DB_PORT, DB_PASSWORD } = config.mysql;

const db = new Sequelize({
    host: DB_HOST,
    database: DB_DATABASE,
    username: DB_USER,
    port: DB_PORT,
    password: DB_PASSWORD,
    pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
    },
    dialect: "mysql",
    define: {
        timestamps: true,
    },
    logging: false,
    timezone: "+01:00",
});

db.authenticate()
    .then(() => {
        console.log("✅ DB connected");
    })
    .catch((err) => {
        console.log(err);
    });

const usersModel = husers(db);
const tokenModel = tokens(db);
const checkModel = checks(db);
const dailySummariesModel = dailySummaries(db);
const activitySummariesModel = activitySummaries(db);

usersModel.hasMany(tokenModel, { foreignKey: "userId", as: "tokens" });
tokenModel.belongsTo(usersModel, { foreignKey: "id", as: "user" });

usersModel.hasMany(checkModel, {
    foreignKey: "userId",
    as: "checks",
});

checkModel.belongsTo(usersModel, {
    foreignKey: "id",
    as: "user",
});

// Relations for new health import tables
usersModel.hasMany(dailySummariesModel, { foreignKey: "userId", as: "dailySummaries" });
dailySummariesModel.belongsTo(usersModel, { foreignKey: "userId", as: "user" });

usersModel.hasMany(activitySummariesModel, { foreignKey: "userId", as: "activitySummaries" });
activitySummariesModel.belongsTo(usersModel, { foreignKey: "userId", as: "user" });


module.exports = {
    usersModel,
    tokenModel,
    checkModel,
    dailySummariesModel,
    activitySummariesModel,
};
