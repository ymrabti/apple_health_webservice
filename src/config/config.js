const dotenv = require("dotenv");
const path = require("path");
const Joi = require("joi");

dotenv.config({ path: path.join(__dirname, "../../.env") });

const envVarsSchema = Joi.object()
    .keys({
        DEPLOY_ENV: Joi.string().valid("Local", "Docker").required(),
        NODE_ENV: Joi.string()
            .valid("production", "development", "test")
            .required(),
        PORT: Joi.number().default(6834),
        DB_HOST: Joi.string().required().description("MySQL DB host"),
        DB_PORT: Joi.number().default(3306).description("MySQL DB port"),
        DB_USER: Joi.string().required().description("MySQL DB user"),
        DB_PASSWORD: Joi.string().allow("").description("MySQL DB password"),
        JWT_SECRET: Joi.string().required().description("JWT secret key"),
        JWT_ACCESS_EXPIRATION_MINUTES: Joi.number()
            .default(30)
            .description("minutes after which access tokens expire"),
        JWT_REFRESH_EXPIRATION_DAYS: Joi.number()
            .default(30)
            .description("days after which refresh tokens expire"),
        JWT_RESET_PASSWORD_EXPIRATION_MINUTES: Joi.number()
            .default(10)
            .description("minutes after which reset password token expires"),
        JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: Joi.number()
            .default(10)
            .description("minutes after which verify email token expires"),
        SMTP_HOST: Joi.string().description("server that will send the emails"),
        SMTP_PORT: Joi.number().description(
            "port to connect to the email server"
        ),
        SMTP_USERNAME: Joi.string().description("username for email server"),
        SMTP_PASSWORD: Joi.string().description("password for email server"),
        SMTP_FROM: Joi.string().description("from email server"),
    })
    .unknown();

const { value: envVars, error } = envVarsSchema
    .prefs({ errors: { label: "key" } })
    .validate(process.env);

if (error) {
    throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
    deploy_Env: envVars.DEPLOY_ENV,
    env: envVars.NODE_ENV,
    port: envVars.PORT,
    cookieSecret: envVars.COOKIE_SECRET,
    mysql: {
        DB_HOST: envVars.DB_HOST,
        DB_PORT: envVars.DB_PORT,
        DB_USER: envVars.DB_USER,
        DB_PASSWORD: envVars.DB_PASSWORD,
    },
    cookie: {
        access_token_name: "auth_cookie_access_token",
        refresh_token_name: "auth_cookie_refresh_token",
    },
    jwt: {
        secret: envVars.JWT_SECRET,
        accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
        refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
        resetPasswordExpirationMinutes:
            envVars.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,
        verifyEmailExpirationMinutes:
            envVars.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES,
    },
    email: {
        smtp: {
            host: envVars.SMTP_HOST,
            port: envVars.SMTP_PORT,
            auth: {
                user: envVars.SMTP_USERNAME,
                pass: envVars.SMTP_PASSWORD,
            },
        },
        from: envVars.SMTP_FROM,
    },
};
