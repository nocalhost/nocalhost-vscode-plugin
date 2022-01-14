const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const packageJsonUri = path.resolve(__dirname, "../package.json");
const packageJson = JSON.parse(
  fs.readFileSync(packageJsonUri, { encoding: "utf8" })
);

const { NHCTL_VERSION, MINIMUNM_VERSION_REQUIREMENT } = process.env;

let version = process.env.VERSION;

if (version) {
  console.log("> update the version to: ", version);

  const matched = version.match(/\d+\.\d+\.\d+/);
  if (!matched || matched.length !== 1) {
    return;
  }

  version = matched[0];

  packageJson.version = version;
  packageJson.nhctl.version = version;

  require("./updateChangelog");
} else {
  let env = "alpha";
  let version = packageJson.version;

  if (process.env.CI === "true") {
    env = "beta";

    const rev = execSync(`git rev-parse --short HEAD`)
      .toString()
      .split("\n")[0];

    packageJson.version = `${version}-${rev}-${env}`;
  } else {
    version = execSync(`git describe --tags --always --dirty="-${env}"`)
      .toString()
      .split("\n")[0];

    packageJson.version = version;
  }
}

if (MINIMUNM_VERSION_REQUIREMENT) {
  packageJson.nhctl.serverVersion = MINIMUNM_VERSION_REQUIREMENT;
}

if (NHCTL_VERSION) {
  packageJson.nhctl.version = NHCTL_VERSION;
}

fs.unlinkSync(packageJsonUri);
fs.writeFileSync(packageJsonUri, JSON.stringify(packageJson, null, 2));
