const puppeteer = require("puppeteer-core");
const retry = require("async-retry");
const isPortReachable = require("is-port-reachable");
const assert = require("assert");
const { start, getWebSocketDebuggerUrl } = require("../");
const logger = require("../lib/log");
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
 * @param {String} text
 * @return {puppeteer.ElementHandle<Element>[]}
 */
async function setInputBox(page, text) {
  await page.waitForTimeout(500);

  let input = await page.waitForSelector(".input.empty");

  await input.type(text);

  await page.keyboard.press("Enter");
}

/**
 *
 * @param {puppeteer.Page} page
 * @param {string} text
 */
async function selectQuickPickItem(page, text) {
  return (await getQuickPick(page)).select(text);
}

/**
 *
 * @param {puppeteer.Page} page
 */
async function getQuickPick(page) {
  await page.waitForSelector(".quick-input-list-entry");

  /**
   * @returns {Promise<Array<string>>}
   */
  async function getItemTexts() {
    return await Promise.all(
      (await this.items).map((item) => item.evaluate((el) => el.textContent))
    );
  }

  return {
    get items() {
      return page.$$(".quick-input-list-entry");
    },
    get itemTexts() {
      return getItemTexts.call(this);
    },
    /**
     *
     * @param {string|number} key
     */
    async select(key) {
      const items = await this.items;
      if (typeof key === "number") {
        await items[key].click();
      } else {
        const itemText = await this.itemTexts;
        const index = itemText.findIndex((name) => name === key);

        await items[index].click();
      }

      await page.waitForTimeout(500);
    },
  };
}

/**
 *
 * @param {puppeteer.Page} page
 * @param {string} message
 * @param {number} timeout
 */
async function waitForMessage(page, message, timeout) {
  await page.waitForSelector(".notifications-toasts");

  return await page.waitForFunction(
    `document.querySelector(".notifications-toasts").innerText.includes("${message}")`,
    { timeout }
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

  let treeItem;
  if (level === 1) {
    treeItem = treeView[0];
  } else {
    treeItem = await Promise.all(
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
async function getTreeItemByChildName(page, ...childNames) {
  let level = 0;
  let treeItem;

  for await (const name of childNames) {
    treeItem = await getTreeItem(page, ++level, name);
  }

  return treeItem;
}

/**
 *
 * @param {puppeteer.Page} page
 * @param {string[]} childNames
 */
async function getItemMenu(page, menuName) {
  const context = await page.waitForSelector(
    ".context-view.monaco-menu-container.bottom.left"
  );

  const selector = `.action-label[aria-label='${menuName}']`;

  return {
    /**
     * @return {puppeteer.ElementHandle<Element>}
     */
    get el() {
      return context
        .$(selector)
        .then((el) => el.getProperty("parentNode"))
        .then((el) => el.getProperty("parentNode"));
    },
    async click() {
      return (await this.el).evaluate((node) => {
        window.el = node;
        console.error("evaluate", node);

        const mouseEvents = document.createEvent("MouseEvents");
        mouseEvents.initEvent("mouseup", true, true);
        node.dispatchEvent(mouseEvents);
      });
    },
  };
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
    `!document.querySelector(".monaco-list-rows").innerText.includes("${name}")`,
    { timeout: 1 * 60 * 1000 }
  );
}

/**
 *
 * @param {string} name
 * @param {puppeteer.Page} page
 */
async function isInstallSucceed(page, name) {
  const app = await page.waitForFunction(
    function (text) {
      let list =
        document
          .querySelector("#workbench\\.parts\\.sidebar")
          ?.querySelectorAll(".monaco-list-row") ?? [];

      if (list.length) {
        return Array.from(list).some((node) => {
          if (node.textContent === text) {
            const icon = node.querySelector(".custom-view-tree-node-item-icon");

            if (icon) {
              return icon.getAttribute("style").includes("app_connected.svg");
            }
          }
          return false;
        });
      }

      return false;
    },
    { timeout: 5 * 60 * 1000 },
    name
  );

  return app;
}
/**
 *
 * @param {string} name
 * @param {puppeteer.Page} page
 */
async function getInstallApp(page, name) {
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
    retries: 3,
  });

  const browser = await puppeteer.connect({
    browserWSEndpoint,
    defaultViewport: null,
  });

  const page = await retry(() => getPage(browser), { retries: 3 });

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
 * @param {object} data
 */
async function checkPort(
  port,
  data = {
    timeout: 1_000,
    error: "checkPort Error",
    condition: (connect) => connect,
    retryOptions: { randomize: false, retries: 6 },
  }
) {
  await retry(async () => {
    const connect = await isPortReachable(port, {
      host: "127.0.0.1",
      timeout: data.timeout,
    });

    assert(data.condition(connect), data.error);
  }, data.retryOptions);
}

module.exports = {
  openNocalhost,
  getPage,
  waitForMessage,
  getTreeView,
  getInstallApp,
  unInstall,
  isInstallSucceed,
  initialize,
  setInputBox,
  selectQuickPickItem,
  getQuickPick,
  checkPort,
  getTreeItemByChildName,
  getItemMenu,
};
