const winston = require("winston");
const config = require("./config");
const rfs = require("rotating-file-stream");
const path = require("path");
const fs = require("fs");

// log directory path
const logDirectory = path.resolve(
    config.deploy_Env == "Docker" ? "/usr/src/webserver/log" : "log"
);

// ensure log directory exists
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);

// create a rotating write stream
rfs.createStream("access.log", {
    interval: "1d",
    path: logDirectory,
});

const enumerateErrorFormat = winston.format((info) => {
    if (info instanceof Error) {
        Object.assign(info, { message: info.stack });
    }
    return info;
});

const logger = winston.createLogger({
    level: config.env === "development" ? "debug" : "info",
    format: winston.format.combine(
        enumerateErrorFormat(),
        config.env === "development"
            ? winston.format.colorize()
            : winston.format.uncolorize(),
        winston.format.splat(),
        winston.format.printf(({ level, message }) => `${level}: ${message}`)
    ),
    transports: [
        new winston.transports.Console({
            stderrLevels: ["error"],
        }),
    ],
});

module.exports = logger;
