require("./base.spec");

const { start, endDevMode } = require("../integration/devMode");
const { checkOthers } = require("../integration/duplicateDevMode");
const { installManifestLocal } = require("../integration/install");
const { checkReady } = require("../integration/portForward");

describe("devMode others", () => {
  it("install manifest", installManifestLocal);
  it("checkReady", checkReady);
  it("devMode start", start);
  it("check", checkOthers);
  it("endDevMode", endDevMode);
});
