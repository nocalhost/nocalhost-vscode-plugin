const robot = require("robotjs");
const { expandTree } = require("./tree");

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
}

module.exports = {
  viewLog,
};
