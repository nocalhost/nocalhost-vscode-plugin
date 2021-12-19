const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const packageJsonUri = path.resolve(__dirname, "../package.json");
const packageJson = JSON.parse(
  fs.readFileSync(packageJsonUri, { encoding: "utf8" })
);

const { VERSION, NHCTL_VERSION, MINIMUNM_VERSION_REQUIREMENT } = process.env;

if (VERSION) {
  packageJson.version = VERSION;

  delete packageJson.autoUpdate;

  require("./updateChangelog");
} else {
  let env = "dev";
  let version = packageJson.version;

  if (process.env.CI === "true") {
    env = "test";

    execSync("git fetch --depth=30");
  }

  version = execSync(`git describe --tags --always --dirty="-${env}"`)
    .toString()
    .split("\n")[0];

  packageJson.version = version;

  packageJson.autoUpdate = false;
}

if (MINIMUNM_VERSION_REQUIREMENT) {
  packageJson.nhctl.serverVersion = MINIMUNM_VERSION_REQUIREMENT;
}

if (NHCTL_VERSION) {
  packageJson.nhctl.version = NHCTL_VERSION;
}

fs.unlinkSync(packageJsonUri);
fs.writeFileSync(packageJsonUri, JSON.stringify(packageJson, null, 2));
