const { viewLog } = require("./viewLog");
const { checkReady } = require("./portForward");
const viewLogTests = () => {
  //   beforeAll(async (done) => {
  //     checkReady().then(done).cath(done.fail);
  //   });

  it("view", viewLog);
};

module.exports = {
  viewLogTests,
};
