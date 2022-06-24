const assert = require("assert");
const retry = require("async-retry");
const { default: Axios } = require("axios");

const { tree, keyboard, dialog, file } = require("../lib/components");
const logger = require("../lib/log");
const { add, stop, getPortForwardPort } = require("./portForward");
const { checkSyncCompletion } = require("./devMode");
const { setInputBox } = require("./index");
const getPort = require("get-port");
const { spawnSync } = require("child_process");
const { sendKeyCombinations } = keyboard;

const treeItemPath = [
  "",
  "default",
  "bookinfo",
  "Workloads",
  "Deployments",
  "ratings",
];
const start = async () => {
  const ratingsNode = await tree.getItem(...treeItemPath);
  const remoteRun = await ratingsNode.$(".action-label[title='Remote Run']");

  await remoteRun.click();
  logger.debug("remote run start");

  // if ((await dialog.getActionTexts()).includes("Open another directory")) {
  //   await dialog.selectAction("Open another directory");
  // } else {
  //   await dialog.selectAction("Open associated directory");
  // }

  // await file.selectPath(process.env.currentPath);
};

const checkHotReload = async () => {
  
  await page.waitForTimeout(3_000);

  const port = await add();

  // spawnSync("")

  await tree.getItem(...treeItemPath);

  await sendKeyCombinations("MetaLeft", "p");

  await setInputBox("ratings.js");

  await page.waitForTimeout(3_000);

  await sendKeyCombinations("MetaLeft", "g");

  await setInputBox("207:9");

  await page.waitForTimeout(3_000);

  await sendKeyCombinations("MetaLeft", "x");

  await page.keyboard.type(
    `\n\tres.end(JSON.stringify({status: 'Ratings is checking for hotreload'}))\n`
  );

  await sendKeyCombinations("MetaLeft", "s");

  await checkSyncCompletion();

  await retry(
    async () => {
      const data = await Axios.get(`http://127.0.0.1:${port}/health`);

      logger.debug("check Port", data.data);
      assert(
        "status" in data.data &&
          data.data.status === "Ratings is checking for hotreload"
      );
    },
    { retries: 3 }
  );
};

const stopRun = async () => {
  const treeItem = await tree.getItem(...treeItemPath);
  const portForward = await treeItem.$(".action-label[title='Port Forward']");
  await portForward.click();
  await stop();
};

module.exports = {
  start,
  checkHotReload,
  stopRun,
};
