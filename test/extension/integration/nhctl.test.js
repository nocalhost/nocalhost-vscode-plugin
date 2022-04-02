const { download } = require("./nhctl");

const nhctlTests = () => {
  it(
    "download",
    () => {
      return download.catch((err) => {
        setTimeout(() => {
          process.kill(process.pid);
        }, 1_000);
        throw err;
      });
    },
    10 * 60 * 1000
  );
};

module.exports = { nhctlTests };
