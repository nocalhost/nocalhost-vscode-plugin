const path = require("path");
const logger = require("../lib/log");

const { nhctlTests } = require("./nhctl.test");
const { connectTests } = require("./connect.test");
const { installTests } = require("./install.test");
const { portForwardTests } = require("./portForward.test");
const { devModeTests } = require("./devMode.test");
const { viewLogTests } = require("./viewLog.test");
const { editConfigTests } = require("./editConfig.test");
const { duplicateDevModeTests } = require("./duplicateDevMode.test");
const { remoteRunTests } = require("./remoteRun.test");

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

describe("nhctl", nhctlTests);
describe("connect", connectTests);
describe("install", installTests);
describe("portForward", portForwardTests);
describe("devMode", devModeTests);
describe("viewLog", viewLogTests);
describe("editConfig", editConfigTests);
describe("duplicate devMode", duplicateDevModeTests);
describe("remote run", remoteRunTests);

module.exports = {
  screenshotPath,
};
