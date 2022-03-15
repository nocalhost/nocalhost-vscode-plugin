const { spawnSync } = require("child_process");
const { parse } = require("yaml");

const { tree } = require("../lib/components");
const logger = require("../lib/log");
const {
  defaultTreeItemPath,
  checkSyncCompletion,
  checkStartComplete,
  deployment,
} = require("./devMode");

const { generateMacAddress } = require("../lib");
const assert = require("assert");

async function startDev() {
  const ratingsNode = await tree.getItem(...defaultTreeItemPath);
  const duplicateDev = await ratingsNode.$(
    ".action-label[title='Start DevMode(Duplicate)']"
  );
  await duplicateDev.click();

  logger.info("duplicate start");
  // if ((await dialog.getActionTexts()).includes("Open another directory")) {
  //   await dialog.selectAction("Open another directory");
  // } else {
  //   await dialog.selectAction("Open associated directory");
  // }

  // await file.selectPath(process.env.currentPath);
}

async function startDuplicateComplete() {
  await checkStartComplete("dev_copy");

  await checkSyncCompletion();

  logger.debug("Start Duplicate Development", "ok");
}

async function checkOthers() {
  const newUid = generateMacAddress("-");

  await setUid(newUid);

  await checkStartComplete("dev_other");
}

function setUid(uid) {
  const json = `{"data":{"v":"${Buffer.from(
    `D:\n    ${deployment}: i${uid}\n`
  ).toString("base64")}"}}`;

  const result = spawnSync(
    [
      "kubectl",
      "patch",
      "secret",
      "dev.nocalhost.application.bookinfo",
      `-p='${json}'`,
    ].join(" "),
    { shell: true }
  );

  assert(result.status === 0, result.stderr);
}

function getUid() {
  const result = spawnSync(
    [
      "kubectl",
      "get",
      "secrets",
      "dev.nocalhost.application.bookinfo",
      "-o",
      "jsonpath='{.data.v}'",
      "|",
      "base64",
      "--decode",
    ].join(" "),
    { shell: true }
  );

  assert(result.status === 0, result.stderr);

  const { stdout } = result;

  const { D } = parse(stdout.toString());

  return D[deployment];
}

module.exports = { checkOthers, startDev, startDuplicateComplete };
