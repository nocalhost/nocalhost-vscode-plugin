const puppeteer = require("puppeteer-core");
const assert = require("assert");

const {
  setInputBox,
  selectQuickPickItem,
  checkPort,
  initialize,
} = require("./index");

const { dialog, file, tree } = require("../lib/components");

/**
 *
 * @param {puppeteer.ElementHandle<Element>} node
 */
async function unInstall(node) {
  await node.hover();
  await page.click(".codicon-trash");

  await dialog.selectAction("OK");

  await page.waitForFunction(
    `!document.querySelector(".monaco-list-rows").innerText.includes("bookinfo")`,
    { timeout: 1 * 60 * 1000 }
  );
}

/**
 * @param {string} name
 */
async function isInstallSucceed(name) {
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

async function install() {
  const bookinfo = await tree.getItem("", "default", "bookinfo");

  if (bookinfo) {
    await unInstall(bookinfo);
  }

  const treeItem = await tree.getItem("", "default");

  const install = await treeItem.$(".codicon-rocket");

  await install.click();
}

async function checkInstall() {
  assert(await (await isInstallSucceed("bookinfo")).jsonValue());
  await checkPort("39080");
}

async function cloneFromGit() {
  await install();

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
  await cloneFromGit();

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
  await install();

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
    const port = null;
    process.env.tmpDir = "/Volumes/Data/project/nocalhost/bookinfo/git";
    const { page, browser, port: newPort } = await initialize(port);

    if (!port) {
      return;
    }

    global.page = page;

    await installHelmLocal();

    port && browser.disconnect();
  }
})();
