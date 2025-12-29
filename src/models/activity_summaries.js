const { DataTypes, Sequelize } = require("sequelize");

const tablenameActivitySummaries = "activity_summaries";
/**
 * @param {Sequelize} sequelize
 */
const schemaActivitySummaries = (sequelize) => ({
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
    dateComponents: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    activeEnergyBurned: {
        type: DataTypes.DECIMAL(12, 4),
        allowNull: true,
    },
    activeEnergyBurnedGoal: {
        type: DataTypes.DECIMAL(12, 4),
        allowNull: true,
    },
    activeEnergyBurnedUnit: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    appleMoveTime: {
        type: DataTypes.DECIMAL(12, 4),
        allowNull: true,
    },
    appleMoveTimeGoal: {
        type: DataTypes.DECIMAL(12, 4),
        allowNull: true,
    },
    appleExerciseTime: {
        type: DataTypes.DECIMAL(12, 4),
        allowNull: true,
    },
    appleExerciseTimeGoal: {
        type: DataTypes.DECIMAL(12, 4),
        allowNull: true,
    },
    appleStandHours: {
        type: DataTypes.DECIMAL(12, 4),
        allowNull: true,
    },
    appleStandHoursGoal: {
        type: DataTypes.DECIMAL(12, 4),
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
    tablenameActivitySummaries,
    schemaActivitySummaries,
    /**
     * @param {Sequelize} sequelize
     */
    activitySummaries(sequelize) {
        const ActivitySummariesModel = sequelize.define(
            tablenameActivitySummaries,
            schemaActivitySummaries(sequelize),
            {
                tableName: tablenameActivitySummaries,
                timestamps: true,
                indexes: [
                    {
                        name: "user_id_index",
                        fields: ["userId"],
                        using: "BTREE",
                    },
                    {
                        name: "user_export_index",
                        fields: ["userId", "exportDate"],
                        using: "BTREE",
                    },
                    {
                        name: "user_datecomponents_unique",
                        unique: true,
                        fields: ["userId", "dateComponents"],
                    }
                ],
            }
        );
        return ActivitySummariesModel;
    },
};
