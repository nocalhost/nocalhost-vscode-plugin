require("./base.spec");

const {
  installHelmGit,
  installManifestGit,
  installKustomizeGit,
  installKustomizeLocal,
  installHelmLocal,
  installManifestLocal,
} = require("../integration/install");

describe("install", () => {
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
});
