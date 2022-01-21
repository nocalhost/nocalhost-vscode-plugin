const { tree } = require("../lib/components");

const treeItemPath = [
  "",
  "default",
  "bookinfo",
  "Workloads",
  "Deployments",
  "authors",
];

async function startDev() {
  const authorsNode = await tree.getItem(...treeItemPath);
}

module.exports = {
  startDev,
};
