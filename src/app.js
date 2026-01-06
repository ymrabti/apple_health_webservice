const express = require("express");
const helmet = require("helmet");
const xss = require("xss-clean");
const mongoSanitize = require("express-mongo-sanitize");
const compression = require("compression");
const { createServer } = require("http");
const cors = require("cors");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const cookieParser = require("cookie-parser");
const { Server } = require("socket.io");
const passport = require("passport");
const httpStatus = require("http-status");
const config = require("./config/config");
const morgan = require("./config/morgan");
const {
    jwtStrategy,
    jwtSocketStrategy,
    jwtSocketHeadersStrategy,
    qrAuthFromBodyStrategy,
    cookieStrategy,
} = require("./config/passport");
const { authLimiter } = require("./middlewares/rateLimiter");
const { firebaseAppcheck } = require("./middlewares/app_check");
const routes = require("./routes");
const { errorConverter, errorHandler } = require("./middlewares/error");
const ApiError = require("./utils/ApiError");
const { MySocketIO } = require("./websockets/socket.io");
const { resolve } = require("path");
const logger = require("./config/logger");

const allowedOrigins = [
    "https://healthy.youmrabti.com",
];

const corsOptions = {
    origin(origin, callback) {
        if (
            !origin ||
            allowedOrigins.includes(origin) ||
            /^https?:\/\/localhost:\d+$/.test(origin)
        ) {
            callback(null, true);
        } else {
            console.log("❌ Blocked CORS Origin:", origin);
            console.log(origin);
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    exposedHeaders: ["set-cookie"],
};
const app = express();
const httpServer = createServer(app);

// enable cors
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
// jwt authentication
app.use(passport.initialize());
passport.use("jwtSocketHeaders", jwtSocketHeadersStrategy);
passport.use("jwtSocket", jwtSocketStrategy);
passport.use("jwt", jwtStrategy);
passport.use("cookie", cookieStrategy);

const generateSwaggerSpec = () => {
    return swaggerJsdoc({
        definition: {
            openapi: "3.0.0",
            info: {
                title: "Dynamic API Docs",
                version: "1.0.0",
            },
        },
        apis: ["./src/routes/*.js", "./src/routes/*.js"],
    });
};

// ! // // // // // SOCKET // // // // // // //
const socketServer = new Server(httpServer, {
    cors: corsOptions,
});
const socket = socketServer.of("/api/apple_health/");
const chatObject = new MySocketIO(socket);

app.set("socketio", socket);

/* socket.use(async (socket, next) => {
    await chatObject.authAppCheck(socket, next);
}); */

// ! // // // // // //  SOCKET // // // // // // //
if (config.env !== "test") {
    app.use(morgan.successHandler);
    app.use(morgan.errorHandler);
}

// set security HTTP headers
app.use(cookieParser(config.jwt.secret));
app.use(helmet());

// parse json request body
app.use(express.json());

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// sanitize request data
app.use(xss());
app.use(mongoSanitize());

// gzip compression
app.use(compression());

// limit repeated failed requests to auth endpoints
if (config.env === "production") {
    app.use("/Auth", authLimiter);
}


const topStatic = resolve("static");
app.get("/", (req, res) => {
    res.redirect("/api-docs");
});

app.use("/api-docs", swaggerUi.serve, async (req, res) => {
    return res.send(swaggerUi.generateHTML(generateSwaggerSpec()));
});

// api routes
app.use("/", express.static(topStatic));
app.use("/api", /* firebaseAppcheck, */ routes);
// send back a 404 error for any unknown api request
/**
 *
 * @param {express.Request} req request
 * @param {express.Response} res response
 */
app.use((req, res, next) => {
    logger.info(req.path + " path Not found");
    if (req.path.includes("/.well-known/")) {
        logger.info("Well-known path accessed");
        return res.status(200).send("ok");
    }
    next(new ApiError(httpStatus.NOT_FOUND, "Not found"));
});

// convert error to ApiError, if needed
app.use(errorConverter);

// handle error
app.use(errorHandler);

module.exports = { httpServer };
