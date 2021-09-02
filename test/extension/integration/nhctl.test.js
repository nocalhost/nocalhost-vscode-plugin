const { dowload } = require("./nhctl");

const nhctlTests = () => {
  test("dowload", async () => {
    await dowload(page);
  });
};

module.exports = { nhctlTests };
