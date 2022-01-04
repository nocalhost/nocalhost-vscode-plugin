const {
  start,
  endDevMode,
  codeSync,
  runCommand,
  checkStartComplete,
  checkSyncCompletion,
} = require("./devMode");

const { installDemo } = require("./install");

const devModeTests = () => {
  beforeAll(async (done) => {
    installDemo().then(done).cath(done.fail);
  });
  it("start", start);
  it("startComplete", checkStartComplete);
  it("syncCompletion", checkSyncCompletion);
  it("runCommand", runCommand);
  it("codeSync", codeSync);
  it("end", endDevMode);
};

module.exports = { devModeTests };
