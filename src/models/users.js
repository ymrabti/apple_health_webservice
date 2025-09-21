const { DataTypes, Op, Sequelize } = require("sequelize");
const bcrypt = require("bcryptjs");
const validator = require("validator");

/**
 *
 * @param {Sequelize} sequelize sequelizer
 * @returns
 */
module.exports = (sequelize) => {
    const UsersModel = sequelize.define(
        "usersModel",
        {
            id: {
                type: DataTypes.CHAR(36),
                allowNull: false,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
                autoIncrement: false,
                comment: null,
                field: "id",
            },
            email: {
                type: DataTypes.STRING(255),
                allowNull: true,
                defaultValue: null,
                primaryKey: false,
                autoIncrement: false,
                comment: null,
                validate: {
                    isEmail: true,
                    set(value) {
                        if (value)
                            this.setDataValue(
                                "email",
                                value.toLowerCase().trim()
                            );
                    },
                },
                field: "email",
                unique: "email",
            },
            password: {
                type: DataTypes.STRING(255),
                allowNull: false,
                defaultValue: null,
                primaryKey: false,
                autoIncrement: false,
                validate: {
                    isStrong(value) {
                        if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
                            throw new Error(
                                "Password must contain at least one letter and one number"
                            );
                        }
                    },
                    len: [8, 255],
                },
                comment: null,
                field: "password",
            },
            role: {
                type: DataTypes.ENUM("user", "admin", "moderator"),
                allowNull: true,
                defaultValue: "user",
                primaryKey: false,
                autoIncrement: false,
                comment: null,
                field: "role",
            },
            fcm: {
                type: DataTypes.STRING(255),
                allowNull: true,
                defaultValue: null,
                primaryKey: false,
                autoIncrement: false,
                comment: null,
                field: "fcm",
            },
            isEmailVerified: {
                type: DataTypes.INTEGER(1),
                allowNull: true,
                defaultValue: "0",
                primaryKey: false,
                autoIncrement: false,
                comment: null,
                field: "is_email_verified",
            },
            isPhoneVerified: {
                type: DataTypes.INTEGER(1),
                allowNull: true,
                defaultValue: "0",
                primaryKey: false,
                autoIncrement: false,
                comment: null,
                field: "is_phone_verified",
            },
            username: {
                type: DataTypes.STRING(255),
                allowNull: false,
                defaultValue: null,
                primaryKey: false,
                autoIncrement: false,
                comment: null,
                field: "username",
                unique: "username",
            },
            photo: {
                type: DataTypes.STRING(255),
                allowNull: false,
                defaultValue: null,
                primaryKey: false,
                autoIncrement: false,
                comment: null,
                field: "photo",
            },
            phoneNumber: {
                type: DataTypes.STRING(20),
                allowNull: true,
                defaultValue: null,
                primaryKey: false,
                autoIncrement: false,
                comment: null,
                validate: {
                    isValidPhone(value) {
                        if (value && !validator.isMobilePhone(value)) {
                            throw new Error("Invalid phone number");
                        }
                    },
                },
                field: "phone_number",
                unique: "phone_number",
            },
            firstName: {
                type: DataTypes.STRING(100),
                allowNull: false,
                defaultValue: null,
                primaryKey: false,
                autoIncrement: false,
                comment: null,
                field: "first_name",
            },
            lastName: {
                type: DataTypes.STRING(100),
                allowNull: false,
                defaultValue: null,
                primaryKey: false,
                autoIncrement: false,
                comment: null,
                field: "last_name",
            },
            dateOfBirth: {
                type: DataTypes.DATEONLY,
                allowNull: true,
                defaultValue: null,
                primaryKey: false,
                autoIncrement: false,
                comment: null,
                field: "date_of_birth",
            },
            identityCard: {
                type: DataTypes.STRING(50),
                allowNull: true,
                defaultValue: null,
                primaryKey: false,
                autoIncrement: false,
                comment: null,
                field: "identity_card",
            },
            userName: {
                type: DataTypes.STRING(255),
                allowNull: true,
                defaultValue: null,
                primaryKey: false,
                autoIncrement: false,
                comment: null,
                field: "user_name",
            },
            gender: {
                type: DataTypes.ENUM("male", "female"),
                allowNull: true,
                defaultValue: null,
                primaryKey: false,
                autoIncrement: false,
                comment: null,
                field: "gender",
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: true,
                defaultValue: sequelize.fn("current_timestamp"),
                primaryKey: false,
                autoIncrement: false,
                comment: null,
                field: "created_at",
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: true,
                defaultValue: sequelize.fn("current_timestamp"),
                primaryKey: false,
                autoIncrement: false,
                comment: null,
                field: "updated_at",
            },
        },
        {
            tableName: "users",
            comment: "",
            indexes: [],
            hooks: {
                async beforeSave(user) {
                    if (user.changed("password")) {
                        user.password = await bcrypt.hash(user.password, 8);
                    }
                },
            },
        }
    );

    // Static method: isEmailTaken
    UsersModel.isEmailTaken = async function isEmailTaken(
        email,
        excludeId = null
    ) {
        if (!email) return false;
        const where = {
            email: email.toLowerCase(),
            ...(excludeId && { id: { [Op.ne]: excludeId } }),
        };
        const user = await this.findOne({ where });
        return !!user;
    };

    // Static method: isPhoneTaken
    UsersModel.isPhoneTaken = async function isPhoneTaken(
        phoneNumber,
        excludeId = null
    ) {
        if (!phoneNumber) return false;
        const where = {
            phoneNumber,
            ...(excludeId && { id: { [Op.ne]: excludeId } }),
        };
        const user = await this.findOne({ where });
        return !!user;
    };

    // Instance method: isPasswordMatch
    UsersModel.prototype.isPasswordMatch = async function isPasswordMatch(
        password
    ) {
        return bcrypt.compare(password, this.password);
    };
    return UsersModel;
};
