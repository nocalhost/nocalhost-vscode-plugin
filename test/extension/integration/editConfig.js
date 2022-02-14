const ncp = require("copy-paste");
const yaml = require("yaml");
const { tree } = require("../lib/components");
const assert = require("assert");
const retry = require("async-retry");

const treeItemPath = [
  "",
  "default",
  "bookinfo",
  "Workloads",
  "Deployments",
  "ratings",
];

async function editConfig(page) {
  const authors = await tree.getItem(...treeItemPath);
  const setting = await authors.$(".action-label[title='View Dev Configs']");
  await setting.click();
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
  // const content = await navigator.clipboard.readText();
  const content = ncp.paste();
  const obj = yaml.parse(content);
  obj.containers[0].dev.hotReload = true;

  const str = yaml.stringify(obj);
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

  retry(
    async () => {
      const tabElement = await page.waitForSelector(
        'div[aria-label="ratings.yaml"]'
      );
      assert.ok(tabElement._remoteObject.description.indexOf("dirty") === -1);
    },
    {
      retries: 3,
    }
  );
}

module.exports = {
  editConfig,
};
