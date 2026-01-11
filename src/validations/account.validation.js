const Joi = require("joi");

const updateAccount = {
    body: Joi.object()
        .keys({
            firstName: Joi.string().required(),
            lastName: Joi.string().required(),
            email: Joi.string().email().allow(null),
            dateOfBirth: Joi.date().allow(null).iso(),
            heightInCentimeters: Joi.number().allow(null),
            weightInKilograms: Joi.number().allow(null),
        })
        .min(1),
};

module.exports = {
    updateAccount,
};