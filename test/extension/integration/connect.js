const puppeteer = require("puppeteer-core");
const assert = require("assert");
const ncp = require("copy-paste");

const { waitForMessage, initialize } = require("./index");
/**
 *
 * @param {puppeteer.Page} page
 */
async function loginServer(page) {
  const iframe = await getIframe(page);
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
    "[placeholder='Username']",
    process.env.NOCALHOST_SERVER_USERNAME
  );
  await iframe.type(
    '[placeholder="Password"]',
    process.env.NOCALHOST_SERVER_PASSWORD
  );
  await iframe.click(".login-form button");

  await page.waitForSelector(".notifications-toasts");
}
/**
 *
 * @param {puppeteer.Page} page
 */
async function getIframe(page) {
  await page.waitForTimeout(5 * 1000);

  const frames = page.mainFrame().childFrames();

  const parentHandle = await page.waitForSelector(
    "#webview-webviewview-nocalhost-home .webview.ready"
  );

  const parent = await parentHandle.contentFrame();

  assert.ok(parent);

  const iframeHandle = await parent.waitForSelector("#active-frame");
  const iframe = await iframeHandle.contentFrame();

  await iframe.waitForSelector(".nocalhost-tab");

  return iframe;
}

async function copyKubeConfig() {
  let config = process.env.NOCALHOST_KUBECONFIG;

  await new Promise((res) => ncp.copy(config, res));
}

/**
 *
 * @param {puppeteer.Page} page
 */
async function pasteAsText(page) {
  const iframe = await getIframe(page);
  const tabs = await (await iframe.$(".nocalhost-tab")).$$(":scope > *");
  await tabs[0].click();

  const buttons = await (await iframe.$(".MuiTabs-flexContainer")).$$(
    ":scope > *"
  );
  await buttons[1].click();

  await iframe.focus('[placeholder="KubeConfig"]');

  await copyKubeConfig();

  await iframe.evaluateHandle(() => {
    return new Promise(async (res) => {
      const text = await navigator.clipboard.readText();

      document.querySelector('[placeholder="KubeConfig"]').value = text;
      res();
    });
  });

  await iframe.type('[placeholder="KubeConfig"]', " ");

  await iframe.click(".kubeConfig-add-btn");

  return await waitForMessage(page, "Success");
}

(async () => {
  if (require.main === module) {
    const page = await initialize();
    await pasteAsText(page);
  }
})();

module.exports = { pasteAsText };
