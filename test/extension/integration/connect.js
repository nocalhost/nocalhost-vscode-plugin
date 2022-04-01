const assert = require("assert");
const { promises: fs } = require("fs");

const { waitForMessage, initialize, setInputBox } = require("./index");
/**
 *
 */
async function loginServer() {
  const iframe = await getIframe();
  const button = await iframe.$(".nocalhost-tab:last-child");
  await button.click();

  await iframe.waitForSelector("input");

  await iframe.evaluate(() =>
    document.querySelectorAll("input").forEach((item) => (item.value = ""))
  );

  await iframe.type(
    '[placeholder="Nocalhost API Server"]',
    process.env.NOCALHOST_SERVER_SERVER
  );
  await iframe.type(
    "[placeholder='Email Address']",
    process.env.NOCALHOST_SERVER_USERNAME
  );
  await iframe.type(
    '[placeholder="Password"]',
    process.env.NOCALHOST_SERVER_PASSWORD
  );
  await iframe.click(".login-form button");

  await page.waitForSelector(".notifications-toasts");
}

async function getIframe() {
  const parentHandle = await page
    .waitForSelector("#webview-webviewview-nocalhost-home .webview.ready")
    .catch(() => {
      process.exit(-1);
    });

  const parent = await parentHandle.contentFrame();

  assert.ok(parent);

  const iframeHandle = await parent.waitForSelector("#active-frame");
  const iframe = await iframeHandle.contentFrame();

  await iframe.waitForSelector(".nocalhost-tab");

  return iframe;
}

async function pasteAsText() {
  const iframe = await getIframe();
  const tabs = await (await iframe.$(".nocalhost-tab")).$$(":scope > *");
  await tabs[0].click();

  const buttons = await (
    await iframe.$(".MuiTabs-flexContainer")
  ).$$(":scope > *");
  await buttons[1].click();

  await iframe.focus('[placeholder="KubeConfig"]');

  const config = await fs.readFile(require("os").homedir() + "/.kube/config");

  await iframe.evaluate((config) => {
    document.querySelector('[placeholder="KubeConfig"]').value = config;
  }, config.toString());

  await iframe.type('[placeholder="KubeConfig"]', " ");

  await iframe.click(".kubeConfig-add-btn");

  return await waitForMessage("Success", 60 * 1000);
}

/**
 *
 */
async function loadKubeConfig() {
  const iframe = await getIframe();

  const tabs = await iframe.$$(".nocalhost-tab-item");
  await tabs[0].click();

  const buttons = await iframe.$$(".MuiButtonBase-root");
  await buttons[0].click();

  await iframe.waitForSelector(".MuiSvgIcon-root.icon.vscode-icon-foreground");

  await iframe.click(".kubeConfig-add-btn");

  return await waitForMessage("Success", 60 * 1000);
}

module.exports = { pasteAsText, loadKubeConfig };
