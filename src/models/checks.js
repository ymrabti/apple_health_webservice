const { DataTypes, Sequelize } = require("sequelize");

const tablenameHealth = "checks";
/**
 *
 * @param {Sequelize} sequelize sequelize
 * @returns
 */
const schemaHealth = (sequelize) => ({
    id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    steps: {
        type: DataTypes.INTEGER({ unsigned: true, decimals: 0 }),
        allowNull: false,
    },
    calories: {
        type: DataTypes.INTEGER({ unsigned: true, decimals: 0 }),
        allowNull: false,
    },
    flights: {
        type: DataTypes.INTEGER({ unsigned: true, decimals: 0 }),
        allowNull: false,
    },
    exerciseMinutes: {
        type: DataTypes.INTEGER({ unsigned: true, decimals: 0 }),
        allowNull: false,
    },
    distanceKm: {
        type: DataTypes.DOUBLE({ decimals: 2 }),
        allowNull: false,
    },
    userId: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        references: {
            key: "id",
            model: "users",
        },
    },
    dateRecord: {
        type: DataTypes.DATEONLY,
        defaultValue: sequelize.fn("current_timestamp"),
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
    tablenameHealth,
    schemaHealth,
    /**
     *
     * @param {Sequelize} sequelize sequelize
     * @returns
     */
    health(sequelize) {
        const HealthModel = sequelize.define(tablenameHealth, schemaHealth, {
            tableName: tablenameHealth,
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
        return HealthModel;
    },
};
