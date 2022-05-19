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
 * @param {String} text
 * @return {puppeteer.ElementHandle<Element>[]}
 */
async function setInputBox(text, clean = false) {
  let input = await page.waitForSelector(
    ".quick-input-widget:not([style*='display: none']) .input"
  );

  if (clean) {
    await input.evaluate((input) => (input.value = ""), input);
  }

  await input.click();
  await input.type(text, { delay: 1 });

  await page.keyboard.press("Enter");

  await page.waitForTimeout(5_00);
}

/**
 *
 * @param {string} text
 */
async function selectQuickPickItem(text) {
  return getQuickPick().select(text);
}

/**
 *
 */
function getQuickPick() {
  /**
   * @returns {Promise<Array<string>>}
   */
  async function getItemTexts() {
    return await Promise.all(
      (
        await this.items
      ).map((item) =>
        item.evaluate((el) => el.querySelector(".label-name").textContent)
      )
    );
  }

  /**
   *
   * @returns {Promise<Array<puppeteer.ElementHandle<Element>>}
   */
  async function getItems() {
    await page.waitForSelector(
      ".quick-input-widget:not([style*='display: none']) .quick-input-list-entry"
    );
    return page.$$(".quick-input-list-entry");
  }
  return {
    get items() {
      return getItems();
    },
    /**
     * @returns {Promise<Array<string>>}
     */
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

      await page.waitForTimeout(1_000);
    },
  };
}

/**
 *
 * @param {string} message
 * @param {number} timeout
 */
async function waitForMessage(message, timeout) {
  await page.waitForSelector(".notifications-toasts");

  return await page.waitForFunction(
    `document.querySelector(".notifications-toasts").innerText.includes("${message}")`,
    { timeout }
  );
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
 * @param {string} port
 * @param {()=>Promise<void>} callBack
 */
async function initialize(port, callBack) {
  let isStart = !port;

  let startPort = port;

  if (!port) {
    const { port: newPort } = await start({
      testsEnv: {
        puppeteer: true,
      },
    });
    startPort = newPort;
  }

  const browserWSEndpoint = await retry(
    () => getWebSocketDebuggerUrl(startPort),
    {
      retries: 3,
    }
  );

  const browser = await puppeteer.connect({
    browserWSEndpoint,
    defaultViewport: null,
  });

  const page = await retry(() => getPage(browser), { retries: 3 });

  await openNocalhost(page);

  if (isStart) {
    return;
  }

  global.page = page;

  await callBack();

  newPort && browser.disconnect();
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
  initialize,
  setInputBox,
  selectQuickPickItem,
  getQuickPick,
  checkPort,
  getItemMenu,
};
