const { checkReady } = require("./portForward");
const { start } = require("./remoteRun");
const {
  checkStartComplete,
  runCommand,
  codeSync,
  endDevMode,
} = require("./devMode");

const remoteRunTests = () => {
  beforeAll(async (done) => {
    checkReady().then(done).catch(done.fail);
  });

  it("start", start);
  it("start complete", checkStartComplete);
  it("run command", runCommand);
  it("code sync", codeSync);
  it("end", endDevMode);
};

module.exports = {
  remoteRunTests,
};
