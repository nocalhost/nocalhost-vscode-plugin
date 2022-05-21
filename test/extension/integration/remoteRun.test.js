const { checkReady } = require("./portForward");
const { start, checkHotReload } = require("./remoteRun");
const { stop } = require("./duplicateDevMode");
const { checkStartComplete } = require("./devMode");
const { spawnSync } = require("child_process");

const remoteRunTests = () => {
  beforeAll(async (done) => {
    checkReady()
      .then(() => {
        // spawnSync(
        //   "nhctl dev associate bookinfo -c ratings -d ratings --de-associate",
        //   { shell: true }
        // );
        done();
      })
      .catch(done.fail);
  });

  it("start", start);
  it("start complete", checkStartComplete);
  it("hotReload", checkHotReload);
  it("end", stop);
};

module.exports = {
  remoteRunTests,
};
