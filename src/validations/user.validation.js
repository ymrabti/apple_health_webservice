const Joi = require('joi');
const { objectId, email } = require('./custom.validation');
const { roles } = require('../config/roles');

const createUser = {
    body: Joi.object().keys({
        photo: Joi.string().required(),
        role: Joi.string().required(),
        username: Joi.string().required(),
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        email: Joi.string().required().custom(email),
    }),
};

const getUsers = {
    query: Joi.object().keys({
        role: Joi.string(),
        sort: Joi.string().allow(''),
        sortBy: Joi.string(),
        type: Joi.string(),
        limit: Joi.number().integer(),
        page: Joi.number().integer(),
    }),
};

const getUserPhoto = {
    params: Joi.object().keys({
        username: Joi.string().required(objectId),
    }),
    query: Joi.object().keys({
        t: Joi.any().optional(),
    })
};

const getUser = {
    params: Joi.object().keys({
        userId: Joi.string().custom(objectId),
    }),
};

const updateUser = {
    params: Joi.object().keys({
        userId: Joi.string().custom(objectId),
    }),
    body: Joi.object()
        .keys({
            firstName: Joi.string().required(),
            lastName: Joi.string().required(),
            username: Joi.string().required(),
            email: Joi.string().email().allow(null),
            gender: Joi.string().allow(null).valid('male', 'female'),
            role: Joi.string().required().valid(...roles),
            dateOfBirth: Joi.date().allow(null).iso(),
        })
        .min(1),
};

const deleteUser = {
    params: Joi.object().keys({
        userId: Joi.string().custom(objectId),
    }),
};

module.exports = {
    createUser,
    getUsers,
    getUser,
    getUserPhoto,
    updateUser,
    deleteUser,
};
