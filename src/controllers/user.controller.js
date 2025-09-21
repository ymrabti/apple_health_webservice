const httpStatus = require('http-status');
const pick = require('../utils/pick');
const fs = require('fs');
const express = require('express');
const { resolve } = require('path');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { userService } = require('../services');
const { sendNotification } = require('../middlewares/app_check');
const { uploadService } = require('../services');
/**
 * 
 * @param {express.Request} req request
 * @param {express.Response} res response
 */
const createUser = async (req, res) => {
    const user = await userService.createUser({
        ...req.body,
        password: generateDefaultPassword(req.body)
    });
    res.status(httpStatus.CREATED).send(user);
};

function generateDefaultPassword({ username, firstName, lastName, email }) {
    const cap = (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    const getEmailDomain = (email) => {
        const domain = email.split('@')[1];
        return domain ? domain.split('.')[0] : 'mail';
    };

    const part1 = cap(firstName).slice(0, 2);          // e.g., "Jo"
    const part2 = lastName.slice(-2).toLowerCase();    // e.g., "ez"
    const part3 = username.slice(0, 3);                // e.g., "jdo"
    const part4 = `${getEmailDomain(email)}`.toUpperCase();              // e.g., "gmail"
    const now = new Date();
    const random = `${now.getDate()}@${now.getMonth()}`; // 2-digit number
    const pw = `${part1}${part2}${part3}_${part4}${random}`;
    return pw;
}

/**
 * 
 * @param {express.Request} req request
 * @param {express.Response} res response
 */
const getUsers = async (req, res) => {
    const filter = pick(req.query, ['role']);
    const options = pick(req.query, ['sortBy', 'limit', 'page']);
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
    const user = await userService.getUserByUsernameOrEmail(req.query.username, req.query.email);
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }
    res.sendStatus(httpStatus.OK).end();
}

/**
 * Check User
 * @param {express.Request} req Request
 * @param {express.Response} res Response
 */
async function getUserPhoto(req, res) {
    const user = await userService.getUserByUsernameOrEmail(req.params.username);
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }
    const profilePicture = resolve(uploadService.pathUploads, user.username, user.photo)
    const filename = user.photo;
    const fileSize = fs.statSync(profilePicture).size;
    res.setHeader("content-disposition", `inline; filename="${filename}"; size=${fileSize}`);
    res.setHeader("Content-Length", fileSize);
    res.status(httpStatus.OK).sendFile(profilePicture);
}

/**
 * Check User
 * @param {express.Request} req Request
 * @param {express.Response} res Response
 */
async function updateProfilePicture(req, res) {
    const username = req.params.username;
    const user = await userService.getUserByUsernameOrEmail(username);
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }

    await userService.updateUserById(user.id, { photo: req.file.filename })

    if (!req.file) {
        res.status(httpStatus.BAD_REQUEST).json({ message: "No file uploaded" });
    }
    try {
        res.status(httpStatus.OK).json({
            message: 'File uploaded successfully',
            file: req.file
        });
    } catch (err) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            error: err.message
        });
    }
}

/**
 * get user
 * @param {express.Request} req request
 * @param {express.Response} res response
 */
const poke = async (req, res) => {
    const user = await userService.getUserById(req.params.userId, req.query.email);
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }
    const ress = await sendNotification({
        token: user.fcm,
        notification: {
            title: `${user.firstName} ${user.lastName}`,
            body: `Hello ${user.firstName}`,
            imageUrl: 'https://i.ytimg.com/vi/k8qUMKrp38g/maxresdefault.jpg',
        },
    })
    res.sendStatus(ress ? httpStatus.OK : httpStatus.BAD_GATEWAY);
};

/**
 * get user
 * @param {express.Request} req request
 * @param {express.Response} res response
 */
const getUser = async (req, res) => {
    const user = await userService.getUserByUsernameOrEmail(req.query.username, req.query.email);
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
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
    poke: catchAsync(poke),
    createUser: catchAsync(createUser),
    getUsers: catchAsync(getUsers),
    getUser: catchAsync(getUser),
    checkUser: catchAsync(checkUser),
    updateUser: catchAsync(updateUser),
    deleteUser: catchAsync(deleteUser),
    getUserPhoto: catchAsync(getUserPhoto),
    updateProfilePicture: catchAsync(updateProfilePicture),
};
