const { DataTypes, Sequelize, Model } = require("sequelize");
const schemaTokens = {
    id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: "id field",
    },
    token: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: "token field",
    },
    userId: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        comment: "userId field",
        references: {
            key: "id",
            model: "users",
        },
    },
    type: {
        type: DataTypes.ENUM("refresh", "resetPassword", "verifyEmail"),
        allowNull: false,
        comment: "type field",
    },
    expires: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: "expires field",
    },
    blacklisted: {
        type: DataTypes.BOOLEAN(),
        allowNull: true,
        defaultValue: false,
        comment: "blacklisted field",
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
const tablenameTokens = "tokens";
module.exports = {
    tablenameTokens,
    schemaTokens,
    /**
     *
     * @param {Sequelize} sequelize sequelize
     * @returns
     */
    tokens(sequelize) {
        const TokensModel = sequelize.define(tablenameTokens, schemaTokens, {
            tableName: tablenameTokens,
            comment: "auth tokens",
            timestamps: true,
            indexes: [
                {
                    name: "user_id_index",
                    unique: false,
                    type: "BTREE",
                    fields: ["id"],
                },
            ],
        });
        return TokensModel;
    },
};
