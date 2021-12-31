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

  await setInputBox(page, process.env.currentPath);
  // check icon devicon endbutton
  // check sync

  // terminal
  // close
  //
}

/**
 *
 * @param {puppeteer.Page} page
 * @description
 */
async function codeSync(page) {
  // modify code
  // check sync
  //icon、time
  //exec remote shell cat file content
}
module.exports = { start, codeSync };
