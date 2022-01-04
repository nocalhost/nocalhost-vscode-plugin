const puppeteer = require("puppeteer-core");
const assert = require("assert");
const retry = require("async-retry");

const {
  setInputBox,
  selectQuickPickItem,
  checkPort,
  initialize,
} = require("./index");

const { dialog, file, tree, notification } = require("../lib/components");
const logger = require("../lib/log");

/**
 *
 * @param {puppeteer.ElementHandle<Element>} node
 */
async function unInstall(node, waitTime = 0) {
  await node.hover();
  await page.click(".codicon-trash");

  await dialog.selectAction("OK");

  await page.waitForFunction(
    `!document.querySelector(".monaco-list-rows").innerText.includes("bookinfo")`,
    { timeout: 1 * 60 * 1000 }
  );

  waitTime && (await page.waitForTimeout(waitTime));
}

/**
 * @param {string} name
 */
async function isInstallSucceed() {
  await page.waitForTimeout(2_000);

  await retry(
    async () => {
      const notice = await notification.getNotification({
        message: "Installing application: bookinfo",
      });
      assert(!notice);
    },
    { retries: 6 }
  );

  const notice = await notification.getNotification({
    message: "Installing application: bookinfo fail",
  });

  if (notice) {
    await notice.dismiss();

    assert(!notice);
  }

  await retry(
    async () => {
      const bookinfo = await tree.getItem("", "default", "bookinfo");

      assert(bookinfo);

      const icon = await bookinfo.$(
        `.custom-view-tree-node-item-icon[style$='app_connected.svg");']`
      );

      assert(icon);
    },
    { retries: 6 }
  );
}

async function install(waitTime = 0) {
  const bookinfo = await tree.getItem("", "default", "bookinfo");

  if (bookinfo) {
    await unInstall(bookinfo, waitTime);
  }

  const treeItem = await tree.getItem("", "default");

  const install = await treeItem.$(".codicon-rocket");

  await install.click();
}

async function checkInstall() {
  await isInstallSucceed();

  await checkPort("39080");
}

async function cloneFromGit(waitTime = 0) {
  await install(waitTime);

  await dialog.selectAction("Deploy From Git Repo");

  await setInputBox("https://github.com/nocalhost/bookinfo.git");

  await dialog.selectAction("Default Branch");
}

async function installKustomizeGit() {
  await cloneFromGit();

  await selectQuickPickItem("config.kustomize.yaml");

  await dialog.selectAction("Use Default");

  await checkInstall();
}

async function installHelmGit() {
  await cloneFromGit(20_000);

  await selectQuickPickItem("config.helm.yaml");

  await dialog.selectAction("Use Default values");

  await checkInstall();
}

async function installManifestGit() {
  await cloneFromGit();

  await selectQuickPickItem("config.manifest.git.yaml");

  await checkInstall();
}

async function installFromLocal() {
  await install(20_000);

  await dialog.selectAction("Deploy From Local Directory");

  await file.selectPath(process.env.tmpDir);

  await page.waitForTimeout(5_00);
}

async function installHelmLocal() {
  await installFromLocal();

  await selectQuickPickItem("config.helm.local.yaml");

  await dialog.selectAction("Use Default values");

  await checkInstall();
}

async function installManifestLocal() {
  await installFromLocal();

  await selectQuickPickItem("config.manifest.local.yaml");

  await checkInstall();
}

async function installKustomizeLocal() {
  await installFromLocal();

  await selectQuickPickItem("config.kustomize.local.yaml");

  await dialog.selectAction("Use Default");

  await checkInstall();
}

module.exports = {
  installHelmGit,
  installManifestGit,
  installKustomizeGit,
  installHelmLocal,
  installManifestLocal,
  installKustomizeLocal,
};

(async () => {
  if (require.main === module) {
    process.env.tmpDir = "/Volumes/Data/project/nocalhost/bookinfo/git";

    await initialize(null, installKustomizeLocal);
  }
})();
