const { DataTypes, Sequelize } = require("sequelize");

const tablenameDailySummaries = "daily_summaries";
/**
 * @param {Sequelize} sequelize
 */
const schemaDailySummaries = (sequelize) => ({
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
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    type: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    value: {
        type: DataTypes.DECIMAL(12, 4),
        allowNull: true,
    },
    unit: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    exportDate: {
        type: DataTypes.DATEONLY,
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
    tablenameDailySummaries,
    schemaDailySummaries,
    /**
     * @param {Sequelize} sequelize
     */
    dailySummaries(sequelize) {
        const DailySummariesModel = sequelize.define(tablenameDailySummaries, schemaDailySummaries(sequelize), {
            tableName: tablenameDailySummaries,
            timestamps: true,
            indexes: [
                { name: "user_id_index", fields: ["userId"], using: "BTREE" },
                { name: "user_date_type_unique", unique: true, fields: ["userId", "date", "type"] },
            ],
        });
        return DailySummariesModel;
    },
};
