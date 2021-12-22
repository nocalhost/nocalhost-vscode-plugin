const { editConfig } = require("./configEdit");

const configEditTests = () => {
  describe("Config Edit", () => {
    it("save", async () => {
      await editConfig(page, browser);
    });
  });
};

module.exports = {
  configEditTests,
};
