const httpStatus = require("http-status");
const { Model } = require("sequelize");
const { usersModel, checkModel } = require("../models/database");
const ApiError = require("../utils/ApiError");
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const dayjs = require("dayjs");

/**
 * Capitalize first letter of a string
 * @param {string} str str
 * @returns {string} return
 */
const cap = (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
/**
 * Generate a default password based on user details
 * @param {Object} param0
 * @param {string} param0.userName
 * @param {string} param0.firstName
 * @param {string} param0.lastName
 * @param {string} param0.email
 * @returns {string} Generated password
 */
function generateDefaultPassword({ userName, firstName, lastName, email }) {
    const getEmailDomain = (email) => {
        const domain = email.split("@")[1];
        return domain ? domain.split(".")[0] : "mail";
    };

    const part1 = cap(firstName).slice(0, 2); // e.g., "Jo"
    const part2 = lastName.slice(-2).toLowerCase(); // e.g., "ez"
    const part3 = userName.slice(0, 3); // e.g., "jdo"
    const part4 = `${getEmailDomain(email)}`.toUpperCase(); // e.g., "gmail"
    const now = new Date();
    const random = `${now.getDate()}@${now.getMonth()}`; // 2-digit number
    const pw = `${part1}${part2}${part3}_${part4}${random}`;
    return pw;
}

/**
 * Create a user
 * @param {Object} userBody
 * @returns {Promise<usersModel>}
 */
const createUser = async (userBody) => {
    if (await usersModel.isEmailTaken(userBody.email)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Email already taken");
    }
    if (await usersModel.isUsernameTaken(userBody.userName)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Username already taken");
    }
    const created = await usersModel.create(userBody);
    const getted = await usersModel.findByPk(created.get().id);
    return getted.dataValues;
};

/**
 * Query for healthData
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryUsers = async (filter, options) => {
    const healthData = await usersModel.findAndCountAll(filter, options);
    return healthData;
};

/**
 * Get user by id
 * @param {ObjectId} id
 * @returns {Promise<usersModel>}
 */
const getUserById = async (id) => {
    return usersModel.findByPk(id);
};

/**
 * Get user by id
 * @param {ObjectId} id
 * @returns {Promise<Model>}
 */
const getUserByUsernameOrEmail = async (userName, email) => {
    const usr =
        userName != null
            ? await usersModel.findOne({ where: { userName: userName } })
            : await usersModel.findOne({
                  where: {
                      email: email,
                  },
              });
    return usr;
};

/**
 * Get user by email
 * @param {string} email
 * @returns {Promise<usersModel>}
 */
const getUserByEmail = async (email) => {
    return usersModel.findOne({ where: { email } });
};

/**
 * Update user by id
 * @param {ObjectId} userId
 * @param {Object} updateBody
 * @returns {Promise<usersModel>}
 */
const updateUserById = async (userId, updateBody) => {
    const user = await getUserById(userId);
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "user not found");
    }
    if (
        updateBody.email &&
        (await usersModel.isEmailTaken(updateBody.email, userId))
    ) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Email already taken");
    }

    if (updateBody.password && updateBody.oldPassword) {
        const isMatch = await bcrypt.compare(
            updateBody.oldPassword,
            user.password
        );
        if (!isMatch) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Incorrect password");
        }
    }
    Object.assign(user, updateBody);
    await user.save();
    return user;
};

/**
 * Delete user by id
 * @param {ObjectId} userId
 * @returns {Promise<usersModel>}
 */
const deleteUserById = async (userId) => {
    const user = await getUserById(userId);
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "usersModel not found");
    }
    await user.remove();
    return user;
};

/**
 * Delete user by id
 * @param {string} userId
 * @param {string} gateId
 * @returns {Promise<number>}
 */
const countChecks = async (userId, gateId) => {
    const startOfToday = dayjs().startOf("day").toDate();
    const endOfToday = dayjs().endOf("day").toDate();
    const includes = [
        {
            model: usersModel,
            as: "userQr",
            // attributes: ["id", "role", "firstName", "lastName", "userName"],
        },
        {
            model: usersModel,
            as: "userScan",
            // attributes: ["id", "role", "firstName", "lastName", "userName"],
        },
    ];

    const checks = await checkModel.count({
        where: {
            userScanId: userId,
            userQrId: gateId,
            createdAt: {
                [Op.between]: [startOfToday, endOfToday],
            },
        },
        // attributes: ["id", "scanTime", "checkType"],
        include: includes,
    });

    if (!checks) {
        return 0;
    }
    return checks;
};

/**
 * Delete user by id
 * @param {string} userId
 * @param {boolean} userId
 * @returns {Promise<checkModel[]>}
 */
const myTodayChecks = async (userId, isGate) => {
    const startOfToday = dayjs().startOf("day").toDate();
    const endOfToday = dayjs().endOf("day").toDate();
    const includes = [
        {
            model: usersModel,
            as: "userQr",
            attributes: ["id", "role", "firstName", "lastName", "userName"],
        },
        {
            model: usersModel,
            as: "userScan",
            attributes: ["id", "role", "firstName", "lastName", "userName"],
        },
    ];

    const checks = !isGate
        ? await checkModel.findAndCountAll({
              where: {
                  userScanId: userId,
                  createdAt: {
                      [Op.between]: [startOfToday, endOfToday],
                  },
              },
              attributes: ["id", "scanTime", "checkType"],
              include: includes,
          })
        : await checkModel.findAndCountAll({
              where: {
                  userQrId: userId,
                  createdAt: {
                      [Op.between]: [startOfToday, endOfToday],
                  },
              },
              attributes: ["id", "scanTime", "checkType"],
              include: includes,
          });

    if (!checks) {
        throw new ApiError(
            httpStatus.NOT_FOUND,
            "No checkModel[] found for today"
        );
    }
    return checks;
};

module.exports = {
    countChecks: countChecks,
    createUser: createUser,
    queryUsers: queryUsers,
    getUserById: getUserById,
    getUserByEmail: getUserByEmail,
    getUserByUsernameOrEmail: getUserByUsernameOrEmail,
    updateUserById: updateUserById,
    deleteUserById: deleteUserById,
    myTodayChecks: myTodayChecks,
    generateDefaultPassword: generateDefaultPassword,
};
