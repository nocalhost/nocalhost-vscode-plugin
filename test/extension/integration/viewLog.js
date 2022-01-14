const { tree } = require("../lib/components");

const treeItemPath = [
  "",
  "default",
  "bookinfo",
  "Workloads",
  "Deployments",
  "ratings",
];

async function viewLog() {
  const ratings = await tree.getItem(...treeItemPath);
  const log = await ratings.$(".action-label[title='View Logs']");
  await log.click();
}

module.exports = {
  viewLog,
};
