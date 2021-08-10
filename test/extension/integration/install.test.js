const cp = require("child_process");
const rimraf = require("rimraf");
const os = require("os");
const path = require("path");

const {
  installHelmGit,
  installManifestGit,
  installKustomizeGit,
  installKustomizeLocal,
  installHelmLocal,
  installManifestLocal,
} = require("./install");

const installTests = () => {
  describe("Deploy From Local Directory", () => {
    let localTmpPath;
    beforeAll(async () => {
      localTmpPath = path.join(os.tmpdir(), "localTmpPath");

      rimraf.sync(localTmpPath);

      const spawnSyncReturns = cp.spawnSync(
        "git",
        [
          "clone",
          "--depth",
          "1",
          "https://github.com/nocalhost/bookinfo.git",
          localTmpPath,
        ],
        {
          encoding: "utf-8",
          stdio: "inherit",
        }
      );

      if (spawnSyncReturns.status !== 0) {
        throw new Error("git clone error");
      }
    });
    it("kustomize", async () => {
      await installKustomizeLocal(page, localTmpPath);
    });
    it("helm", async () => {
      await installHelmLocal(page, localTmpPath);
    });
    it("manifest", async () => {
      await installManifestLocal(page, localTmpPath);
    });
  });

  describe("Deploy From Git Repo", () => {
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
