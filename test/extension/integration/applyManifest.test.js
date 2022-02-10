const { applyDeployment } = require("./applyManifest");

const applyManifestTests = () => {
  it("apply deployment", async () => {
    await applyDeployment();
  });
};

module.exports = {
  applyManifestTests,
};
