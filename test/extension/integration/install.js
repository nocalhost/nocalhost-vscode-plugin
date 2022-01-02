const puppeteer = require("puppeteer-core");
const assert = require("assert");
const {
  unInstall,
  isInstallSucceed,
  getInstallApp,
  setInputBox,
  selectQuickPickItem,
  checkPort,
} = require("./index");

const { dialog, file, tree } = require("../lib/components");
const logger = require("../lib/log");

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

  await dialog.selectAction(page, "Use Default");

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
