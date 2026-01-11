const httpStatus = require("http-status");

const tokenService = require("./token.service");
const userService = require("./user.service");

const ApiError = require("../utils/ApiError");
const { tokenTypes } = require("../config/tokens");
const { usersModel, tokenModel } = require("../models/database");

/**
 * Login with userName and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<usersModel>}
 */
const loginUserWithEmailAndPassword = async (email, userName, password) => {
    const user = await userService.getUserByUsernameOrEmail(userName, email);
    if (!user || !(await user.isPasswordMatch(password))) {
        throw new ApiError(
            httpStatus.UNAUTHORIZED,
            "Incorrect email or password"
        );
    }
    return user.dataValues;
};

/**
 * Logout
 * @param {string} refreshToken
 * @returns {Promise}
 */
const logout = async (refreshToken) => {
    const refreshTokenDoc = await usersModel.findOne({
        where: {
            token: refreshToken,
            type: tokenTypes.REFRESH,
            blacklisted: false,
        },
    });
    if (refreshTokenDoc) {
        await refreshTokenDoc.remove();
    }
};

/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @returns {Promise<Object>}
 */
const refreshAuth = async (refreshToken) => {
    try {
        const refreshTokenDoc = await tokenService.verifyToken(
            refreshToken,
            tokenTypes.REFRESH
        );
        const user = await userService.getUserById(refreshTokenDoc.userId);
        if (!user) {
            throw new Error();
        }
        await refreshTokenDoc.destroy();
        const tokens = await tokenService.generateAuthTokens(user);
        return { tokens, user };
    } catch (error) {
        console.warn(error);
        throw new ApiError(httpStatus.UNAUTHORIZED, "Please authenticate");
    }
};

/**
 * Reset password
 * @param {string} resetPasswordToken
 * @param {string} newPassword
 * @returns {Promise}
 */
const resetPassword = async (resetPasswordToken, newPassword) => {
    try {
        const resetPasswordTokenDoc = await tokenService.verifyToken(
            resetPasswordToken,
            tokenTypes.RESET_PASSWORD
        );
        const user = await userService.getUserById(resetPasswordTokenDoc.user);
        if (!user) {
            throw new Error();
        }
        await userService.updateUserById(user.id, { password: newPassword });
        await resetPasswordTokenDoc.destroy();
    } catch (error) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "Password reset failed");
    }
};

/**
 * Verify email
 * @param {string} verifyEmailToken
 * @returns {Promise}
 */
const verifyEmail = async (verifyEmailToken) => {
    try {
        const verifyEmailTokenDoc = await tokenService.verifyToken(
            verifyEmailToken,
            tokenTypes.VERIFY_EMAIL
        );
        console.log(verifyEmailTokenDoc.userId);
        const user = await userService.getUserById(verifyEmailTokenDoc.userId);
        if (!user) {
            throw new Error("User not found");
        }
        await verifyEmailTokenDoc.destroy();
        await userService.updateUserById(user.id, { isEmailVerified: true });
    } catch (error) {
        console.warn(error.message);
        throw new ApiError(
            httpStatus.UNAUTHORIZED,
            "Email verification failed"
        );
    }
};

module.exports = {
    logout: logout,
    verifyEmail: verifyEmail,
    refreshAuth: refreshAuth,
    resetPassword: resetPassword,
    loginUserWithEmailAndPassword: loginUserWithEmailAndPassword,
};
