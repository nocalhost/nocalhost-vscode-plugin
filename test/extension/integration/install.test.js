const cp = require("child_process");
const rimraf = require("rimraf");
const os = require("os");
const fs = require("fs-extra");
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
  describe("deploy From Local Directory", () => {
    let bookInfoPath;
    beforeAll(async (done) => {
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

      if (syncReturns.status !== 0) {
        done.fail(syncReturns.stderr);
      }
      done();
    });

    afterAll(async () => {
      fs.moveSync(bookInfoPath, path.join(__dirname, "../../../.screenshot/"));
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
