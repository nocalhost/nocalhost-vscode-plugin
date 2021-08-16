const fs = require("fs");
const path = require("path");

let version = process.env.VERSION;
console.log("> update the version to: ", version);

if (!version) {
  return;
}

const matched = version.match(/\d+\.\d+\.\d+/);
if (!matched || matched.length !== 1) {
  return;
}

version = matched[0];

const packageJsonUri = path.resolve(__dirname, "../package.json");
const packageJson = JSON.parse(
  fs.readFileSync(packageJsonUri, { encoding: "utf8" })
);

packageJson.version = version;
packageJson.nhctl.version = version;
packageJson.nhctl.serverVersion = process.env.MINIMUNM_VERSION_REQUIREMENT;

fs.unlinkSync(packageJsonUri);
fs.writeFileSync(packageJsonUri, JSON.stringify(packageJson));
