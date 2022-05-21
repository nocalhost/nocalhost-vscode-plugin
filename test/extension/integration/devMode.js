const assert = require("assert");
const { default: Axios } = require("axios");
const retry = require("async-retry");

const { tree, terminal, dialog, file, keyboard } = require("../lib/components");
const logger = require("../lib/log");
const { initialize, setInputBox } = require("./index");
const { add, stop, getPortForwardPort } = require("./portForward");

const { enterShortcutKeys } = keyboard;

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
 * @description
 */
async function checkStartComplete() {
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

  await checkSyncCompletion();

  logger.debug("Start Development", "ok");
}
/**
 *
 */
async function checkSyncCompletion() {
  const statusBar = await page.$("#nocalhost\\.nocalhost");

  await retry(
    async () => {
      const className = await (
        await statusBar.$(".codicon")
      ).evaluate((el) => el.className);

      assert(className.includes("codicon-check"));
    },
    { retries: 4 }
  );

  logger.debug("sync icon");

  const textContent = await statusBar.evaluate((el) => el.textContent);

  assert(textContent.includes("Sync completed at:"));

  logger.debug("sync completed");
}
/**
 *
 * @description
 */
async function runCommand() {
  await terminal.sendText(
    "npm config set registry http://mirrors.cloud.tencent.com/npm/ \n"
  );

  await terminal.sendText("./run.sh \n");

  const port = await add();
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
 * @description
 */
async function start() {
  const treeItem = await tree.getItem(...treeItemPath);

  const action = await treeItem.$(
    `a.action-label.icon[title="Start Development"]`
  );
  await action.click();

  logger.debug("Start Development");

  if ((await dialog.getActionTexts()).includes("Open another directory")) {
    await dialog.selectAction("Open another directory");
  } else {
    await dialog.selectAction("Open associated directory");
  }

  await file.selectPath(process.env.currentPath);
}

/**
 *
 * @description
 */
async function codeSync() {
  await enterShortcutKeys("MetaLeft", "p");

  await setInputBox("ratings.js");

  await page.waitForTimeout(5_00);
  await enterShortcutKeys("ControlLeft", "g");

  await setInputBox("207:9");

  await enterShortcutKeys("MetaLeft", "x");

  await page.keyboard.press("Backspace");
  await page.keyboard.type(
    `\n\tres.end(JSON.stringify({status: 'Ratings is healthy2'}))\n`
  );

  await enterShortcutKeys("MetaLeft", "s");

  await page.waitForTimeout(10_000);

  await checkSyncCompletion();

  // await terminal.typeCtrlC();

  // await terminal.sendText("./run.sh \n");

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

async function endDevMode() {
  let treeItem = await tree.getItem(...treeItemPath);

  const portForward = await treeItem.$(".action-label[title='Port Forward']");
  await portForward.click();

  await stop();

  treeItem = await tree.getItem(...treeItemPath);

  const endDevelop = await treeItem.$(".action-label[title='End Develop']");
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

module.exports = {
  start,
  codeSync,
  checkStartComplete,
  checkSyncCompletion,
  endDevMode,
  runCommand,
};

(async () => {
  if (require.main === module) {
    await initialize(55205, codeSync);
  }
})();
