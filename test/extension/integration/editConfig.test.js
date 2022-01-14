const { checkReady } = require("./portForward");
const { editConfig } = require("./editConfig");

const editConfigTests = () => {
  beforeAll(async (done) => {
    checkReady().then(done).cath(done.fail);
  });

  it("edit config", editConfig);
};

module.exports = {
  editConfigTests,
};
