const { tree } = require("../lib/components");

const treeItemPath = [
  "",
  "default",
  "bookinfo",
  "Workloads",
  "Deployments",
  "ratings",
];

async function editConfig() {
  const ratings = tree.getItem(...treeItemPath);
  const setting = ratings.$(".action-label[title='Port Forward']");

  await setting.click();
}

module.exports = {
  editConfig,
};
