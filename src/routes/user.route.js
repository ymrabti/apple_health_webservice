const express = require("express");
const auth = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const userValidation = require("../validations/user.validation");
const userController = require("../controllers/user.controller");
const { uploadService } = require("../services");
const { allCapabilities } = require("../config/roles");
const createMiddleware = require("../middlewares/register.middleware");

const router = express.Router();

router
    .route("/:userId")
    .delete(
        auth(allCapabilities.manageUsers),
        validate(userValidation.deleteUser),
        userController.deleteUser
    )
    .put(
        auth(),
        validate(userValidation.updateUser),
        userController.updateUser
    );

router
    .route("/")
    .post(
        auth(allCapabilities.manageUsers),
        createMiddleware(userValidation.createUser),
        userController.createUser
    )
    .get(
        auth(allCapabilities.listtUsers),
        validate(userValidation.getUsers),
        userController.getUsers
    );

router
    .route("/check")
    .get(validate(userValidation.getUser), userController.checkUser);


router
    .route("/search")
    .get(auth(), validate(userValidation.getUser), userController.getUser);

module.exports = router;
