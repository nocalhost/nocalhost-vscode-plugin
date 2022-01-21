const { checkReady } = require("./portForward");

const duplicateDevModeTests = () => {
  beforeAll(async (done) => {
    checkReady().then(done).catch(done.fail);
  });
};

module.exports = {
  duplicateDevModeTests,
};
