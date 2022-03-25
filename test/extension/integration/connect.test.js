const { pasteAsText, loadKubeConfig } = require("./connect");

const connectTests = () => {
  describe("connect to Cluster", () => {
    it.skip("paste as Text", pasteAsText);
    it("load KubeConfig", loadKubeConfig);
  });
};

module.exports = { connectTests };
