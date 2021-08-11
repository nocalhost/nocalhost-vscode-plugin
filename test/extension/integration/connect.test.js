const { pasteAsText } = require("./connect");

const connectTests = () => {
  describe("Connect to Cluster ", () => {
    it("Paste as Text", async () => {
      await pasteAsText(page);
    });
  });
};

module.exports = { connectTests };
