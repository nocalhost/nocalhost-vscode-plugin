const {
  installHelmGit,
  installManifestGit,
  installKustomizeGit,
  installKustomizeLocal,
  installHelmLocal,
  installManifestLocal,
} = require("./install");

const { gitCode, getRepository } = require("../lib");

const installTests = () => {
  beforeAll(async (done) => {
    gitCode(getRepository("bookinfo.git"))
      .then((res) => {
        process.env.tmpDir = res.tmpDir;
        done();
      })
      .catch(done.fail);
  });

  describe("deploy From Local Directory", () => {
    it("kustomize", installKustomizeLocal);
    it("helm", installHelmLocal);
    it("manifest", installManifestLocal);
  });

  describe("deploy From Git Repo", () => {
    it("kustomize", installKustomizeGit);
    it("helm", installHelmGit);
    it("manifest", installManifestGit);
  });
};

module.exports = { installTests };
