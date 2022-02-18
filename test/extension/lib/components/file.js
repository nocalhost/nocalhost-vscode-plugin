const puppeteer = require("puppeteer-core");

/**
 *
 * @param {puppeteer.Page} page
 * @param {string} path
 */
async function selectPath(path) {
  const input = await page.waitForSelector(".quick-input-widget .input");

  await input.evaluate((input, path) => (input.value = path), path);

  await input.type(" ");
  await page.keyboard.press("Backspace");

  await page.waitForTimeout(1_000);

  const action = await page.waitForSelector(
    ".quick-input-widget .quick-input-action a"
  );
  await action.click();
}

module.exports = { selectPath };
