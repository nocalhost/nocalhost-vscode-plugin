const path = require("path");
const { readFile } = require("fs").promises;
const fse = require("fs-extra");
const os = require("os");
const kill = require("tree-kill");

const { videoCapture } = require(".");

const DIR = path.join(
  os.tmpdir(),
  process.pid.toString(),
  "jest_puppeteer_global_setup"
);

async function teardown() {
  // await videoCapture.end();

  await global.__BROWSER__.disconnect();

  const pid = await readFile(path.join(DIR, "pid"), "utf8");

  kill(Number(pid));

  fse.removeSync(DIR);
}

process.on("SIGINT", async () => {
  await teardown();
});

module.exports = teardown;
