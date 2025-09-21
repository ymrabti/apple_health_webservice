const { Sequelize } = require("sequelize");
const config = require("../config/config");
const health = require("./users");
const tokens = require("./tokens");
const checks = require("./checks");

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

const usersModel = health(db);
const tokenModel = tokens(db);
const checkModel = checks(db);

usersModel.hasMany(tokenModel, { foreignKey: "user_id", as: "tokens" });
tokenModel.belongsTo(usersModel, { foreignKey: "user_id", as: "user" });

usersModel.hasMany(checkModel, {
    foreignKey: "user_qr_id",
    as: "qrChecks",
});
usersModel.hasMany(checkModel, {
    foreignKey: "user_scan_id",
    as: "scanChecks",
});
checkModel.belongsTo(usersModel, {
    foreignKey: "user_qr_id",
    as: "userQr",
});
checkModel.belongsTo(usersModel, {
    foreignKey: "user_scan_id",
    as: "userScan",
});

module.exports = {
    usersModel,
    tokenModel,
    checkModel,
};
