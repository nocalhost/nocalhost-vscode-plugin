const { tree } = require("../lib/components");
const { waitForMessage } = require("./index");

const treeItemPath = [
  "",
  "default",
  "bookinfo",
  "Workloads",
  "Deployments",
  "ratings",
];

const resetPod = async () => {
  const ratings = await tree.getItem(...treeItemPath);
  const resetNode = await ratings.$(".action-label[title='Reset Pod']");

  await resetNode.click();
  return waitForMessage("reset service ratings", 60 * 1000);
};

module.exports = {
  resetPod,
};
