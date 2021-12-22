const puppeteer = require("puppeteer-core");
const ncp = require("copy-paste");
const yaml2json = require("js-yaml");
const json2yaml = require("json2yaml");
const { expandTree } = require("./tree");
const assert = require("assert");

/**
 *
 * @param {puppeteer.Page} page
 */
async function editConfig(page, browser) {
  const authors = await expandTree(page);

  const configEditIcon = await authors.$(`a[title="View Dev Configs"]`);
  console.log(configEditIcon);
  // modify authors config
  await configEditIcon.click();

  // copy config
  await page.waitForTimeout(5000);
  await page.keyboard.down("Escape");
  await page.keyboard.up("Escape");

  await page.keyboard.down("Meta");
  await page.keyboard.down("A");
  await page.keyboard.up("A");
  await page.keyboard.down("C");
  await page.keyboard.up("C");
  await page.keyboard.up("Meta");

  // const context = browser.defaultBrowserContext();
  // await context.overridePermissions("vscode-file://vscode-app", [
  //   "clipboard-read",
  //   "clipboard-write",
  // ]);

  // const content = await page.evaluate(async () => {
  //   const text = await navigator.clipboard.readText();
  //   console.warn("text", text);
  //   // return navigator.clipboard.readText();
  // });

  // const content = await navigator.clipboard.readText();
  const content = ncp.paste();
  const obj = yaml2json.load(content);
  obj.containers[0].dev.hotReload = !obj.containers[0].dev.hotReload;
  // remoteDebugPort
  // obj.containers[0].dev.debug.remoteDebugPort = "xxxx";
  const str = json2yaml.stringify(obj);
  ncp.copy(str);

  await page.waitForTimeout(1000);

  await page.keyboard.down("Meta");
  await page.keyboard.press("A");
  await page.keyboard.up("Meta");
  await page.keyboard.press("Backspace");

  await page.waitForTimeout(1000);

  await page.keyboard.down("Meta");
  await page.keyboard.press("V");

  await page.keyboard.press("S");

  await page.keyboard.up("Meta");

  await page.waitForTimeout(5000);

  const tabElement = await page.waitForSelector(
    'div[aria-label="authors.yaml"]'
  );
  assert.ok(tabElement._remoteObject.description.indexOf("dirty") === -1);
}

module.exports = {
  editConfig,
};
