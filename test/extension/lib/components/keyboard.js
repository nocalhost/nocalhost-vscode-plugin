/**
 *
 * @param {Array<puppeteer.KeyInput>} key
 */
function getSystemKeys(key) {
  if (process.platform === "darwin") {
    switch (key) {
      case "ControlLeft":
        return "MetaLeft";
      default:
        return key;
    }
  } else {
    switch (key) {
      case "MetaLeft":
        return "ControlLeft";
      default:
        return key;
    }
  }
}
/**
 *
 * @param  {Array<puppeteer.KeyInput>} keys
 */
async function enterShortcutKeys(...keys) {
  for await (const key of keys) {
    await page.keyboard.down(getSystemKeys(key));
  }

  for await (const key of keys) {
    await page.keyboard.up(getSystemKeys(key));
  }

  await page.waitForTimeout(5_00);
}

module.exports = { enterShortcutKeys, getSystemKeys };
