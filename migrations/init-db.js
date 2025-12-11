"use strict";
const { Sequelize, DataTypes, UUIDV4 } = require("sequelize");
const { tablenameUsers, schemaUsers } = require("../src/models/users");
const { tablenameTokens, schemaTokens } = require("../src/models/tokens");
const { tablenameHealth, schemaHealth } = require("../src/models/checks");
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        queryInterface.createTable(tablenameUsers, schemaUsers, {});
        queryInterface.createTable(tablenameTokens, schemaTokens, {});
        queryInterface.createTable(tablenameHealth, schemaHealth(Sequelize), {});
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable(tablenameTokens);
        await queryInterface.dropTable(tablenameUsers);
    },
};
