const logger = require("../lib/log");
const { download } = require("./nhctl");

const nhctlTests = () => {
  it(
    "download",
    () => {
      return download().catch((err) => {
        logger.error("nhctl download fail", err);
        setTimeout(() => {
          process.kill(process.pid);
        }, 1_000);
      });
    },
    10 * 60 * 1000
  );
};

module.exports = { nhctlTests };
