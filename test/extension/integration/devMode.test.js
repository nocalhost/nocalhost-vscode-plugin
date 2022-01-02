const {
  start,
  endDevMode,
  codeSync,
  runCommand,
  checkStartComplete,
  checkSyncCompletion,
} = require("./devMode");

const devModeTests = () => {
  describe("devMode", () => {
    it("start", start.bind(null, page));
    it("startComplete", checkStartComplete.bind(null, page));
    it("syncCompletion", checkSyncCompletion.bind(null, page));
    it("runCommand", runCommand.bind(null, page));
    it("codeSync", codeSync.bind(null, page));
    it("end", endDevMode.bind(null, page));
  });
};

module.exports = { devModeTests };
