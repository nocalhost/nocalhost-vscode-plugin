const robot = require("robotjs");
const { expandTree } = require("./tree");
const assert = require("assert");
/**
 *
 * @param {puppeteer.Page} page
 */
async function viewLog(page) {
  const authors = await expandTree(page);

  // view log
  await page.waitForTimeout(1000);
  await authors.click();
  await authors.click({ button: "right" });
  await page.waitForTimeout(3000);
  for (i = 0; i < 6; i++) {
    // await page.keyboard.press("ArrowDown");
    // await page.waitForTimeout(200);
    robot.keyTap("down");
    robot.setKeyboardDelay(300);
  }
  // await page.keyboard.press("Enter");
  robot.keyTap("enter");

  await page.waitForTimeout(6000);
  const top = await page.waitForSelector(".webview.ready");
  const topFrame = await top.contentFrame();
  const child = await topFrame.waitForSelector("#active-frame");
  const iframe = await child.contentFrame();
  const logEle = await iframe.$$('div[data-testid="logs"]');
  assert.ok(logEle);
}

module.exports = {
  viewLog,
};
