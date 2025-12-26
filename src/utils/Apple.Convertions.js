"use strict";

/**
 * -------------------------
 * Biological Sex
 * -------------------------
 */
function convertHKBiologicalSex(value) {
    switch (value) {
        case "HKBiologicalSexFemale":
            return "FEMALE";
        case "HKBiologicalSexMale":
            return "MALE";
        case "HKBiologicalSexOther":
            return "OTHER";
        case "HKBiologicalSexNotSet":
        default:
            return "NOT_SET";
    }
}

/**
 * -------------------------
 * Blood Type
 * -------------------------
 */
function convertHKBloodType(value) {
    switch (value) {
        case "HKBloodTypeAPositive":
            return "A_POSITIVE";
        case "HKBloodTypeANegative":
            return "A_NEGATIVE";
        case "HKBloodTypeBPositive":
            return "B_POSITIVE";
        case "HKBloodTypeBNegative":
            return "B_NEGATIVE";
        case "HKBloodTypeABPositive":
            return "AB_POSITIVE";
        case "HKBloodTypeABNegative":
            return "AB_NEGATIVE";
        case "HKBloodTypeOPositive":
            return "O_POSITIVE";
        case "HKBloodTypeONegative":
            return "O_NEGATIVE";
        case "HKBloodTypeNotSet":
        default:
            return "NOT_SET";
    }
}

/**
 * -------------------------
 * Fitzpatrick Skin Type
 * -------------------------
 */
function convertHKFitzpatrickSkinType(value) {
    switch (value) {
        case "HKFitzpatrickSkinTypeI":
            return "TYPE_I";
        case "HKFitzpatrickSkinTypeII":
            return "TYPE_II";
        case "HKFitzpatrickSkinTypeIII":
            return "TYPE_III";
        case "HKFitzpatrickSkinTypeIV":
            return "TYPE_IV";
        case "HKFitzpatrickSkinTypeV":
            return "TYPE_V";
        case "HKFitzpatrickSkinTypeVI":
            return "TYPE_VI";
        case "HKFitzpatrickSkinTypeNotSet":
        default:
            return "NOT_SET";
    }
}

/**
 * -------------------------
 * Cardio Fitness Medications Use
 * -------------------------
 */
function convertHKCardioFitnessMedicationsUse(value) {
    switch (value) {
        case "HKCardioFitnessMedicationsUseNone":
            return "NONE";
        case "HKCardioFitnessMedicationsUseBetaBlockers":
            return "BETA_BLOCKERS";
        case "HKCardioFitnessMedicationsUseCalciumChannelBlockers":
            return "CALCIUM_CHANNEL_BLOCKERS";
        case "HKCardioFitnessMedicationsUseCombination":
            return "COMBINATION";
        case "HKCardioFitnessMedicationsUseNotSet":
        default:
            return "NOT_SET";
    }
}

module.exports = {
    convertHKBiologicalSex,
    convertHKBloodType,
    convertHKFitzpatrickSkinType,
    convertHKCardioFitnessMedicationsUse,
};
