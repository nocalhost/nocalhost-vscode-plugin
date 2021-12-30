const rimraf = require("rimraf");
const path = require("path");
const cp = require("child_process");

const {
  installHelmGit,
  installManifestGit,
  installKustomizeGit,
  installKustomizeLocal,
  installHelmLocal,
  installManifestLocal,
} = require("./install");

const cloneTmpDir = () => {
  let tmpDir = path.join(os.tmpdir(), process.pid.toString(), "bookInfo");

  rimraf.sync(tmpDir);

  process.env.tmpDir = tmpDir;

  const syncReturns = cp.spawnSync(
    "git",
    [
      "clone",
      "--depth",
      "1",
      "https://github.com/nocalhost/bookinfo.git",
      tmpDir,
    ],
    {
      encoding: "utf-8",
      stdio: "inherit",
    }
  );
  return syncReturns;
};
const installTests = () => {
  beforeAll(async (done) => {
    const syncReturns = cloneTmpDir();

    if (syncReturns.status !== 0) {
      done.fail(syncReturns.stderr);
    }
    done();
  });

  afterAll(async () => {
    rimraf.sync(bookInfoPath);
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
