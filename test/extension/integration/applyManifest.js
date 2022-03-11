const { tree, file } = require("../lib/components");
const path = require("path");
const os = require("os");
const { waitForMessage } = require("./index");
const { existsSync } = require("fs");
const assert = require("assert");

const appPath = ["", "default", "bookinfo"];

const applyDeployment = async () => {
  const bookinfo = await tree.getItem(...appPath);
  const applyNode = await bookinfo.$(
    ".action-label[title='Apply New Manifest']"
  );
  await applyNode.click();

  const yamlPath = path.join(os.tmpdir(), "./config/yaml");

  assert(existsSync(yamlPath), "Yaml folder does not exist");

  await file.selectPath(yamlPath);

  return waitForMessage("Resource(Deployment) php created", 60 * 1000);
};

module.exports = {
  applyDeployment,
};
