const puppeteer = require("puppeteer-core");
const {
  getTreeView,
  unInstall,
  isInstallSucceed,
  getInstallApp,
  waitForMessage,
  setInputBox,
  quickPick,
  checkPort,
} = require("./index");
const assert = require("assert");

/**
 *
 * @param {puppeteer.Page} page
 */
async function install(page) {
  let treeView = await getTreeView(page);

  if (treeView.length === 1) {
    await treeView[0].click();
  }

  await page.waitForTimeout(1000);

  treeView = await getTreeView(page);

  if (treeView.length === 2) {
    await treeView[1].click();
  }

  await page.waitForTimeout(1000);

  const app = await getInstallApp(page, "bookinfo");

  if (app) {
    await unInstall(page, app, "bookinfo");
  }

  const install = await page.waitForSelector(".codicon-rocket");

  await install.evaluate((el) => el.click());
}

/**
 *
 * @param {puppeteer.Page} page
 */
async function checkInstall(page) {
  assert(await (await isInstallSucceed(page, "bookinfo")).jsonValue());
  assert(await checkPort("39080"));
}

/**
 *
 * @param {puppeteer.Page} page
 */
async function cloneFromGit(page) {
  await install(page);

  await setInputBox(page, "Deploy From Git Repo");

  await setInputBox(page, "https://github.com/nocalhost/bookinfo.git");

  await setInputBox(page, "Default Branch");
}
/**
 *
 * @param {puppeteer.Page} page
 */
async function installKustomizeGit(page) {
  await cloneFromGit(page);

  await quickPick(page, "config.kustomize.yaml");

  await setInputBox(page, "Use Default");

  await checkInstall(page);
}

/**
 *
 * @param {puppeteer.Page} page
 */
async function installHelmGit(page) {
  await cloneFromGit(page);

  await quickPick(page, "config.helm.yaml");

  await setInputBox(page, "Use Default");

  await checkInstall(page);
}

/**
 *
 * @param {puppeteer.Page} page
 */
async function installManifestGit(page) {
  await cloneFromGit(page);

  await quickPick(page, "config.manifest.git.yaml");

  await setInputBox(page, "Use Default");

  await checkInstall(page);
}
/**
 *
 * @param {puppeteer.Page} page
 * @param {string} path
 */
async function installFromLocal(page, path) {
  await install(page);

  await setInputBox(page, "Deploy From Local Directory");

  await setInputBox(page, path);
}

/**
 *
 * @param {puppeteer.Page} page
 * @param {string} path
 */
async function installHelmLocal(page, path) {
  await installFromLocal(page, path);

  await quickPick(page, "config.kustomize.local.yaml");

  await setInputBox(page, "Use Default");

  await checkInstall(page);
}

/**
 *
 * @param {puppeteer.Page} page
 * @param {string} path
 */
async function installManifestLocal(page, path) {
  await installFromLocal(page, path);

  await quickPick(page, "config.manifest.local.yaml");

  await setInputBox(page, "Use Default");

  await checkInstall(page);
}

/**
 *
 * @param {puppeteer.Page} page
 * @param {string} path
 */
async function installKustomizeLocal(page, path) {
  await installFromLocal(page, path);

  await quickPick(page, "config.kustomize.local.yaml");

  await setInputBox(page, "Use Default");

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
