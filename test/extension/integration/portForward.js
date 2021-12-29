const puppeteer = require("puppeteer-core");
const { delay } = require("lodash");
const { getTreeView, checkPort } = require("./index");

/**
 *
 * @param {puppeteer.Page} page
 * @param {number} level
 * @param {string} name
 * @return {puppeteer.ElementHandle<Element>}
 */
async function getTreeItem(page, level, name) {
  await page.waitForSelector(
    `#workbench\\.parts\\.sidebar .monaco-list-row[aria-level='${level}']`
  );

  const treeView = await getTreeView(page);

  const treeItem = await Promise.all(
    treeView.map((item) =>
      item.evaluate(
        (el, level, name) =>
          el.getAttribute("aria-level") === level.toString() &&
          el.innerText === name,
        level,
        name
      )
    )
  ).then((results) => {
    return treeView.find((_, index) => results[index]);
  });

  const tl = await treeItem.$(".monaco-tl-twistie");

  await tl.click();

  return tl;
}
/**
 *
 * @param {puppeteer.Page} page
 * @param {string[]} childNames
 * @return {puppeteer.ElementHandle<Element>}
 */
async function getChild(page, ...childNames) {
  const treeView = await getTreeView(page);

  await treeView[0].click();

  let level = 1;
  let treeItem;

  for await (const name of childNames) {
    treeItem = await getTreeItem(page, ++level, name);
  }

  return treeItem;
}

/**
 *
 * @param {puppeteer.Page} page
 */
async function add(page) {
  const authors = await getChild(
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

  await page.keyboard.press("ControlLeft", { delay: 25 });
  await page.keyboard.press("Digit1", { delay: 25 });
  await page.keyboard.press("Enter");
  // await authors.press("ControlLeft");
  // await authors.press("Digit1");

  // await page.keyboard.press("ControlLeft");
  // await page.keyboard.press("Digit1");

  // await page.waitForTimeout(1_000);

  // await page.keyboard.up("ControlLeft");
  // await page.keyboard.up("Digit1");
}
module.exports = { add };
