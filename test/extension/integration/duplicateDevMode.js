const { tree } = require("../lib/components");
const logger = require("../lib/log");

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
  const duplicateDev = await authorsNode.$(
    ".action-label[title='Start DevMode(Duplicate)']"
  );
  await duplicateDev.click();

  logger.info("duplicate ");
}

module.exports = {
  startDev,
};
