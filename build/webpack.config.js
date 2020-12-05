// @ts-nocheck

"use strict";

const path = require("path");
const copyWebpackPlugin = require("copy-webpack-plugin");

/**@type {import('webpack').Configuration}*/
const extensionConfig = {
  target: "node",
  mode: "none", // this leaves the source code as close as possible to the original (when packaging we set this to 'production')

  entry: "./src/main/extension.ts",
  output: {
    path: path.resolve(__dirname, "..", "dist"),
    filename: "extension.js",
    libraryTarget: "commonjs2",
    devtoolModuleFilenameTemplate: "../[resource-path]",
  },
  devtool: "source-map",
  externals: {
    vscode: "commonjs vscode",
  },
  resolve: {
    extensions: [".ts", ".js", ".json"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        loader: "ts-loader",
        options: {
          configFile: path.resolve(__dirname, "./tsconfig.extension.json"),
        },
      },
      {
        test: /\.(ts)$/,
        enforce: "pre",
        use: [
          {
            options: {
              eslintPath: require.resolve("eslint"),
            },
            loader: require.resolve("eslint-loader"),
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new copyWebpackPlugin({
      patterns: [{ from: "./cleanup.js" }],
    }),
  ],
};

const rendererConfig = {
  target: "node",
  mode: "none",
  entry: "./src/renderer/index.tsx",
  output: {
    path: path.resolve(__dirname, "..", "dist"),
    filename: "renderer.js",
  },
  devtool: "source-map",
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".json"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        loader: "ts-loader",
        options: {
          configFile: path.resolve(__dirname, "./tsconfig.renderer.json"),
        },
      },
    ],
  },
};
module.exports = [extensionConfig, rendererConfig];
