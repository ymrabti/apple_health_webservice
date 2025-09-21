const { DataTypes, Sequelize, Model } = require("sequelize");
/**
 * 
 * @param {Sequelize} sequelize sequelize
 * @returns 
 */
module.exports = (sequelize) => {
    const attributes = {
        id: {
            type: DataTypes.CHAR(36),
            allowNull: false,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            autoIncrement: false,
            comment: null,
            field: "id",
        },
        token: {
            type: DataTypes.STRING(255),
            allowNull: false,
            defaultValue: null,
            primaryKey: false,
            autoIncrement: false,
            comment: null,
            field: "token",
        },
        userId: {
            type: DataTypes.CHAR(36),
            allowNull: false,
            defaultValue: null,
            primaryKey: false,
            autoIncrement: false,
            comment: null,
            field: "user_id",
            references: {
                key: "id",
                model: "usersModel",
            },
        },
        type: {
            type: DataTypes.ENUM("refresh", "resetPassword", "verifyEmail"),
            allowNull: false,
            defaultValue: null,
            primaryKey: false,
            autoIncrement: false,
            comment: null,
            field: "type",
        },
        expires: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: null,
            primaryKey: false,
            autoIncrement: false,
            comment: null,
            field: "expires",
        },
        blacklisted: {
            type: DataTypes.INTEGER(1),
            allowNull: true,
            defaultValue: "0",
            primaryKey: false,
            autoIncrement: false,
            comment: null,
            field: "blacklisted",
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
    };
    const options = {
        tableName: "tokens",
        comment: "",
        indexes: [
            {
                name: "user_id",
                unique: false,
                type: "BTREE",
                fields: ["user_id"],
            },
        ],
    };
    const TokensModel = sequelize.define("tokensModel", attributes, options);
    return TokensModel;
};
