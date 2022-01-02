const puppeteer = require("puppeteer-core");

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

  const treeView = await page.$$(
    `#workbench\\.parts\\.sidebar .monaco-list-row[aria-level='${level}']`
  );

  let treeItem;
  if (level === 1) {
    treeItem = treeView[0];
  } else {
    treeItem = await Promise.all(
      treeView.map((item) =>
        item.evaluate(
          (el, level, name) =>
            el.getAttribute("aria-level") === level.toString() &&
            el.querySelector(".label-name").innerText === name,
          level,
          name
        )
      )
    ).then((results) => {
      return treeView.find((_, index) => results[index]);
    });
  }

  const tl = await treeItem.$(".monaco-tl-twistie");

  const className = await tl.evaluate((el) => el.getAttribute("class"));
  if (className.includes("collapsed")) {
    await tl.click();
  }

  await tl.hover();

  return tl;
}

/**
 *
 * @param {puppeteer.Page} page
 * @param {string[]} childNames
 * @return {puppeteer.ElementHandle<Element>}
 */
async function getItem(page, ...childNames) {
  let level = 0;
  let treeItem;

  for await (const name of childNames) {
    treeItem = await getTreeItem(page, ++level, name);
  }
  const parentNode = await treeItem.getProperty("parentNode");

  return parentNode;
}

module.exports = { getItem };
