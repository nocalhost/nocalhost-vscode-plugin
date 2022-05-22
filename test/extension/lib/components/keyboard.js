/**
 *
 * @param {Array<puppeteer.KeyInput>} key
 */
function getKeyCode(key) {
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
async function sendKeyCombinations(...keys) {
  // let [prev, next] = keys;
  // await page.keyboard.down(getKeyCode(prev));

  // //https://github.com/puppeteer/puppeteer/issues/1313#issuecomment-456506730

  await page.click(".monaco-grid-branch-node");

  // await page.keyboard.press(next);

  // await page.keyboard.up(getKeyCode(prev));

  const handle = page.keyboard;
  for (const key of keys) {
    const keyCode = getKeyCode(key);
    await handle.down(keyCode);
  }

  for (const key of keys.reverse()) {
    const keyCode = getKeyCode(key);
    await handle.up(keyCode);
  }

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

module.exports = { sendKeyCombinations, getKeyCode };
