const { add } = require("./portForward");

const portForwardTests = () => {
  describe("port forward", () => {
    it("add", async () => {
      await add(page);
    });
    // it("list", async () => {});
    // it("stop", async () => {});
  });
};

module.exports = { portForwardTests };
