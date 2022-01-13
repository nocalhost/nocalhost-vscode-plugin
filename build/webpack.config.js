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
      patterns: [{ from: "./scripts/cleanup.js" }],
    }),
  ],
};

/**@type {import('webpack').Configuration}*/
const rendererConfig = {
  entry: {
    renderer_v1: "./src/renderer/index.tsx",
    home: "./src/renderer/HomeIndex.tsx",
  },
  output: {
    path: path.resolve(__dirname, "..", "dist"),
  },
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
  plugins: [
    new copyWebpackPlugin({
      patterns: [
        { from: "./src/renderer/assets/css/atom-one-light.css" },
        { from: "./src/renderer/assets/css/vs2015.css" },
        { from: "./src/renderer/assets/fonts/DroidSansMono_v1.ttf" },
      ],
    }),
  ],
};
module.exports = [extensionConfig, rendererConfig];
