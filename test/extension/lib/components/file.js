const puppeteer = require("puppeteer-core");
const logger = require("../log");

/**
 *
 * @param {puppeteer.Page} page
 * @param {string} path
 */
async function selectPath(path) {
  logger.debug("selectPath", path);

  await page.waitForTimeout(1_00);

  const input = await page.waitForSelector(".quick-input-widget .input");

  await input.evaluate((input, path) => (input.value = path), path);

  await input.type(" ");
  await page.keyboard.press("Backspace");

  await page.waitForTimeout(1_00);

  const action = await page.waitForSelector(
    ".quick-input-widget .quick-input-action a"
  );
  await action.click();
}

module.exports = { selectPath };
