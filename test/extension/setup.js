const puppeteer = require("puppeteer-core");
const { writeFile } = require("fs").promises;
const os = require("os");
const path = require("path");
const mkdirp = require("mkdirp");
const retry = require("async-retry");

const DIR = path.join(
  os.tmpdir(),
  process.pid.toString(),
  "jest_puppeteer_global_setup"
);

const { start } = require(".");
const { getWebSocketDebuggerUrl } = require(".");
async function setup() {
  const { port, pid } = await start({
    testsEnv: {
      puppeteer: true,
    },
  });
  const browserWSEndpoint = await retry(() => getWebSocketDebuggerUrl(port), {
    maxRetryTime: 10 * 1000,
  });

  const browser = await puppeteer.connect({
    browserWSEndpoint,
    defaultViewport: null,
  });

  mkdirp.sync(DIR);
  await writeFile(path.join(DIR, "pid"), String(pid));

  global.__BROWSER__ = browser;
}

module.exports = setup;
