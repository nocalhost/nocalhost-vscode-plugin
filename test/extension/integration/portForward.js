const assert = require("assert");
const puppeteer = require("puppeteer-core");
const getPort = require("get-port");

const {
  getTreeItemByChildName,
  getQuickPick,
  checkPort,
  setInputBox,
} = require("./index");
const { selectAction } = require("../lib/components/dialog");

const treeItemPath = [
  "",
  "default",
  "bookinfo",
  "Workloads",
  "Deployments",
  "ratings",
];

let port = -1;

function getPortForwardPort() {
  return port;
}
/**
 *
 * @param {puppeteer.Page} page
 * @description
 */
async function add(page) {
  const treeItem = await getTreeItemByChildName(page, ...treeItemPath);

  const portForward = await (await treeItem.getProperty("parentNode")).$(
    ".action-label[title='Port Forward']"
  );
  await portForward.click();

  let quickPick = getQuickPick(page);

  // assert((await quickPick.itemTexts).includes(" Add port forward"));

  await page.waitForTimeout(1_000);

  await quickPick.select(" Add port forward");

  await page.waitForTimeout(1_000);

  port = await getPort();

  // await quickPick.select(0);

  await setInputBox(page, `${port}:9080`);

  await checkPort(port);

  return port;
}

/**
 *
 * @param {puppeteer.Page} page
 */
async function list(page) {
  const treeItem = await getTreeItemByChildName(page, ...treeItemPath);

  const portForward = await (await treeItem.getProperty("parentNode")).$(
    ".action-label[title='Port Forward']"
  );
  await portForward.click();

  const itemTexts = await (await getQuickPick(page)).itemTexts;

  assert(itemTexts.includes(`${port}:9080LISTEN`));
}

/**
 *
 * @param {puppeteer.Page} page
 */
async function stop(page) {
  const quickPick = await getQuickPick(page);

  await quickPick.select(`${port}:9080`);

  await selectAction(page, "Confirm");

  await checkPort(port, { condition: (connect) => !connect });
}

module.exports = { add, list, stop, getPortForwardPort };
