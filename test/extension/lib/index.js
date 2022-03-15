const cp = require("child_process");
const assert = require("assert");
const path = require("path");
const os = require("os");
const cryptoRandomString = require("crypto-random-string");
/**
 *
 * @param {string} repository
 * @returns
 */
const gitCode = async (repository) => {
  let tmpDir = path.join(os.tmpdir(), cryptoRandomString(10));

  const result = cp.spawnSync(
    "git",
    ["clone", "--depth", "1", repository, tmpDir],
    {
      encoding: "utf-8",
      stdio: "inherit",
    }
  );

  assert(result.status === 0, result.stderr);

  return { result, tmpDir };
};

const getRepository = (suffix) => {
  const prefix =
    (process.env["NH_REGION"] ?? "").toUpperCase() === "CN"
      ? "https://e.coding.net/nocalhost"
      : "https://github.com";

  return `${prefix}/nocalhost/${suffix}`;
};

function generateMacAddress(sep = ":") {
  let mac = "XX:XX:XX:XX:XX:XX"
    .replace(/X/g, () => {
      return "0123456789ABCDEF".charAt(Math.floor(Math.random() * 16));
    })
    .toLowerCase();

  if (sep !== ":") {
    mac = mac.replace(/:/g, sep);
  }

  return mac;
}

module.exports = { generateMacAddress, getRepository, gitCode };
