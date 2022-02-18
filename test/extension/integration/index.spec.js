const path = require("path");
const logger = require("../lib/log");

const { nhctlTests } = require("./nhctl.test");
const { connectTests } = require("./connect.test");
const { installTests } = require("./install.test");
const { portForwardTests } = require("./portForward.test");
const { devModeTests } = require("./devMode.test");
const { viewLogTests } = require("./viewLog.test");
const { editConfigTests } = require("./editConfig.test");
const { remoteRunTests } = require("./remoteRun.test");
const { applyManifestTests } = require("./applyManifest.test");
const { resetPodTests } = require("./resetPod.test");
let fpsArr = [];

const screenshotPath = path.join(__dirname, "../../../.screenshot");

afterEach(async () => {
  const { currentTest } = jasmine;

  if (currentTest.failedExpectations.length > 0) {
    logger.error(
      currentTest.fullName,
      "failure",
      currentTest.failedExpectations[0].stack
    );
  } else {
    logger.info(currentTest.fullName, "success");
  }

  await page.screenshot({
    type: "jpeg",
    path: `${screenshotPath}/${currentTest.fullName}.jpeg`,
    quality: 60,
  });
});

beforeAll(async () => {
  await page.tracing.start({
    path: `${screenshotPath}/.trace.json`,
    screenshots: true,
    screenshotPath: screenshotPath,
  });

  // calc fps
  await page.evaluate(async () => {
    let lastTime = (window.performance || window.Date).now();
    let fpsCount = 0;
    let fps = 0;
    let arr = [];
    const fpsInterval = 30;

    const getFps = () => {
      fpsCount++;
      const timeNow = (window.performance || window.Date).now();
      if (fpsCount >= fpsInterval) {
        fps = Math.round((1000 * fpsCount) / (timeNow - lastTime));
        lastTime = timeNow;
        fpsCount = 0;
        const memory = window.performance.memory;
        arr.push({ fps, memory });
      }
    };

    const start = () => {
      getFps();
      window.__data = JSON.stringify(arr);
      window.requestAnimationFrame(start);
    };

    start();
  });
});

describe("nhctl", nhctlTests);
describe("connect", connectTests);
describe("install", installTests);
describe("portForward", portForwardTests);
describe("devMode", devModeTests);
describe("viewLog", viewLogTests);
describe("editConfig", editConfigTests);
// remote run after edit config hotreload
describe("remoteRun", remoteRunTests);
describe("applyManifest", applyManifestTests);
describe("resetPod", resetPodTests);

afterAll(async () => {
  const fps = await page.evaluate(() => {
    return window.__data;
  });
  logger.info(`fps: ${fps}`);
  await (() => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 2000);
    });
  })();
  await page.tracing.stop();
});

module.exports = {
  screenshotPath,
};
