const path = require("path");
const { readFile } = require("fs").promises;
const rimraf = require("rimraf");
const os = require("os");

const DIR = path.join(os.tmpdir(), "jest_puppeteer_global_setup");

module.exports = async function () {
  await global.__BROWSER__.disconnect();

  const pid = await readFile(path.join(DIR, "pid"), "utf8");
  if (!pid) {
    throw new Error("wsEndpoint not found");
  }

  let isStop = process.kill(pid, "SIGINT");

  if (!isStop) {
    process.kill(pid, "SIGKILL");
  }


  rimraf.sync(DIR);
};
