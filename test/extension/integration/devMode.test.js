const {
  start,
  endDevMode,
  codeSync,
  runCommand,
  checkStartComplete,
  checkSyncCompletion,
} = require("./devMode");

const { checkReady } = require("./portForward");

const devModeTests = () => {
  beforeAll(async (done) => {
    checkReady().then(done).cath(done.fail);
  });
  it("start", start);
  it("startComplete", checkStartComplete);
  it("syncCompletion", checkSyncCompletion);
  it("runCommand", runCommand);
  it("codeSync", codeSync);
  it("end", endDevMode);
};

module.exports = { devModeTests };
