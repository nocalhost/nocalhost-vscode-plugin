const { pasteAsText, loadKubeConfig } = require("./connect");

const connectTests = () => {
  describe("connect to Cluster", () => {
    // it("paste as Text", pasteAsText);
    it.skip("load KubeConfig", loadKubeConfig);
  });
};

module.exports = { connectTests };
