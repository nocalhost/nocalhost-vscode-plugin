const puppeteer = require("puppeteer-core");

/**
 *
 * @param {number} level
 * @param {string} name
 * @return {puppeteer.ElementHandle<Element>}
 */
async function getTreeItem(level, name) {
  await page.waitForSelector(
    `#workbench\\.parts\\.sidebar .monaco-list-row[aria-level='${level}']`
  );

  const treeView = await page.$$(
    `#workbench\\.parts\\.sidebar .monaco-list-row[aria-level='${level}']`
  );

  let treeItem;
  if (level === 1 && !name) {
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

  if (!treeItem) {
    return null;
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
 * @param {string[]} childNames
 * @return {puppeteer.ElementHandle<Element>}
 */
async function getItem(...childNames) {
  let level = 0;
  let treeItem;

  for await (const name of childNames) {
    treeItem = await getTreeItem(++level, name);
  }

  if (!treeItem) {
    return null;
  }

  const parentNode = await treeItem.getProperty("parentNode");

  return parentNode;
}
/**
 *
 * @returns
 */
async function getChildren() {
  await page.waitForFunction(function () {
    return (
      document
        .querySelector("#workbench\\.parts\\.sidebar")
        ?.querySelectorAll(".monaco-list-row")?.length > 0
    );
  });

  const sidebar = await page.waitForSelector("#workbench\\.parts\\.sidebar");

  const treeView = await sidebar.$$(".monaco-list-row");

  return treeView;
}
module.exports = { getItem, getChildren };
