const { pasteAsText } = require("./connect");

const connectTests = () => {
  describe("connect to Cluster ", () => {
    it("paste as Text", async () => {
      await pasteAsText(page);
    });
  });
};

module.exports = { connectTests };
