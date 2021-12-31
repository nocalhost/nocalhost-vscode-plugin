const assert = require("assert");
const { default: Axios } = require("axios");
const puppeteer = require("puppeteer-core");

const logger = require("../lib/log");
const { getTreeItemByChildName, initialize } = require("./index");
const { add, stop } = require("./portForward");

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
async function start(page) {
  const treeItem = await getTreeItemByChildName(page, ...treeItemPath);

  // const action = await (await treeItem.getProperty("parentNode")).$(
  //   `a.action-label.icon[title="Start Development"]`
  // );
  // await action.click();

  logger.debug("Start Development");

  // await setInputBox(page, "Open associated directory");

  // await setInputBox(page, process.env.currentPath);

  // check icon devicon endbutton
  await page.waitForFunction(() => {
    const nodes = Array.from(
      document.querySelectorAll(
        "#workbench\\.parts\\.sidebar .monaco-list-row[aria-level='6']"
      )
    );

    const node = nodes.find(
      (node) => node.querySelector(".label-name").innerText === "ratings"
    );
    if (!node) {
      return;
    }

    node.click();

    const isDevStart = !!node.querySelector(`[style$='v_start.svg");']`);

    const isDevEnd = !!node.querySelector(`[style$='dev_end.svg");']`);

    console.warn(isDevStart, isDevEnd);

    return isDevStart && isDevEnd;
  }, treeItem);

  logger.debug("Start Development", "ok");

  // check sync

  const statusBar = await page.$("#nocalhost\\.nocalhost");

  const className = await (await statusBar.$(".codicon")).evaluate(
    (el) => el.className
  );

  assert(className.includes("codicon-check"));

  logger.debug("sync icon");

  const textContent = await statusBar.evaluate((el) => el.textContent);

  assert(textContent.includes("Sync completed at:"));

  logger.debug("sync completed");

  // terminal
  await page.waitForTimeout(1_000);
  await page.type(".xterm-screen", "./run.sh \n");

  // start port forward
  await page.waitForTimeout(1_000);

  const port = await add(page);
  logger.debug("start port forward");

  const data = await Axios.get(`http://127.0.0.1:${port}/health`);

  assert("status" in data.data && data.data.status === "Ratings is healthy");

  logger.debug("check health");

  // close
  await page.type(".xterm-screen", " \x03");

  const portForward = await (await treeItem.getProperty("parentNode")).$(
    ".action-label[title='Port Forward']"
  );
  await portForward.click();

  await stop(page);
}

/**
 *
 * @param {puppeteer.Page} page
 * @description
 */
async function codeSync(page) {
  // modify code
  // check sync
  //icon、time
  //exec remote shell cat file content
}
module.exports = { start, codeSync };

(async () => {
  if (require.main === module) {
    const port = null;

    const { page, browser, port: newPort } = await initialize(port);

    await start(page);

    port && browser.disconnect();
  }
})();
