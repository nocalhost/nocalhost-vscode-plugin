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
 * @param  {[puppeteer.KeyInput,puppeteer.KeyInput]} keys
 */
async function enterShortcutKeys(...keys) {
  let [prev, next] = keys;
  await page.keyboard.down(getSystemKeys(prev));

  await page.keyboard.press(next);

  await page.keyboard.up(getSystemKeys(prev));
  // for await (const key of keys) {
  //   await page.keyboard.down(getSystemKeys(key));
  // }

  // await page.waitForTimeout(5_00);

  // for await (const key of keys.reverse()) {
  //   await page.keyboard.up(getSystemKeys(key));
  // }

  await page.waitForTimeout(15_00);
}

// /**
//  *
//  * @param {[Array<puppeteer.KeyInput>,Array<puppeteer.KeyInput>]|[puppeteer.KeyInput,puppeteer.KeyInput]} keys
//  */
// async function sendingKeyCombinations(keys) {
//   let [prev, next] = keys;
//   if (!Array.isArray(prev)) {
//     prev = [prev];
//   }
//   if (!Array.isArray(next)) {
//     next = [next];
//   }

//   for await (const key of keys) {
//     await page.keyboard.down(getSystemKeys(key));
//   }
// }

module.exports = { enterShortcutKeys, getSystemKeys };
