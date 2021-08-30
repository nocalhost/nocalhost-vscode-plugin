const path = require("path");
const format = require("date-format");

const { nhctlTests } = require("./nhctl.test");
const { connectTests } = require("./connect.test");
const { installTests } = require("./install.test");

const screenshotPath = path.join(__dirname, "../../../.screenshot");

function log(msg) {
  process.stdout.write(
    `\n${format("yyyy-MM-dd hh:mm:ss.SSS", new Date())} ${msg}\n`
  );
}

beforeEach(async () => {
  const { currentTest } = jasmine;

  log("before " + currentTest.fullName);
});

afterEach(async () => {
  const { currentTest } = jasmine;

  log("after " + currentTest.fullName);

  await page.screenshot({
    type: "jpeg",
    path: `${screenshotPath}/${currentTest.fullName}.jpeg`,
    quality: 60,
  });
});

describe("nhctl", nhctlTests);
describe("connect", connectTests);
describe("install", installTests);
