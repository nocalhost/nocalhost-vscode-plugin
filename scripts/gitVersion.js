const fs = require("fs");
const path = require("path");

const packageJsonUri = path.resolve(__dirname, "../package.json");
const packageJson = JSON.parse(
  fs.readFileSync(packageJsonUri, { encoding: "utf8" })
);

const { PLUGIN_VERSION } = process.env;

console.log("> update the version to: ", PLUGIN_VERSION);

const version = `-beta.${PLUGIN_VERSION}`;

packageJson.version += version;

fs.unlinkSync(packageJsonUri);
fs.writeFileSync(packageJsonUri, JSON.stringify(packageJson));
