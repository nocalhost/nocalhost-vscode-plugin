const { viewLog } = require("./viewLog");

const viewLogTests = async () => {
  describe("View Log", () => {
    it("save", async () => {
      await viewLog(page, browser);
    });
  });
};

module.exports = {
  viewLogTests,
};
