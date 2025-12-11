const Joi = require("joi");
const { password, email } = require("./custom.validation");

const register = {
    body: Joi.object().keys({
        photo: Joi.string().required(),
        userName: Joi.string().required(),
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        dateOfBirth: Joi.date().required(),
        gender: Joi.string().required().valid('male', 'female'),
        email: Joi.string().required().custom(email),
        role: Joi.string().allow("", null),
        password: Joi.string().required().custom(password),
        confirmPassword: Joi.string()
            .required()
            .valid(Joi.ref("password"))
            .messages({
                "any.only": "Password and Confirm Password must match",
            }),
    }),
};

const login = {
    body: Joi.object()
        .keys({
            email: Joi.string().email().optional(),
            userName: Joi.string().optional(),
            password: Joi.string().required(),
        })
        .xor("email", "userName"), // Ensures exactly one of 'email' or 'userName' is provided
};

const logout = {
    body: Joi.object().keys({
        refreshToken: Joi.string().required(),
    }),
};

const refreshTokens = {
    body: Joi.object().keys({
        refreshToken: Joi.string().required(),
    }),
};

const changePassword = {
    body: Joi.object()
        .keys({
            oldPassword: Joi.string().custom(password).required(),
            newPassword: Joi.string().custom(password).required(),
            confirmPassword: Joi.string().custom(password).required(),
        })
        .custom((value, helpers) => {
            if (value.newPassword !== value.confirmPassword) {
                return helpers.error("any.custom", {
                    message: "New password and confirm password must match",
                });
            }
            if (value.newPassword === value.oldPassword) {
                return helpers.error("any.custom", {
                    message: "New password must be different from old password",
                });
            }
            return { ...value, password: value.newPassword };
        }),
};

const forgotPassword = {
    body: Joi.object().keys({
        email: Joi.string().email().required(),
    }),
};

const resetPassword = {
    query: Joi.object().keys({
        token: Joi.string().required(),
    }),
    body: Joi.object()
        .keys({
            oldPassword: Joi.string().required().custom(password),
            phoneNumber: Joi.string().required(),
        })
        .custom((value, helpers) => {
            // Assign oldPassword to password
            return { ...value, password: value.oldPassword };
        }),
};

const verifyEmail = {
    query: Joi.object().keys({
        token: Joi.string().required(),
    }),
};

module.exports = {
    register,
    login,
    logout,
    refreshTokens,
    changePassword,
    forgotPassword,
    resetPassword,
    verifyEmail,
};
