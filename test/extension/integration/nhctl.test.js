const { dowload } = require("./nhctl");

const nhctlTests = () => {
  beforeAll(() => {
    page.setDefaultTimeout(60 * 1000);
  });
  afterAll(() => {
    page.setDefaultTimeout(20 * 1000);
  });
  test("dowload", async () => {
    await dowload(page);
  });
};

module.exports = { nhctlTests };
