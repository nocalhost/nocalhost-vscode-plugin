const { tree, dialog, file } = require("../lib/components");
const logger = require("../lib/log");

const treeItemPath = [
  "",
  "default",
  "bookinfo",
  "Workloads",
  "Deployments",
  "ratings",
];
const start = async () => {
  const ratingsNode = await tree.getItem(...treeItemPath);
  const remoteRun = await ratingsNode.$(".action-label[title='Remote Run']");

  await remoteRun.click();
  logger.debug("remote run start");

  // if ((await dialog.getActionTexts()).includes("Open another directory")) {
  //   await dialog.selectAction("Open another directory");
  // } else {
  //   await dialog.selectAction("Open associated directory");
  // }

  // await file.selectPath(process.env.currentPath);
};

module.exports = {
  start,
};
