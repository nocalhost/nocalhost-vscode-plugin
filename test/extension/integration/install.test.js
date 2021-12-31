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
    gitCode(getRepository("bookinfo.git")).then(done).catch(done.fail);
  });

  describe("deploy From Local Directory", () => {
    it("kustomize", async () => {
      await installKustomizeLocal(page);
    });
    it("helm", async () => {
      await installHelmLocal(page);
    });
    it("manifest", async () => {
      await installManifestLocal(page);
    });
  });

  describe("deploy From Git Repo", () => {
    it("kustomize", async () => {
      await installKustomizeGit(page);
    });
    it("helm", async () => {
      await installHelmGit(page);
    });
    it("manifest", async () => {
      await installManifestGit(page);
    });
  });
};

module.exports = { installTests };
