const fs = require("fs");
const path = require("path");
const semver = require("semver");
const { spawnSync } = require("child_process");
const assert = require("assert");

const packageJsonUri = path.resolve(__dirname, "../package.json");
const packageJson = JSON.parse(
  fs.readFileSync(packageJsonUri, { encoding: "utf8" })
);

const { VERSION, NHCTL_VERSION, MINIMUNM_VERSION_REQUIREMENT } = process.env;

/**
 *
 * @param {string} cmd
 * @param {ReadonlyArray<string>} args
 * @returns
 */
function getGitResult(cmd, args) {
  const result = spawnSync(`${cmd} ${args.join(" ")}`, { shell: true });

  assert.equal(result.status, 0, result.stderr);

  return result.stdout.toString().trim();
}

if (VERSION) {
  //formatted version number
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
  // get the latest tag and short commit and environment generation version number
  let version = getGitResult("git", ["describe", "--tags", "--abbrev=0"]);

  version = semver.coerce(version);

  version = semver.minVersion(`>${version}`);

  const rev = getGitResult("git", ["rev-parse", "--short", "HEAD"]);

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
  // test nhctl version
  packageJson.nhctl.version = NHCTL_VERSION;
}

fs.unlinkSync(packageJsonUri);
fs.writeFileSync(packageJsonUri, JSON.stringify(packageJson, null, 2));
