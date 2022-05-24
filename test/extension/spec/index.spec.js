require("./base.spec");

const { installManifestLocal } = require("../integration/install");

const { portForwardTests } = require("../integration/portForward.test");
const { devModeTests } = require("../integration/devMode.test");
const { viewLogTests } = require("../integration/viewLog.test");
const { remoteRunTests } = require("../integration/remoteRun.test");
const { applyManifestTests } = require("../integration/applyManifest.test");

it("install manifest", () => {
  return installManifestLocal().catch(() => {
    setTimeout(() => {
      process.kill(process.pid);
    }, 1_000);
    throw err;
  });
});

describe("portForward", portForwardTests);
describe("devMode", devModeTests);
describe("remoteRun", remoteRunTests);
describe("viewLog", viewLogTests);
// remote run after edit config hotreload
describe("applyManifest", applyManifestTests);
