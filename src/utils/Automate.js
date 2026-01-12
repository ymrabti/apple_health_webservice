/* eslint-disable no-console */
const Automate = require("sequelize-automate");

const automate = new Automate(
    {
        host: "127.0.0.1",
        database: "employee_checks",
        userName: "root",
        password: "",
        dialect: "mysql",
        port: 3306,
        define: {
            underscored: false,
            freezeTableName: false,
            charset: "utf8mb4",
            timestamps: true,
        },
        dialectOptions: {
            // collate: "utf8_general_ci",
            timezone: "+00:00",
        },
        timezone: "+00:00",
    },
    {
        type: "js",
        camelCase: true,
        fileNameCamelCase: true,
        dir: "src/models/sql",
        emptyDir: false,
        // tables: ["health", "tokens", "checks"],
        // skipTables: ["pointcloud_formats"],
    }
);

async function main() {
    try {
        const code = await automate.run();
        console.log("✔ Models generated");
    } catch (err) {
        console.error("❌ Failed to generate models:", err);
    }
}

main();
