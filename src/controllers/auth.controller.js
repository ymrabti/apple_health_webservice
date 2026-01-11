const httpStatus = require("http-status");
const catchAsync = require("../utils/catchAsync");
const express = require("express");
const moment = require("moment");
const { authService, userService, tokenService, emailService } = require("../services");
const config = require("../config/config");
const pick = require("../utils/pick");
const { tokenTypes } = require("../config/tokens");
/**
 *
 * @param {express.Request} req request
 * @param {express.Response} res response
 */
const register = async (req, res) => {
    if (!req.file) {
        return res
            .status(httpStatus.BAD_REQUEST)
            .json({ message: "No file uploaded" });
    }
    const user = await userService.createUser({
        ...req.body,
    });
    const tokens = await tokenService.generateAuthTokens(user);
    const userPayload = pick(user, ["id", "firstName", "lastName", "role"]);
    setCookie(res, userPayload);
    res.status(httpStatus.CREATED).send({ user, tokens });
};
/**
 *
 * @param {express.Request} req request
 * @param {express.Response} res response
 */
const login = async (req, res) => {
    const { email, userName, password } = req.body;
    const user = await authService.loginUserWithEmailAndPassword(
        email,
        userName,
        password
    );
    const tokens = await tokenService.generateAuthTokens(user);
    const userPayload = pick(user, ["id", "firstName", "lastName", "role"]);
    setCookie(res, userPayload);
    res.send({
        user,
        tokens,
    });
};
/**
 *
 * @param {express.Request} req request
 * @param {express.Response} res response
 */
const logout = async (req, res) => {
    await authService.logout(req.body.refreshToken);
    res.clearCookie(config.cookie.access_token_name, { signed: true });
    res.status(httpStatus.NO_CONTENT).send();
};
/**
 *
 * @param {express.Request} req request
 * @param {express.Response} res response
 */
const refreshTokens = async (req, res) => {
    const { tokens, user } = await authService.refreshAuth(
        req.body.refreshToken
    );
    setCookie(res, user);
    res.send({ ...tokens });
};
/**
 *
 * @param {express.Request} req request
 * @param {express.Response} res response
 */
const sendOTP = async (req, res) => {
    var user = await userService.getUserByUsernameOrEmail(req.body.userName, req.body.email);
    const resetPasswordToken = await tokenService.generateResetPasswordToken(
        user.email
    );
    await emailService.sendResetPasswordEmail(
        user.email,
        resetPasswordToken,
        req.get("origin")
    );
    res.status(httpStatus.NO_CONTENT).send();
};
/**
 *
 * @param {express.Request} req request
 * @param {express.Response} res response
 */
const resetPassword = async (req, res) => {
    await authService.resetPassword(req.query.token, req.body.password);
    res.status(httpStatus.NO_CONTENT).send();
};
/**
 *
 * @param {express.Request} req request
 * @param {express.Response} res response
 */
const sendVerificationEmail = async (req, res) => {
    if (!req.user.email) {
        res.status(httpStatus.BAD_REQUEST).send();
        return;
    }
    const verifyEmailToken = await tokenService.generateVerifyEmailToken(
        req.user
    );
    await emailService.sendVerificationEmail(req.user.email, verifyEmailToken, req.get("origin"));
    res.status(httpStatus.NO_CONTENT).send();
};

/**
 *
 * @param {express.Request} req request
 * @param {express.Response} res response
 */
const changePassword = async (req, res) => {
    const user = await userService.updateUserById(req.user.id, {
        ...req.body,
    });
    res.send(user);
};

/**
 *
 * @param {express.Request} req request
 * @param {express.Response} res response
 */
const verifyEmail = async (req, res) => {
    await authService.verifyEmail(req.query.token);
    res.status(httpStatus.NO_CONTENT).send();
};

/**
 *
 * @param {express.Response} res response
 */
function setCookie(res, userPayload) {
    res.cookie(
        config.cookie.access_token_name,
        { ...userPayload, sub: userPayload.id, type: tokenTypes.ACCESS },
        {
            httpOnly: true,
            secure: config.env === "production",
            signed: true,
            maxAge: config.jwt.accessExpirationMinutes * 60000,
        }
    );
}

module.exports = {
    register: catchAsync(register),
    login: catchAsync(login),
    logout: catchAsync(logout),
    refreshTokens: catchAsync(refreshTokens),
    sendOTP: catchAsync(sendOTP),
    resetPassword: catchAsync(resetPassword),
    changePassword: catchAsync(changePassword),
    sendVerificationEmail: catchAsync(sendVerificationEmail),
    verifyEmail: catchAsync(verifyEmail),
    oauthCallbackAuthenticate: catchAsync(async (req, res) => {
        const provider = req.query.provider;
        if (!provider) {
            return res
                .status(httpStatus.BAD_REQUEST)
                .json({ message: "Missing 'provider' query parameter" });
        }

        if (!req.user) {
            return res
                .status(httpStatus.UNAUTHORIZED)
                .json({ message: "Please authenticate first!" });
        }

        const expires = moment().add(
            config.jwt.accessExpirationMinutes,
            "minutes"
        );
        const accessToken = tokenService.generateToken(
            req.user.id,
            expires,
            tokenTypes.ACCESS
        );

        const url = new URL(provider);
        url.searchParams.set("token", accessToken);
        return res.json({ url: url.toString() });
    }),
};
