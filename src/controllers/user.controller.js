const httpStatus = require("http-status");
const pick = require("../utils/pick");
const express = require("express");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const { userService } = require("../services");
const { generateDefaultPassword } = require("../services/user.service");

/**
 *
 * @param {express.Request} req request
 * @param {express.Response} res response
 */
const createUser = async (req, res) => {
    const defaultPassword = generateDefaultPassword(req.body);
    const user = await userService.createUser({
        ...req.body,
        password: defaultPassword,
    });
    res.status(httpStatus.CREATED).send(user);
};


/**
 *
 * @param {express.Request} req request
 * @param {express.Response} res response
 */
const getUsers = async (req, res) => {
    const filter = pick(req.query, ["role"]);
    const options = pick(req.query, ["sortBy", "limit", "page"]);
    const result = await userService.queryUsers(filter, options);
    // setTimeout(function () { res.send(result); }, 2_000);
    res.send(result);
};

/**
 * Check User
 * @param {express.Request} req Request
 * @param {express.Response} res Response
 */
async function checkUser(req, res) {
    const user = await userService.getUserByUsernameOrEmail(
        req.query.userName,
        req.query.email
    );
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }
    res.sendStatus(httpStatus.OK).end();
}

/**
 * get user
 * @param {express.Request} req request
 * @param {express.Response} res response
 */
const getUser = async (req, res) => {
    const user = await userService.getUserByUsernameOrEmail(
        req.query.userName,
        req.query.email
    );
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }
    res.send(user);
};

/**
 * Update user
 * @param {express.Request} req request
 * @param {express.Response} res response
 */
const updateUser = async (req, res) => {
    const user = await userService.updateUserById(req.params.userId, req.body);
    res.send(user);
};

/**
 * delete user
 * @param {express.Request} req request
 * @param {express.Response} res response
 */
const deleteUser = async (req, res) => {
    await userService.deleteUserById(req.params.userId);
    res.status(httpStatus.NO_CONTENT).send();
};

module.exports = {
    createUser: catchAsync(createUser),
    getUsers: catchAsync(getUsers),
    getUser: catchAsync(getUser),
    checkUser: catchAsync(checkUser),
    updateUser: catchAsync(updateUser),
    deleteUser: catchAsync(deleteUser),
};
