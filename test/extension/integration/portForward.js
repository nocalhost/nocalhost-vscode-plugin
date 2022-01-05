const assert = require("assert");
const getPort = require("get-port");
const retry = require("async-retry");

const { getQuickPick, checkPort, setInputBox } = require("./index");
const { dialog, tree } = require("../lib/components");

const treeItemPath = [
  "",
  "default",
  "bookinfo",
  "Workloads",
  "Deployments",
  "ratings",
];

let port = -1;

function getPortForwardPort() {
  return port;
}

async function waitingReading() {
  await retry(
    async () => {
      const bookinfo = await tree.getItem(...treeItemPath);

      assert(bookinfo);

      const icon = await bookinfo.$(
        `.custom-view-tree-node-item-icon[style$='status_running.svg");']`
      );

      assert(icon);
    },
    { retries: 9 }
  );
}

async function add() {
  await waitingReading();

  const treeItem = await tree.getItem(...treeItemPath);

  const portForward = await treeItem.$(".action-label[title='Port Forward']");
  await portForward.click();

  let quickPick = getQuickPick();

  await quickPick.select(" Add port forward");

  port = await getPort();

  await setInputBox(`${port}:9080`);

  await checkPort(port);

  return port;
}

async function list() {
  const treeItem = await tree.getItem(...treeItemPath);

  const portForward = await treeItem.$(".action-label[title='Port Forward']");
  await portForward.click();

  const itemTexts = await (await getQuickPick()).itemTexts;

  assert(itemTexts.includes(`${port}:9080`));
}

/**
 *
 */
async function stop() {
  const quickPick = await getQuickPick();

  await quickPick.select(`${port}:9080`);

  await dialog.selectAction("Confirm");

  await checkPort(port, { condition: (connect) => !connect });
}

module.exports = { add, list, stop, getPortForwardPort };
