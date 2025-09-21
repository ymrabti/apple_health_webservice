const express = require("express");
const catchAsync = require("../utils/catchAsync");
const { userService } = require("../services");
const httpStatus = require("http-status");

/**
 * Update user
 * @param {express.Request} req request
 * @param {express.Response} res response
 */
const updateUserFCM = async (req, res) => {
    await userService.updateUserById(req.user.id, req.body);
    res.sendStatus(httpStatus.OK);
};

/**
 * Update user
 * @param {express.Request} req request
 * @param {express.Response} res response
 */
const myTodayChecks = async (req, res) => {
    const checks = await userService.myTodayChecks(
        req.user.id,
        req.user.role === "gate"
    );
    res.status(httpStatus.OK).send(checks);
};

module.exports = {
    updateUserFCM: catchAsync(updateUserFCM),
    myTodayChecks: catchAsync(myTodayChecks),
};
