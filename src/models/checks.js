const { DataTypes, Sequelize } = require("sequelize");

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
        qrId: {
            type: DataTypes.STRING(255),
            allowNull: false,
            defaultValue: null,
            primaryKey: false,
            autoIncrement: false,
            comment: null,
            field: "qr_id",
            unique: "qr_id",
        },
        userQrId: {
            type: DataTypes.CHAR(36),
            allowNull: false,
            defaultValue: null,
            primaryKey: false,
            autoIncrement: false,
            comment: null,
            field: "user_qr_id",
            references: {
                key: "id",
                model: "usersModel",
            },
        },
        userScanId: {
            type: DataTypes.CHAR(36),
            allowNull: false,
            defaultValue: null,
            primaryKey: false,
            autoIncrement: false,
            comment: null,
            field: "user_scan_id",
            references: {
                key: "id",
                model: "usersModel",
            },
        },
        checkType: {
            type: DataTypes.ENUM("in", "out"),
            allowNull: false,
            primaryKey: false,
            autoIncrement: false,
            comment: null,
            field: "checkType",
        },
        scanTime: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: sequelize.fn("current_timestamp"),
            primaryKey: false,
            autoIncrement: false,
            comment: null,
            field: "scan_time",
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
        tableName: "checks",
        comment: "",
        indexes: [
            {
                name: "user_qr_id",
                unique: false,
                type: "BTREE",
                fields: ["user_qr_id"],
            },
            {
                name: "user_scan_id",
                unique: false,
                type: "BTREE",
                fields: ["user_scan_id"],
            },
        ],
    };
    const ChecksModel = sequelize.define("checksModel", attributes, options);
    return ChecksModel;
};
