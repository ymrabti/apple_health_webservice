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
        allowNull: false,
        comment: "dateOfBirth field",
    },
    userName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: "userName field",
    },
    gender: {
        type: DataTypes.ENUM("male", "female"),
        allowNull: false,
        comment: "gender field",
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

        // Instance method: isPasswordMatch
        UsersModel.prototype.isPasswordMatch = async function isPasswordMatch(
            password
        ) {
            return bcrypt.compare(password, this.password);
        };
        return UsersModel;
    },
};
