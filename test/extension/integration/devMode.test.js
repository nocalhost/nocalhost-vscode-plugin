const {
  start,
  endDevMode,
  codeSync,
  runCommand,
  stopDevMode,
} = require("./devMode");

const { startDev, startDuplicateComplete } = require("./duplicateDevMode");

const { checkReady } = require("./portForward");

const devModeTests = () => {
  beforeAll(async (done) => {
    checkReady().then(done).cath(done.fail);
  });

  describe("replace mode", () => {
    it("start", start);
    it("runCommand", runCommand);
    it("codeSync", codeSync);
    it("end", endDevMode);
  });

  describe("duplicate mode", () => {
    it("start", startDev);
    it("start  complete", startDuplicateComplete);
    it("end", stopDevMode);
  });
};

module.exports = { devModeTests };
