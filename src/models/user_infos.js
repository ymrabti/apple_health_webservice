const { DataTypes, Sequelize } = require("sequelize");

const tablenameUserInfos = "user_infos";
/**
 * @param {Sequelize} sequelize
 */
const schemaUserInfos = (sequelize) => ({
    id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        references: {
            key: "id",
            model: "users",
        },
    },
    exportDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    dateOfBirth: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    biologicalSex: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    bloodType: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    fitzpatrickSkinType: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    cardioFitnessMedicationsUse: {
        type: DataTypes.STRING(255),
        allowNull: true,
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
});

module.exports = {
    tablenameUserInfos,
    schemaUserInfos,
    /**
     * @param {Sequelize} sequelize
     */
    userInfos(sequelize) {
        const UserInfosModel = sequelize.define(tablenameUserInfos, schemaUserInfos(sequelize), {
            tableName: tablenameUserInfos,
            timestamps: true,
            indexes: [
                { name: "user_id_index", fields: ["userId"], using: "BTREE" },
                { name: "user_export_unique", unique: true, fields: ["userId", "exportDate"] },
            ],
        });
        return UserInfosModel;
    },
};
