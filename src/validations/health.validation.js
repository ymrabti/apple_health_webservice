const Joi = require("joi");

const saveUserInfos = {
    body: Joi.object().keys({
        userId: Joi.string(),
        exportDate: Joi.date().iso().required(),
        attributes: Joi.object({
            HKCharacteristicTypeIdentifierDateOfBirth: Joi.date().iso(),
            HKCharacteristicTypeIdentifierBiologicalSex: Joi.string(),
            HKCharacteristicTypeIdentifierBloodType: Joi.string(),
            HKCharacteristicTypeIdentifierFitzpatrickSkinType: Joi.string(),
            HKCharacteristicTypeIdentifierCardioFitnessMedicationsUse:
                Joi.string(),
            weightInKilograms: Joi.number(),
            heightInCentimeters: Joi.number(),
        }).required(),
    }),
};

const saveDailySummaries = {
    body: Joi.object().keys({
        userId: Joi.string(),
        summaries: Joi.array()
            .items(
                Joi.object({
                    date: Joi.date().iso().required(),
                    exportDate: Joi.date().iso().allow(null),
                    steps: Joi.number(),
                    flights: Joi.number(),
                    distance: Joi.number(),
                    active: Joi.number(),
                    basal: Joi.number(),
                    exercise: Joi.number(),
                })
            )
            .required(),
    }),
};

const getTrends = {
    query: Joi.object().keys({
        dateTo: Joi.date().iso().required(),
    }),
};

const weeklyStatistics = {
    query: Joi.object().keys({
        dateFrom: Joi.date().iso().required(),
        dateTo: Joi.date().iso().required(),
    }),
};

const saveActivitySummaries = {
    body: Joi.object().keys({
        userId: Joi.string(),
        exportDate: Joi.date().iso().required(),
        summaries: Joi.array()
            .items(
                Joi.object({
                    dateComponents: Joi.date().iso().required(),
                    activeEnergyBurned: Joi.number(),
                    activeEnergyBurnedGoal: Joi.number(),
                    activeEnergyBurnedUnit: Joi.string(),
                    appleMoveTime: Joi.number(),
                    appleMoveTimeGoal: Joi.number(),
                    appleExerciseTime: Joi.number(),
                    appleExerciseTimeGoal: Joi.number(),
                    appleStandHours: Joi.number(),
                    appleStandHoursGoal: Joi.number(),
                }).unknown(true)
            )
            .required(),
    }),
};

const getDailySummaries = {
    query: Joi.object().keys({
        dateFrom: Joi.date().iso().required(),
        dateTo: Joi.date().iso().required(),
    }),
};

const getActivitySummaries = {
    query: Joi.object().keys({
        dateFrom: Joi.date().iso().optional(),
        dateTo: Joi.date().iso().optional(),
    }),
};

module.exports = {
    saveUserInfos,
    saveDailySummaries,
    saveActivitySummaries,
    getDailySummaries,
    getActivitySummaries,
    getTrends,
    weeklyStatistics,
};