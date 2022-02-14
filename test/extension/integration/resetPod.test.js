const { checkReady } = require("./portForward");
const { resetPod } = require("./resetPod");

const resetPodTests = () => {
  beforeAll(async (done) => {
    checkReady().then(done).catch(done.fail);
  });

  it("reset pod", resetPod);
};

module.exports = {
  resetPodTests,
};
