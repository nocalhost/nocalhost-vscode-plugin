const { pasteAsText, loadKubeConfig } = require("./connect");

const connectTests = () => {
  describe("connect to Cluster", () => {
    it.skip("paste as Text", async () => {
      await pasteAsText(page);
    });
    it("load KubeConfig", async () => {
      await loadKubeConfig(page);
    });
  });
};

module.exports = { connectTests };
