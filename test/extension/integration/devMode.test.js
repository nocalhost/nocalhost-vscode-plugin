const {
  start,
  endDevMode,
  codeSync,
  runCommand,
  checkStartComplete,
  checkSyncCompletion,
} = require("./devMode");

const devModeTests = () => {
  it("start", start);
  it("startComplete", checkStartComplete);
  it("syncCompletion", checkSyncCompletion);
  it("runCommand", runCommand);
  it("codeSync", codeSync);
  it("end", endDevMode);
};

module.exports = { devModeTests };
