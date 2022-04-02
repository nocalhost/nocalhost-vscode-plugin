const { checkReady } = require("./portForward");
const { start, checkHotReload, stopRun } = require("./remoteRun");
const { checkStartComplete } = require("./devMode");

const remoteRunTests = () => {
  beforeAll(async (done) => {
    checkReady().then(done).catch(done.fail);
  });

  it("start", start);
  it("start complete", checkStartComplete);
  it("hotReload", checkHotReload);
  it("end", stopRun);
};

module.exports = {
  remoteRunTests,
};
