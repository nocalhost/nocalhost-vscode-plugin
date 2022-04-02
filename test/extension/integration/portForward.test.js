const { list, stop, add, checkReady } = require("./portForward");

const portForwardTests = () => {
  beforeAll(async (done) => {
    checkReady().then(done).cath(done.fail);
  });
  it("add", add, 15 * 60 * 1000);
  it("list", list);
  it("stop", stop);
};

module.exports = { portForwardTests };
