require("./base.spec");

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

describe("install", installTests);
