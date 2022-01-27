const { checkReady } = require("./portForward");
const { start, checkHotReload } = require("./remoteRun");
const { stop } = require("./duplicateDevMode");
const { checkStartComplete } = require("./devMode");

const remoteRunTests = () => {
  beforeAll(async (done) => {
    checkReady().then(done).catch(done.fail);
  });

  it("start", start);
  it("start complete", checkStartComplete);
  it("hotReload", checkHotReload);
  it("end", stop);
};

module.exports = {
  remoteRunTests,
};
