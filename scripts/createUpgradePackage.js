const { execSync } = require("child_process");
const { writeFileSync } = require("fs");
const semver = require("semver");

const packageJson = require("../package.json");

const args = process.argv.slice(2);

let { nhctl, version } = packageJson;

version = args[0] ?? version;

function package(preVersion) {
  version = semver.inc(preVersion, "patch");

  nhctl.version = version;

  writeFileSync(
    "./package.json",
    JSON.stringify({ ...packageJson, nhctl, version }, null, 2)
  );
  console.info(`build v${version} ....`);

  execSync("npm run build");

  return version;
}

Array(3).fill(0).reduce(package, version);
