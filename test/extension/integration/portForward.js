const puppeteer = require("puppeteer-core");
const { getTreeItemByChildName, checkPort, getItemMenu } = require("./index");

/**
 *
 * @param {puppeteer.Page} page
 */
async function add(page) {
  const authors = await getTreeItemByChildName(
    page,
    "default",
    "bookinfo",
    "Workloads",
    "Deployments",
    "authors"
  );

  await authors.click({
    button: "right",
  });

  const action = await getItemMenu(page, "Port Forward");
  await action.click();

  await page.waitForTimeout(10_000);
}
module.exports = { add };
