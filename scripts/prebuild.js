const fs = require("fs");
const { execSync } = require("child_process");
const path = require("path");
const semver = require("semver");

const packageJsonUri = path.resolve(__dirname, "../package.json");
const packageJson = JSON.parse(
  fs.readFileSync(packageJsonUri, { encoding: "utf8" })
);

const { VERSION, NHCTL_VERSION, MINIMUNM_VERSION_REQUIREMENT } = process.env;

// release
if (VERSION) {
  const version = semver.valid(VERSION);

  if (version) {
    console.log("> update the version to: ", version);

    packageJson.version = version;
    packageJson.nhctl.version = version;

    require("./updateChangelog");
  } else {
    throw Error(`version Invalid: ${VERSION}`);
  }
} else {
  //build
  let version = execSync(`git describe --tags --abbrev=0`)
    .toString()
    .split("\n")[0];

  version = semver.coerce(version);

  version = semver.minVersion(`>${version}`);

  const rev = execSync(`git rev-parse --short HEAD`).toString().split("\n")[0];

  const identifier = process.env.CI === "true" ? "beta" : "alpha";

  packageJson.version = `${version}-${identifier}.${rev}`;
}

if (MINIMUNM_VERSION_REQUIREMENT) {
  const version = semver.valid(MINIMUNM_VERSION_REQUIREMENT);

  if (version) {
    packageJson.nhctl.serverVersion = version;
  } else {
    throw Error(`serverVersion Invalid: ${MINIMUNM_VERSION_REQUIREMENT}`);
  }
}

if (NHCTL_VERSION) {
  packageJson.nhctl.version = NHCTL_VERSION;
}

fs.unlinkSync(packageJsonUri);
fs.writeFileSync(packageJsonUri, JSON.stringify(packageJson, null, 2));
