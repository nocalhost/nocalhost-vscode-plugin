require("./base.spec");

const { installManifestLocal } = require("../integration/install");

const { portForwardTests } = require("../integration/portForward.test");
const { devModeTests } = require("../integration/devMode.test");
const { viewLogTests } = require("../integration/viewLog.test");
const { editConfigTests } = require("../integration/editConfig.test");
const { remoteRunTests } = require("../integration/remoteRun.test");
const { applyManifestTests } = require("../integration/applyManifest.test");

it("install manifest", installManifestLocal);

describe("portForward", portForwardTests);
describe("devMode", devModeTests);
describe("viewLog", viewLogTests);
describe("editConfig", editConfigTests);
// remote run after edit config hotreload
describe("remoteRun", remoteRunTests);
describe("applyManifest", applyManifestTests);
