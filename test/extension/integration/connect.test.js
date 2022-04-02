const { pasteAsText, loadKubeConfig } = require("./connect");

const connectTests = () => {
  describe("connect to Cluster", () => {
    it.skip("paste as Text", pasteAsText);
    it("load KubeConfig", () => {
      return loadKubeConfig().catch((err) => {
        setTimeout(() => {
          process.kill(process.pid);
        }, 1_000);
        throw err;
      });
    });
  });
};

module.exports = { connectTests };
