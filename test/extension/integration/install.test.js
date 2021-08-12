const cp = require("child_process");
const rimraf = require("rimraf");
const os = require("os");
const path = require("path");
const assert = require("assert");

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
    let bookInfoPath;
    beforeAll(async () => {
      bookInfoPath = path.join(os.tmpdir(), process.pid.toString(), "bookInfo");

      rimraf.sync(bookInfoPath);

      const syncReturns = cp.spawnSync(
        "git",
        [
          "clone",
          "--depth",
          "1",
          "https://github.com/nocalhost/bookinfo.git",
          bookInfoPath,
        ],
        {
          encoding: "utf-8",
          stdio: "inherit",
        }
      );

      assert.strictEqual(0, syncReturns.status, syncReturns.stderr);
    });

    afterAll(async () => {
      rimraf.sync(bookInfoPath);
    });

    it("kustomize", async () => {
      await installKustomizeLocal(page, bookInfoPath);
    });
    it("helm", async () => {
      await installHelmLocal(page, bookInfoPath);
    });
    it("manifest", async () => {
      await installManifestLocal(page, bookInfoPath);
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
