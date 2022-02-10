const { tree, file } = require("../lib/components");
const path = require("path");
const os = require("os");
const { waitForMessage } = require("./index");

const appPath = ["", "default", "bookinfo"];

const applyDeployment = async () => {
  const bookinfo = await tree.getItem(...appPath);
  const applyNode = await bookinfo.$(
    ".action-label[title='Apply New Manifest']"
  );
  await applyNode.click();
  await file.selectPath(path.join(os.tmpdir(), "./config/yaml"));

  return waitForMessage("Resource(Deployment) php created", 60 * 1000);
};

module.exports = {
  applyDeployment,
};
