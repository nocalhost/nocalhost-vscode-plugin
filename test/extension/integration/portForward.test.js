const { list, stop, add, checkReady } = require("./portForward");

const sequentialTest = (name, action) => {
  it(name, async () => {
    if (hasTestFailed) {
      console.warn(`[skipped]: ${name}`);
    } else {
      try {
        await action();
      } catch (error) {
        hasTestFailed = true;
        throw error;
      }
    }
  });
};

const portForwardTests = () => {
  beforeAll(async (done) => {
    checkReady().then(done).cath(done.fail);
  });
  sequentialTest("", add);
  it("add", add, 15 * 60 * 1000);
  it("list", list);
  it("stop", stop);
};

module.exports = { portForwardTests };
