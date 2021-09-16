const { download } = require("./nhctl");

const nhctlTests = () => {
  it(
    "download",
    async () => {
      await download(page);
    },
    10 * 60 * 1000
  );
};

module.exports = { nhctlTests };
