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

  const tag = execSync(
    "git describe --tags `git rev-list --tags --max-count=1` "
  )
    .toString()
    .split("\n")[0];

  const short = execSync("git rev-parse --short HEAD")
    .toString()
    .split("\n")[0];

  packageJson.version = `${tag}-${short}-${env}`;

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
