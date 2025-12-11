const Joi = require('joi');
const { email } = require('./custom.validation');
const { roles } = require('../config/roles');

const updateFCM_Token = {
    body: Joi.object().keys({
        fcm: Joi.string().optional().allow(''),
    }),
};

const getUserPhoto = {
    query: Joi.object().keys({
        t: Joi.any().optional(),
    })
};

const updateUser = {
    body: Joi.object()
        .keys({
            firstName: Joi.string().required(),
            lastName: Joi.string().required(),
            userName: Joi.string().required(),
            email: Joi.string().custom(email).allow(null),
            gender: Joi.string().allow(null).valid('male', 'female'),
            role: Joi.string().required().valid(...roles),
            dateOfBirth: Joi.date().allow(null).iso(),
        })
        .min(1),
};

const newDailyStats = {
    body: Joi.object()
        .keys({
            steps: Joi.number().required(),
            calories: Joi.number().required(),
            flights: Joi.number().required(),
            exerciseMinutes: Joi.number().required(),
            distanceKm: Joi.number().required(),
            userId: Joi.string().required(),
        })
        .min(1),
};

const deleteUser = {
};

module.exports = {
    updateFCM_Token,
    getUserPhoto,
    updateUser,
    deleteUser,
    newDailyStats,
};
