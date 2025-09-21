// webpack.config.js
const path = require("path");
const nodeExternals = require("webpack-node-externals");

module.exports = {
  entry: "./src/index.js",
  target: "node",
  mode: "production",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "index.js",
  },
  externals: [nodeExternals()],
  resolve: {
    extensions: [".js"],
  },
  module: {
    rules: [],
  },
};
