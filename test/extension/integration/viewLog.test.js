const { viewLog } = require("./viewLog");

const viewLogTests = () => {
  describe("View Log", () => {
    it("save", async () => {
      await viewLog(page, browser);
    });
  });
};

module.exports = {
  viewLogTests,
};
