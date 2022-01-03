const puppeteer = require("puppeteer-core");
const retry = require("async-retry");
const isPortReachable = require("is-port-reachable");
const assert = require("assert");

const { start, getWebSocketDebuggerUrl } = require("../");
const logger = require("../lib/log");
const { dialog } = require("../lib/components");
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
async function setInputBox(page, text, clean = false) {
  let input = await page.waitForSelector(".quick-input-widget .input");

  if (clean) {
    await input.evaluate((input) => (input.value = ""), input);
  }

  await input.click();
  await input.type(text, { delay: 1 });

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
function getQuickPick(page) {
  /**
   * @returns {Promise<Array<string>>}
   */
  async function getItemTexts() {
    return await Promise.all(
      (await this.items).map((item) =>
        item.evaluate((el) => el.querySelector(".label-name").textContent)
      )
    );
  }

  /**
   *
   * @returns {Promise<Array<puppeteer.ElementHandle<Element>>}
   */
  async function getItems() {
    await page.waitForSelector(".quick-input-list-entry");
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
      await page.waitForTimeout(3_000);

      const items = await this.items;
      if (typeof key === "number") {
        await items[key].click();
      } else {
        const itemText = await this.itemTexts;
        const index = itemText.findIndex((name) => name === key);

        await items[index].click();
      }
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
 * @returns {{
 *      page:puppeteer.Page,browser:puppeteer.Browser
 * }}
 */
async function initialize(port) {
  if (!port) {
    const { port: startPort } = await start({
      testsEnv: {
        puppeteer: true,
      },
    });
    port = startPort;
  }

  const browserWSEndpoint = await retry(() => getWebSocketDebuggerUrl(port), {
    retries: 3,
  });

  const browser = await puppeteer.connect({
    browserWSEndpoint,
    defaultViewport: null,
  });

  const page = await retry(() => getPage(browser), { retries: 3 });

  await openNocalhost(page);

  return { browser, page, port };
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

/**
 *
 * @param {puppeteer.Page} page
 * @param  {Array<puppeteer.KeyInput>} keys
 */
async function enterShortcutKeys(page, ...keys) {
  for await (const key of keys) {
    await page.keyboard.down(key);
  }

  for await (const key of keys) {
    await page.keyboard.up(key);
  }

  await page.waitForTimeout(5_00);
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
  enterShortcutKeys,
};
