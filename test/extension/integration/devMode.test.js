const {
  start,
  endDevMode,
  codeSync,
  runCommand,
  checkStartComplete,
  checkSyncCompletion,
  beforeCheck,
} = require("./devMode");

const devModeTests = () => {
  beforeAll(async (done) => {
    beforeCheck().then(done).cath(done.fail);
  });
  it("start", start);
  it("startComplete", checkStartComplete);
  it("syncCompletion", checkSyncCompletion);
  it("runCommand", runCommand);
  it("codeSync", codeSync);
  it("end", endDevMode);
};

module.exports = { devModeTests };
