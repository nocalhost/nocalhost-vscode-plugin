const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const packageJsonUri = path.resolve(__dirname, "../package.json");
const packageJson = JSON.parse(
  fs.readFileSync(packageJsonUri, { encoding: "utf8" })
);

const getGitVersion = () => {
  let env = "dev";
  const version = execSync(
    `git describe --tags --always --dirty="-${env}"`
  ).toString();

  return version;
};

const { NHCTL_VERSION, MINIMUNM_VERSION_REQUIREMENT } = process.env;

packageJson.version = getGitVersion();

if (MINIMUNM_VERSION_REQUIREMENT) {
  packageJson.nhctl.serverVersion = MINIMUNM_VERSION_REQUIREMENT;
}

if (NHCTL_VERSION) {
  packageJson.nhctl.version = NHCTL_VERSION;
}

fs.unlinkSync(packageJsonUri);
fs.writeFileSync(packageJsonUri, JSON.stringify(packageJson, null, 2));
