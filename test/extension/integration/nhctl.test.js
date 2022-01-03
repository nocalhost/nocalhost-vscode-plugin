const { download } = require("./nhctl");

const nhctlTests = () => {
  it("download", download, 10 * 60 * 1000);
};

module.exports = { nhctlTests };
