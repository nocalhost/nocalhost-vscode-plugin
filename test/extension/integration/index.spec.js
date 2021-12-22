const path = require("path");

const { nhctlTests } = require("./nhctl.test");
const { connectTests } = require("./connect.test");
const { installTests } = require("./install.test");
const logger = require("../lib/log");
const { configEditTests } = require("./configEdit.test");
const { viewLogTests } = require("./viewLog.test");

const screenshotPath = path.join(__dirname, "../../../.screenshot");

beforeEach(async () => {
  const { currentTest } = jasmine;

  logger.info("before " + currentTest.fullName);
});

afterEach(async () => {
  const { currentTest } = jasmine;

  logger.info("after " + currentTest.fullName);

  await page.screenshot({
    type: "jpeg",
    path: `${screenshotPath}/${currentTest.fullName}.jpeg`,
    quality: 60,
  });
});

describe("nhctl", nhctlTests);
describe("connect", connectTests);
// describe("install", installTests);
// describe("config", configEditTests);
describe("view log", viewLogTests);

module.exports = {
  screenshotPath,
};
