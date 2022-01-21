const { checkReady } = require("./portForward");
const { startDev, startDuplicateComplete } = require("./duplicateDevMode");
const { runCommand, codeSync, endDevMode } = require("./devMode");

const duplicateDevModeTests = () => {
  beforeAll(async (done) => {
    checkReady().then(done).catch(done.fail);
  });

  it("start", startDev);
  it("start  complete", startDuplicateComplete);
  it("run command", runCommand);
  it("code sync", codeSync);
  it("end", endDevMode);
};

module.exports = {
  duplicateDevModeTests,
};
