const { tree } = require("../lib/components");
const assert = require("assert");

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

  const top = await page.waitForSelector(".webview.ready");
  const topFrame = await top.contentFrame();
  const child = await topFrame.waitForSelector("#active-frame");
  const iframe = await child.contentFrame();
  const logEle = await iframe.$$('div[data-testid="logs"]');
  assert(logEle);
}

module.exports = {
  viewLog,
};
