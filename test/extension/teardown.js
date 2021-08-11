const path = require("path");
const { readFile } = require("fs").promises;
const rimraf = require("rimraf");
const os = require("os");
const kill = require("tree-kill");

const DIR = path.join(
  os.tmpdir(),
  process.pid.toString(),
  "jest_puppeteer_global_setup"
);

module.exports = async function () {
  await global.__BROWSER__.disconnect();

  const pid = await readFile(path.join(DIR, "pid"), "utf8");

  kill(Number(pid));

  rimraf.sync(DIR);
};

process.on("SIGINT", async () => {
  await teardown();
});
