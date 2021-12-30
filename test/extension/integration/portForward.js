const assert = require("assert");
const puppeteer = require("puppeteer-core");
const getPort = require("get-port");

const {
  getTreeItemByChildName,
  getQuickPick,
  checkPort,
  setInputBox,
} = require("./index");

const productPagePath = [
  "",
  "default",
  "bookinfo",
  "Workloads",
  "Deployments",
  "productpage",
];

let port = -1;

/**
 *
 * @param {puppeteer.Page} page
 * @description
 */
async function add(page) {
  const treeItem = await getTreeItemByChildName(page, ...productPagePath);

  await treeItem.hover();

  const portForward = await (await treeItem.getProperty("parentNode")).$(
    ".action-label[title='Port Forward']"
  );
  await portForward.click();

  let quickPick = await getQuickPick(page);

  assert((await quickPick.itemTexts).includes(" Add port forward"));

  await quickPick.select(" Add port forward");

  await page.waitForTimeout(500);
  await quickPick.select(0);

  port = await getPort();

  await setInputBox(page, `${port}:9080`);

  await checkPort(port);
}

/**
 *
 * @param {puppeteer.Page} page
 */
async function list(page) {
  const treeItem = await getTreeItemByChildName(page, ...productPagePath);

  await treeItem.hover();

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

  await quickPick.select(`${port}:9080LISTEN`);

  await setInputBox(page, "Confirm");

  await checkPort(port, { condition: (connect) => !connect });
}

module.exports = { add, list, stop };
