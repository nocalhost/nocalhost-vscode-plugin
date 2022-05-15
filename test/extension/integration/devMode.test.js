const {
  start,
  endDevMode,
  codeSync,
  runCommand,
  checkStartComplete,
  checkSyncCompletion,
} = require("./devMode");

const {
  startDev,
  startDuplicateComplete,
  stop,
} = require("./duplicateDevMode");
const { editConfig } = require("./editConfig");

const { checkReady } = require("./portForward");

const devModeTests = () => {
  beforeAll(async (done) => {
    checkReady().then(done).cath(done.fail);
  });

  describe("replace mode", () => {
    it("editConfig", editConfig);
    it("start", start);
    it("startComplete", checkStartComplete);
    it("syncCompletion", checkSyncCompletion);
    it("runCommand", runCommand);
    it("codeSync", codeSync);
    it("end", endDevMode);
  });

  describe("duplicate mode", () => {
    it("start", startDev);
    it("start  complete", startDuplicateComplete);
    it("end", stop);
  });
};

module.exports = { devModeTests };
