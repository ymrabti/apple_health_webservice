const { DataTypes, Op, Sequelize } = require("sequelize");
const bcrypt = require("bcryptjs");

const tablenameUsers = "users";
const schemaUsers = {
    id: {
        type: DataTypes.CHAR(36),
        comment: "id field",
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    firstName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: "firstName field",
        allowNull: false,
    },
    lastName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: "lastName field",
        allowNull: false,
    },
    dateOfBirth: {
        type: DataTypes.DATEONLY,
        defaultValue: DataTypes.NOW,
        allowNull: true,
        comment: "dateOfBirth field",
    },
    userName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: "userName field",
        unique: "userName",
    },
    biologicalSex: {
        type: DataTypes.ENUM("NOT_SET", "FEMALE", "MALE", "OTHER"),
        allowNull: true,
    },
    bloodType: {
        type: DataTypes.ENUM(
            "NOT_SET",
            "A_POSITIVE",
            "A_NEGATIVE",
            "B_POSITIVE",
            "B_NEGATIVE",
            "AB_POSITIVE",
            "AB_NEGATIVE",
            "O_POSITIVE",
            "O_NEGATIVE"
        ),
        allowNull: true,
    },
    fitzpatrickSkinType: {
        type: DataTypes.ENUM(
            "NOT_SET",
            "TYPE_I",
            "TYPE_II",
            "TYPE_III",
            "TYPE_IV",
            "TYPE_V",
            "TYPE_VI"
        ),
        allowNull: true,
    },
    cardioFitnessMedicationsUse: {
        type: DataTypes.ENUM(
            "NOT_SET",
            "NONE",
            "BETA_BLOCKERS",
            "CALCIUM_CHANNEL_BLOCKERS",
            "COMBINATION"
        ),
        allowNull: true,
    },
    email: {
        type: DataTypes.STRING(255),
        comment: "email field",
        allowNull: false,
        validate: {
            isEmail: true,
            set(value) {
                if (value)
                    this.setDataValue("email", value.toLowerCase().trim());
            },
        },
        unique: "email",
    },
    password: {
        type: DataTypes.STRING(255),
        comment: "password field",
        allowNull: false,
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
    },
    weightInKilograms: {
        type: DataTypes.DECIMAL(5, 2),
        comment: "weightInKilograms field",
        allowNull: true,
    },
    heightInCentimeters: {
        type: DataTypes.DECIMAL(5, 2),
        comment: "heightInCentimeters field",
        allowNull: true,
    },
    role: {
        type: DataTypes.ENUM("user", "admin", "moderator"),
        comment: "role field",
        defaultValue: "user",
    },
    photo: {
        type: DataTypes.STRING(255),
        comment: "photo field",
        allowNull: false,
    },
    isEmailVerified: {
        type: DataTypes.BOOLEAN(),
        comment: "isEmailVerified field",
        defaultValue: false,
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "createdAt field",
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "updatedAt field",
    },
};
module.exports = {
    tablenameUsers,
    schemaUsers,
    /**
     *
     * @param {Sequelize} sequelize sequelizer
     * @returns
     */
    users(sequelize) {
        const UsersModel = sequelize.define(tablenameUsers, schemaUsers, {
            tableName: tablenameUsers,
            comment: "healthy users",
            indexes: [],
            hooks: {
                async beforeSave(user) {
                    if (user.changed("password")) {
                        user.password = await bcrypt.hash(user.password, 8);
                    }
                },
            },
        });

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

        // Static method: isUsernameTaken
        UsersModel.isUsernameTaken = async function isUsernameTaken(
            userName,
            excludeId = null
        ) {
            if (!userName) return false;
            const where = {
                userName: userName,
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
    },
};
