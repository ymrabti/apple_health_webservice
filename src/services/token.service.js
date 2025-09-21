const jwt = require("jsonwebtoken");
const moment = require("moment");
const httpStatus = require("http-status");

const config = require("../config/config");
const userService = require("./user.service");
const ApiError = require("../utils/ApiError");
const { tokenModel } = require("../models/database");
const { tokenTypes } = require("../config/tokens");
const logger = require("../config/logger");

/**
 * Generate token
 * @param {ObjectId} userId
 * @param {moment.Moment} expires
 * @param {string} type
 * @param {string | undefined} qr_id
 * @param {string} [secret]
 * @returns {string}
 */
const generateToken = (
    userId,
    expires,
    type,
    qr_id,
    secret = config.jwt.secret
) => {
    const payload = {
        sub: userId,
        qr_id: qr_id,
        iat: moment().unix(),
        exp: expires.unix(),
        type,
    };
    return jwt.sign(payload, secret);
};

/**
 * Save a token
 * @param {string} token
 * @param {ObjectId} userId
 * @param {Moment} expires
 * @param {string} type
 * @param {boolean} [blacklisted]
 * @returns {Promise<tokenModel>}
 */
const saveToken = async (token, userId, expires, type, blacklisted = false) => {
    const tokenDoc = await tokenModel.create({
        token,
        userId: userId,
        expires: expires.toDate(),
        type,
        blacklisted,
    });
    return tokenDoc;
};

/**
 * Verify token and return token doc (or throw an error if it is not valid)
 * @param {string} token
 * @param {string} type
 * @returns {Promise<tokenModel>}
 */
const verifyToken = async (token, type) => {
    const payload = jwt.verify(token, config.jwt.secret);
    const where = {
        token,
        type,
        userId: payload.sub,
        blacklisted: false,
    };
    const tokenDoc = await tokenModel.findOne({
        where,
    });
    if (!tokenDoc) {
        throw new Error("Token not found");
    }
    return tokenDoc;
};

/**
 * Generate auth tokens
 * @param {User} user
 * @returns {Promise<Object>}
 */
const generateAuthTokens = async (user) => {
    const accessTokenExpires = moment().add(
        config.jwt.accessExpirationMinutes,
        "minutes"
    );
    const accessToken = generateToken(
        user.id,
        accessTokenExpires,
        tokenTypes.ACCESS
    );

    const refreshTokenExpires = moment().add(
        config.jwt.refreshExpirationDays,
        "days"
    );
    const refreshToken = generateToken(
        user.id,
        refreshTokenExpires,
        tokenTypes.REFRESH
    );
    await saveToken(
        refreshToken,
        user.id,
        refreshTokenExpires,
        tokenTypes.REFRESH
    );

    return {
        access: {
            token: accessToken,
            expires: accessTokenExpires.toDate(),
        },
        refresh: {
            token: refreshToken,
            expires: refreshTokenExpires.toDate(),
        },
    };
};

/**
 * Generate reset password token
 * @param {string} email
 * @returns {Promise<string>}
 */
const generateResetPasswordToken = async (email) => {
    const user = await userService.getUserByEmail(email);
    if (!user) {
        throw new ApiError(
            httpStatus.NOT_FOUND,
            "No employee found with this email"
        );
    }
    const expires = moment().add(
        config.jwt.resetPasswordExpirationMinutes,
        "minutes"
    );
    const resetPasswordToken = generateToken(
        user.id,
        expires,
        tokenTypes.RESET_PASSWORD
    );
    await saveToken(
        resetPasswordToken,
        user.id,
        expires,
        tokenTypes.RESET_PASSWORD
    );
    return resetPasswordToken;
};

/**
 * Generate verify email token
 * @param {User} user
 * @returns {Promise<string>}
 */
const generateVerifyEmailToken = async (user) => {
    const expires = moment().add(
        config.jwt.verifyEmailExpirationMinutes,
        "minutes"
    );
    const verifyEmailToken = generateToken(
        user.id,
        expires,
        tokenTypes.VERIFY_EMAIL
    );
    await saveToken(
        verifyEmailToken,
        user.id,
        expires,
        tokenTypes.VERIFY_EMAIL
    );
    return verifyEmailToken;
};

module.exports = {
    generateToken,
    saveToken,
    verifyToken,
    generateAuthTokens,
    generateResetPasswordToken,
    generateVerifyEmailToken,
};
