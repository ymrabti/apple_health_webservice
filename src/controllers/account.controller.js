const httpStatus = require("http-status");
const pick = require("../utils/pick");
const fs = require("fs");
const express = require("express");
const { resolve } = require("path");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const { userService } = require("../services");
const { uploadService } = require("../services");
const logger = require("../config/logger");

/**
 * Check User
 * @param {express.Request} req Request
 * @param {express.Response} res Response
 */
async function getUserPhoto(req, res) {
    const user = await userService.getUserByUsernameOrEmail(
        req.user.userName
    );
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }
    const profilePicture = resolve(
        uploadService.pathUploads,
        user.userName,
        user.photo
    );
    if(!fs.existsSync(profilePicture)){
        logger.error(`Profile picture not found at path: ${profilePicture}`);
        throw new ApiError(httpStatus.NOT_FOUND, "Profile picture not found");
    }
    const filename = user.photo;
    const fileSize = fs.statSync(profilePicture).size;
    res.setHeader(
        "content-disposition",
        `inline; filename="${filename}"; size=${fileSize}`
    );
    res.setHeader("Content-Length", fileSize);
    res.status(httpStatus.OK).sendFile(profilePicture);
}

/**
 * Check User
 * @param {express.Request} req Request
 * @param {express.Response} res Response
 */
async function updateProfilePicture(req, res) {
    if (!req.file) {
        throw new ApiError(httpStatus.BAD_REQUEST, "No file uploaded");
    }

    const userName = req.user?.userName;
    const user = await userService.getUserByUsernameOrEmail(userName);
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }

    const updatedUser = await userService.updateUserById(user.id, { photo: req.file.filename });

    res.status(httpStatus.OK).json(updatedUser);
}


/**
 * Update user
 * @param {express.Request} req request
 * @param {express.Response} res response
 */
const updateAccount = async (req, res) => {
    const user = await userService.updateUserById(req.user.id, req.body);
    res.send(user);
};

/**
 * get user
 * @param {express.Request} req request
 * @param {express.Response} res response
 */
const getAccount = async (req, res) => {
    const user = await userService.getUserByUsernameOrEmail(
        req.user.userName,
        req.user.email
    );
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }
    res.send(user);
};


module.exports = {
    getAccount: catchAsync(getAccount),
    updateAccount: catchAsync(updateAccount),
    getUserPhoto: catchAsync(getUserPhoto),
    updateProfilePicture: catchAsync(updateProfilePicture),
};
