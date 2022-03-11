const path = require("path");
const logger = require("../lib/log");
const { gitCode, getRepository } = require("../lib");

const { nhctlTests } = require("./nhctl.test");
const { connectTests } = require("./connect.test");

const screenshotPath = path.join(__dirname, "../../../.screenshot");

beforeAll(async (done) => {
  gitCode(getRepository("bookinfo.git"))
    .then((res) => {
      process.env.tmpDir = res.tmpDir;
      done();
    })
    .catch(done.fail);
});

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
