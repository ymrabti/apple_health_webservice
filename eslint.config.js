const { defineConfig } = require("eslint/config");
const globals = require("globals");

module.exports = defineConfig([
    {
        ignores: [
            "node_modules",
            "dist",
            "tests/*",
            "**/config.js",
            "**/cookies.js",
        ],
    },
    {
        files: ["**/*.js"],
        languageOptions: {
            sourceType: "commonjs",
            globals: globals.node,
        },
        linterOptions: {},
        rules: {
            "no-undef": "error",
            "no-undef": "error",
            "no-unused-vars": "off",
            "func-names": "warn",
            "no-console": "warn",
            "prefer-const": "warn",
            "no-var": "error",
            // "comma-dangle": ["warn", "always-multiline"],
        },
    },
]);
