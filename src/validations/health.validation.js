const Joi = require("joi");

const saveUserInfos = {
    body: Joi.object().keys({
        userId: Joi.string().required(),
        dateOfBirth: Joi.date().iso().allow(null),
        biologicalSex: Joi.string(),
        bloodType: Joi.string(),
        fitzpatrickSkinType: Joi.string(),
        cardioFitnessMedicationsUse: Joi.string(),
    }),
};

const saveDailySummaries = {
    body: Joi.object().keys({
        userId: Joi.string().required(),
        date: Joi.date().iso().required(),
        steps: Joi.number().integer(),
        distance: Joi.number(),
        caloriesBurned: Joi.number(),
    }),
};

const saveActivitySummaries = {
    body: Joi.object().keys({
        userId: Joi.string().required(),
        activityType: Joi.string().required(),
        duration: Joi.number(),
        caloriesBurned: Joi.number(),
    }),
};

const getDailySummaries = {
    query: Joi.object().keys({
        userId: Joi.string().required(),
    }),
};

const getActivitySummaries = {
    query: Joi.object().keys({
        userId: Joi.string().required(),
    }),
};

module.exports = {
    saveUserInfos,
    saveDailySummaries,
    saveActivitySummaries,
    getDailySummaries,
    getActivitySummaries,
};