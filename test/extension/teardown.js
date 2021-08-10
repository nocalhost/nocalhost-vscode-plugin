// teardown.js
const path = require("path");
const { readFile } = require("fs").promises;
const rimraf = require("rimraf");
const os = require("os");
const { stop } = require(".");

const DIR = path.join(os.tmpdir(), "jest_puppeteer_global_setup");

module.exports = async function () {
  await global.__BROWSER__.disconnect();

  const pid = await readFile(path.join(DIR, "pid"), "utf8");
  if (!pid) {
    throw new Error("wsEndpoint not found");
  }

  await stop(pid);

  rimraf.sync(DIR);
};
