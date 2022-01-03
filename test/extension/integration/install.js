const puppeteer = require("puppeteer-core");
const assert = require("assert");
const {
  setInputBox,
  selectQuickPickItem,
  checkPort,
  initialize,
} = require("./index");

const { dialog, file, tree } = require("../lib/components");
const logger = require("../lib/log");

/**
 *
 * @param {puppeteer.ElementHandle<Element>} node
 * @param {puppeteer.Page} page
 */
async function unInstall(page, node, name) {
  await node.hover();
  await page.click(".codicon-trash");

  await dialog.selectAction(page, "OK");

  await page.waitForFunction(
    `!document.querySelector(".monaco-list-rows").innerText.includes("${name}")`,
    { timeout: 1 * 60 * 1000 }
  );
}

/**
 *
 * @param {string} name
 * @param {puppeteer.Page} page
 */
async function isInstallSucceed(page, name) {
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
/**
 *
 * @param {string} name
 * @param {puppeteer.Page} page
 */
async function getInstallApp(page, name) {
  const nameList = await page.evaluate(() => {
    return Array.from(document.querySelector(".monaco-list-rows").children).map(
      (item) => item.innerText
    );
  });

  const index = nameList.indexOf(name);

  if (index > -1) {
    return (await tree.getChildren(page))[index];
  }

  return null;
}
/**
 *
 * @param {puppeteer.Page} page
 */
async function install(page) {
  const treeItem = await tree.getItem(page, "", "default");

  const app = await getInstallApp(page, "bookinfo");

  if (app) {
    await unInstall(page, app, "bookinfo");
  }

  const install = await treeItem.$(".codicon-rocket");

  await install.click();
}

/**
 *
 * @param {puppeteer.Page} page
 */
async function checkInstall(page) {
  assert(await (await isInstallSucceed(page, "bookinfo")).jsonValue());
  await checkPort("39080");
}

/**
 *
 * @param {puppeteer.Page} page
 */
async function cloneFromGit(page) {
  await install(page);

  await dialog.selectAction(page, "Deploy From Git Repo");

  await setInputBox(page, "https://github.com/nocalhost/bookinfo.git");

  await dialog.selectAction(page, "Default Branch");
}
/**
 *
 * @param {puppeteer.Page} page
 */
async function installKustomizeGit(page) {
  await cloneFromGit(page);

  await selectQuickPickItem(page, "config.kustomize.yaml");

  await dialog.selectAction(page, "Use Default");

  await checkInstall(page);
}

/**
 *
 * @param {puppeteer.Page} page
 */
async function installHelmGit(page) {
  await cloneFromGit(page);

  await selectQuickPickItem(page, "config.helm.yaml");

  await dialog.selectAction(page, "Use Default");

  await checkInstall(page);
}

/**
 *
 * @param {puppeteer.Page} page
 */
async function installManifestGit(page) {
  await cloneFromGit(page);

  await selectQuickPickItem(page, "config.manifest.git.yaml");

  await dialog.selectAction(page, "Use Default values");

  await checkInstall(page);
}
/**
 *
 * @param {puppeteer.Page} page
 */
async function installFromLocal(page) {
  await install(page);

  await dialog.selectAction(page, "Deploy From Local Directory");

  await file.selectPath(page, process.env.tmpDir);

  await page.waitForTimeout(5_00);
}

/**
 *
 * @param {puppeteer.Page} page
 */
async function installHelmLocal(page) {
  await installFromLocal(page);

  await selectQuickPickItem(page, "config.helm.local.yaml");

  await dialog.selectAction(page, "Use Default");

  await checkInstall(page);
}

/**
 *
 * @param {puppeteer.Page} page
 */
async function installManifestLocal(page) {
  await installFromLocal(page);

  await selectQuickPickItem(page, "config.manifest.local.yaml");

  await dialog.selectAction(page, "Use Default");

  await checkInstall(page);
}

/**
 *
 * @param {puppeteer.Page} page
 */
async function installKustomizeLocal(page) {
  await installFromLocal(page);

  await selectQuickPickItem(page, "config.kustomize.local.yaml");

  await dialog.selectAction(page, "Use Default");

  await checkInstall(page);
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

    await installKustomizeLocal(page);

    port && browser.disconnect();
  }
})();
