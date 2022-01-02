const assert = require("assert");
const { default: Axios } = require("axios");
const retry = require("async-retry");
const puppeteer = require("puppeteer-core");
const { typeTerminal } = require("../lib/components/terminal");

const logger = require("../lib/log");
const {
  getTreeItemByChildName,
  initialize,
  enterShortcutKeys,
  setInputBox,
} = require("./index");
const { add, stop, getPortForwardPort } = require("./portForward");

const treeItemPath = [
  "",
  "default",
  "bookinfo",
  "Workloads",
  "Deployments",
  "ratings",
];

/**
 *
 * @param {puppeteer.Page} page
 * @description
 */
async function checkIcon(page) {
  // check icon devIcon endButton
  await page.waitForFunction(
    (name) => {
      const nodes = Array.from(
        document.querySelectorAll(
          "#workbench\\.parts\\.sidebar .monaco-list-row[aria-level='6']"
        )
      );

      const node = nodes.find(
        (node) => node.querySelector(".label-name").innerText === name
      );
      if (!node) {
        return;
      }

      node.click();

      const isDevStart = !!node.querySelector(
        `.custom-view-tree-node-item-icon[style$='v_start.svg");']`
      );

      const isDevEnd = !!node.querySelector(
        `.actions [style$='dev_end.svg");']`
      );

      return isDevStart && isDevEnd;
    },
    { timeout: 300_000 },
    "ratings"
  );

  await checkSync(page);

  logger.debug("Start Development", "ok");
}
/**
 *
 * @param {puppeteer.Page} page
 */
async function checkSync(page) {
  const statusBar = await page.$("#nocalhost\\.nocalhost");

  await retry(
    async () => {
      const className = await (await statusBar.$(".codicon")).evaluate(
        (el) => el.className
      );

      assert(className.includes("codicon-check"));
    },
    { retries: 3 }
  );

  logger.debug("sync icon");

  const textContent = await statusBar.evaluate((el) => el.textContent);

  assert(textContent.includes("Sync completed at:"));

  logger.debug("sync completed");
}
/**
 *
 * @param {puppeteer.Page} page
 * @description
 */
async function checkRun(page) {
  await typeTerminal(page, "./run.sh \n");

  const port = await add(page);
  logger.debug("start port forward");

  await retry(
    async () => {
      const data = await Axios.get(`http://127.0.0.1:${port}/health`);

      assert(
        "status" in data.data && data.data.status === "Ratings is healthy"
      );
    },
    { retries: 3 }
  );

  logger.debug("check health");
}
/**
 *
 * @param {puppeteer.Page} page
 * @description
 */
async function start(page) {
  const treeItem = await getTreeItemByChildName(page, ...treeItemPath);

  const action = await (await treeItem.getProperty("parentNode")).$(
    `a.action-label.icon[title="Start Development"]`
  );
  await action.click();

  logger.debug("Start Development");

  // await setInputBox(page, "Open associated directory");

  // await setInputBox(page, process.env.currentPath);

  await checkIcon(page);

  await checkRun(page);

  await codeSync(page);

  await endDevMode(page);
}

/**
 *
 * @param {puppeteer.Page} page
 * @description
 */
async function codeSync(page) {
  // modify code
  await enterShortcutKeys(page, "MetaLeft", "p");

  await setInputBox(page, "ratings.js");

  await page.waitForTimeout(5_00);
  await enterShortcutKeys(page, "ControlLeft", "g");

  await setInputBox(page, "207:9");

  await enterShortcutKeys(page, "MetaLeft", "x");

  await page.keyboard.press("Backspace");
  await page.keyboard.type(
    `\n\tres.end(JSON.stringify({status: 'Ratings is healthy2'}))\n`
  );

  await enterShortcutKeys(page, "MetaLeft", "s");

  await page.waitForTimeout(10_000);

  await checkSync(page);

  await typeTerminal(page, "\x03");

  await typeTerminal(page, "./run.sh \n");

  await retry(
    async () => {
      const data = await Axios.get(
        `http://127.0.0.1:${getPortForwardPort()}/health`
      );

      assert(
        "status" in data.data && data.data.status === "Ratings is healthy2"
      );
    },
    { retries: 3 }
  );
}

/**
 *
 * @param {puppeteer.Page} page
 * @description
 */
async function endDevMode(page) {
  let treeItem = await getTreeItemByChildName(page, ...treeItemPath);

  const portForward = await (await treeItem.getProperty("parentNode")).$(
    ".action-label[title='Port Forward']"
  );
  await portForward.click();

  await stop(page);

  treeItem = await getTreeItemByChildName(page, ...treeItemPath);

  const endDevelop = await (await treeItem.getProperty("parentNode")).$(
    ".action-label[title='End Develop']"
  );
  await endDevelop.click();

  await page.waitForFunction(
    (name) => {
      const nodes = Array.from(
        document.querySelectorAll(
          "#workbench\\.parts\\.sidebar .monaco-list-row[aria-level='6']"
        )
      );

      const node = nodes.find(
        (node) => node.querySelector(".label-name").innerText === name
      );
      if (!node) {
        return;
      }

      node.click();

      const isDevStart = !!node.querySelector(
        `.custom-view-tree-node-item-icon[style$='status_running.svg");']`
      );

      const isDevEnd = !!node.querySelector(
        `.actions [style$='v_start.svg");']`
      );

      return isDevStart && isDevEnd;
    },
    { timeout: 300_000 },
    "ratings"
  );
}

module.exports = { start, codeSync };

(async () => {
  if (require.main === module) {
    const port = 49617;

    const { page, browser, port: newPort } = await initialize(port);

    if (!port) {
      return;
    }

    await start(page);

    port && browser.disconnect();
  }
})();
