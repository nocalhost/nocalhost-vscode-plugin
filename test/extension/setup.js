const puppeteer = require("puppeteer-core");
const { writeFileSync, existsSync, mkdirSync } = require("fs");
const os = require("os");
const path = require("path");
const mkdirp = require("mkdirp");
const retry = require("async-retry");
const logger = require("./lib/log");
const { start } = require(".");
const { getWebSocketDebuggerUrl } = require(".");

const DIR = path.join(
  os.tmpdir(),
  process.pid.toString(),
  "jest_puppeteer_global_setup"
);

const screenshotPath = path.join(__dirname, "../../.screenshot");

async function setup() {
  if (!existsSync(screenshotPath)) {
    mkdirSync(screenshotPath);
  }

  const { port, pid } = await start({
    testsEnv: {
      puppeteer: true,
    },
  });

  const browserWSEndpoint = await retry(() => getWebSocketDebuggerUrl(port), {
    retries: 3,
  });

  const browser = await puppeteer.connect({
    browserWSEndpoint,
    defaultViewport: null,
  });
  mkdirp.sync(DIR);

  writeFileSync(path.join(DIR, "pid"), String(pid));

  global.__BROWSER__ = browser;
}

module.exports = setup;
