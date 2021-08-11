const puppeteer = require("puppeteer-core");
const retry = require("async-retry");
const isPortReachable = require("is-port-reachable");
const assert = require("assert");
const { start } = require("../");
/**
 *
 * @param {puppeteer.Page} page
 */
async function openNocalhost(page) {
  const activitybar = await page.waitForSelector(
    "#workbench\\.parts\\.activitybar [aria-label='Nocalhost']"
  );

  const expanded = await activitybar.evaluate((el) =>
    el.parentElement.getAttribute("aria-expanded")
  );

  if (expanded === "false") {
    await activitybar.click();
  }
}

/**
 *
 * @param {puppeteer.Page} page
 * @return {puppeteer.ElementHandle<Element>[]}
 */
async function getButtons(page) {
  return await (await page.waitForSelector(".dialog-buttons")).$$(":scope > *");
}

/**
 *
 * @param {puppeteer.Page} page
 * @param {String} text
 * @return {puppeteer.ElementHandle<Element>[]}
 */
async function setInputBox(page, text) {
  let input = await page.waitForSelector(".input.empty");

  await input.type(text);

  await page.keyboard.press("Enter");
}

/**
 *
 * @param {puppeteer.Page} page
 * @param {String} text
 */
async function quickPick(page, text) {
  await page.waitForSelector(".quick-input-list-entry");

  const list = await page.$$(".quick-input-list-entry");

  const nameList = await Promise.all(
    list.map((item) => item.evaluate((el) => el.textContent))
  );

  const index = nameList.findIndex((name) => name === text);

  await list[index].click();
}

/**
 *
 * @param {puppeteer.Page} page
 */
async function waitForMessage(page, message) {
  await page.waitForSelector(".notifications-toasts");

  return await page.waitForFunction(
    `document.querySelector(".notifications-toasts").innerText.includes("${message}")`
  );
}
/**
 *
 * @param {puppeteer.Page} page
 * @return {puppeteer.ElementHandle<Element>[]}
 */
async function getTreeView(page) {
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
/**
 *
 * @param {puppeteer.ElementHandle<Element>} node
 * @param {puppeteer.Page} page
 */
async function unInstall(page, node, name) {
  await node.hover();
  await page.click(".codicon-trash");

  await setInputBox(page, "OK");

  await page.waitForFunction(
    `!document.querySelector(".monaco-list-rows").innerText.includes("${name}")`
  );
}

/**
 *
 * @param {string} name
 * @param {puppeteer.Page} page
 */
async function isInstallSucceed(page, name) {
  const app = await page.waitForFunction(function (text) {

    let list = document
      .querySelector("#workbench\\.parts\\.sidebar")
      ?.querySelectorAll(".monaco-list-row") ?? [];

    if (list.length) {
      return Array.from(list).some(node => {
        if (node.textContent === text) {
          const icon = node.querySelector(".custom-view-tree-node-item-icon");

          if (icon) {
            return icon.getAttribute("style").includes("app-connected.svg")
          }
        }
        return false;
      });
    }

    return false;
  }, {}, name);

  return app;
}
/**
 *
 * @param {string} name
 * @param {puppeteer.Page} page
 */
async function getInstallApp(page, name) {
  await page.waitForFunction(() => {
    const { innerText } = document.querySelector(".monaco-list-rows");
    return innerText.endsWith("default") || innerText.startsWith("default");
  });

  const nameList = await page.evaluate(() => {
    return Array.from(document.querySelector(".monaco-list-rows").children).map(
      (item) => item.innerText
    );
  });

  const index = nameList.indexOf(name);

  if (index > -1) {
    return (await getTreeView(page))[index];
  }

  return null;
}
/**
 *
 * @returns {puppeteer.Page}
 */
async function initialize() {
  const { pid, port } = await start();

  const browserWSEndpoint = await retry(() => getWebSocketDebuggerUrl(port), {
    maxRetryTime: 10 * 1000,
  });

  const browser = await puppeteer.connect({
    browserWSEndpoint,
    defaultViewport: null,
  });

  const page = await retry(() => getPage(browser), { maxRetryTime: 10 * 1000 });

  await openNocalhost(page);

  return page;
}
/**
 *
 * @param {puppeteer.Browser} browser
 */
const getPage = async (browser) => {
  const pages = await browser.pages();
  const index = pages.findIndex((page) =>
    page.url().endsWith("workbench.html")
  );
  const page = pages[index];

  assert.ok(page);

  return page;
};

/**
 *
 * @param {string} port
 * @param {number} timeout
 */
async function checkPort(port) {
  return await retry(
    () =>
      new Promise((res, rej) => {
        const connect = isPortReachable(port, {
          host: "127.0.0.1",
          timeout: 1 * 1000,
        });
        if (connect) {
          res(true);
          return;
        }
        rej();
      }),
    { maxRetryTime: 30 * 1000 }
  );
}

module.exports = {
  openNocalhost,
  getPage,
  waitForMessage,
  getTreeView,
  getInstallApp,
  unInstall,
  getButtons,
  isInstallSucceed,
  initialize,
  setInputBox,
  quickPick,
  checkPort,
};
