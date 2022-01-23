const { tree, dialog, file } = require("../lib/components");
const logger = require("../lib/log");
const { checkSyncCompletion } = require("./devMode");

const treeItemPath = [
  "",
  "default",
  "bookinfo",
  "Workloads",
  "Deployments",
  "ratings",
];

async function startDev() {
  const ratingsNode = await tree.getItem(...treeItemPath);
  const duplicateDev = await ratingsNode.$(
    ".action-label[title='Start DevMode(Duplicate)']"
  );
  await duplicateDev.click();

  logger.info("duplicate start");
  if ((await dialog.getActionTexts()).includes("Open another directory")) {
    await dialog.selectAction("Open another directory");
  } else {
    await dialog.selectAction("Open associated directory");
  }

  await file.selectPath(process.env.currentPath);
}

async function startDuplicateComplete() {
  await page.waitForFunction(
    (name) => {
      const nodes = Array.from(
        document.querySelectorAll(
          "#workbench\\.parts\\.sidebar .monaco-list-row[aria-level='6']"
        )
      );

      const node = nodes.find(
        (node) => node.querySelector(".label-name").innerText === name
      );
      if (!node) {
        return;
      }

      node.click();

      const isDevStart = !!node.querySelector(
        `.custom-view-tree-node-item-icon[style$='dev_copy.svg");']`
      );

      const isDevEnd = !!node.querySelector(
        `.actions [style$='dev_end.svg");']`
      );

      return isDevStart && isDevEnd;
    },
    { timeout: 300_000 },
    "ratings"
  );

  await checkSyncCompletion();

  logger.debug("Start Duplicate Development", "ok");
}

module.exports = {
  startDev,
  startDuplicateComplete,
};
