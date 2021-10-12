const fs = require("fs");
const path = require("path");

const packageJsonUri = path.resolve(__dirname, "../package.json");
const packageJson = JSON.parse(
  fs.readFileSync(packageJsonUri, { encoding: "utf8" })
);

let {
  PLUGIN_VERSION,
  NHCTL_VERSION,
  MINIMUNM_VERSION_REQUIREMENT,
} = process.env;

console.log("> update the version to: ", PLUGIN_VERSION);

if (Number(PLUGIN_VERSION)) {
  PLUGIN_VERSION = "a" + PLUGIN_VERSION;
}

const version = `.${PLUGIN_VERSION}.beta`;

packageJson.version += version;
packageJson.nhctl.serverVersion = MINIMUNM_VERSION_REQUIREMENT;

if (NHCTL_VERSION) {
  packageJson.nhctl.version = NHCTL_VERSION;
}

fs.unlinkSync(packageJsonUri);
fs.writeFileSync(packageJsonUri, JSON.stringify(packageJson));
