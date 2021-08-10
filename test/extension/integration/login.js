const puppeteer = require("puppeteer");
const { waitForMessage } = require("./index");
const assert = require("assert");

/**
 *
 * @param {puppeteer.Page} page
 */
async function loginServer(page) {
  const iframe = await login(page);
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
async function login(page) {
  // const html = await page.evaluate(() => {
  //   const iframe = document.querySelector("#webview-webviewview-nocalhost-home").querySelector("iframe")
  //   return new Promise((res,rej)=>{
  //     iframe.addEventListener("load", () => {
  //       res(iframe)
  //     })
  //   });
  // })
  //  await page.waitForTimeout(5*1000);

  const parentHandle = await page.waitForSelector(
    "#webview-webviewview-nocalhost-home .webview.ready"
  );

  const parent = await parentHandle.contentFrame();

  assert.ok(parent);

  const html = await parentHandle.evaluate((item) => {
    return item.innerHTML;
  });

  assert.ok(html);

  const iframeHandle = await parent.waitForSelector("#active-frame");
  const iframe = await iframeHandle.contentFrame();

  await iframe.waitForSelector(".nocalhost-tab");

  return iframe;
}
/**
 *
 * @param {puppeteer.Page} page
 */
async function loginTextConfig(page) {
  const iframe = await login(page);
  const tabs = await (await iframe.$(".nocalhost-tab")).$$(":scope > *");
  await tabs[0].click();

  const buttons = await (await iframe.$(".MuiTabs-flexContainer")).$$(
    ":scope > *"
  );
  await buttons[1].click();

  await iframe.type(
    '[placeholder="KubeConfig"]',
    process.env.NOCALHOST_KUBECONFIG
  );

  await iframe.click(".kubeConfig-add-btn");

  return await waitForMessage(page, "Success");
}

// (async () => {
//   await initialize(async (page) => {
//     await loginTextConfig(page);
//   });
// })();

module.exports = { loginServer, loginTextConfig };
