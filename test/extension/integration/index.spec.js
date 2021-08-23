const path = require("path");
const { nhctlTests } = require("./nhctl.test");
const { connectTests } = require("./connect.test");
const { installTests } = require("./install.test");

const screenshotPath = path.join(__dirname, "../../../.screenshot");

afterEach(async () => {
  await page.screenshot({
    type: "jpeg",
    path: `${screenshotPath}/${jasmine["currentTest"].fullName}.jpeg`,
    quality: 60,
  });
});

describe("nhctl", nhctlTests);
describe("connect", connectTests);
describe("install", installTests);
