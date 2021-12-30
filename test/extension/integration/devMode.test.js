const { start } = require("./devMode");

const devModeTests = () => {
  describe("devMode", () => {
    it("start", start.bind(null, page));
  });
};

module.exports = { devModeTests };
