const { pasteAsText, loadKubeConfig } = require("./connect");

const connectTests = () => {
  describe("connect to Cluster", () => {
    it("paste as Text", async () => {
      await pasteAsText(page);
    });
    it.skip("load KubeConfig", async () => {
      await loadKubeConfig(page);
    });
  });
};

module.exports = { connectTests };
