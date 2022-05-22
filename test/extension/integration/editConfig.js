const ncp = require("copy-paste");
const yaml = require("yaml");
const { tree } = require("../lib/components");
const assert = require("assert");
const retry = require("async-retry");
const {
  sendKeyCombinations: enterShortcutKeys,
} = require("../lib/components/keyboard");

const treeItemPath = [
  "",
  "default",
  "bookinfo",
  "Workloads",
  "Deployments",
  "ratings",
];

async function editConfig() {
  const authors = await tree.getItem(...treeItemPath);
  const setting = await authors.$(".action-label[title='View Dev Configs']");
  await setting.click();

  await page.waitForTimeout(1000);

  await page.keyboard.press("Escape");

  await enterShortcutKeys("ControlLeft", "A");

  await enterShortcutKeys("ControlLeft", "C");

  const content = ncp.paste();
  const obj = yaml.parse(content);
  obj.containers[0].dev.hotReload = true;

  const str = yaml.stringify(obj);
  ncp.copy(str);

  await enterShortcutKeys("ControlLeft", "A");

  await page.keyboard.press("Backspace");

  await enterShortcutKeys("ControlLeft", "V");

  await enterShortcutKeys("ControlLeft", "S");

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
