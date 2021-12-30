const puppeteer = require("puppeteer-core");
const { getTreeItemByChildName, setInputBox } = require("./index");

const treeItemPath = [
  "",
  "default",
  "bookinfo",
  "Workloads",
  "Deployments",
  "ratings",
];

/**
 *
 * @param {puppeteer.Page} page
 * @description
 */
async function start(page) {
  const treeItem = await getTreeItemByChildName(page, ...treeItemPath);

  const action = await (await treeItem.getProperty("parentNode")).$(
    `a.action-label.icon[title="Start Development"]`
  );
  await action.click();

  await setInputBox(page, "Open associated directory");

  // await setInputBox(page, process.env.tmpDir);
}

module.exports = { start };
