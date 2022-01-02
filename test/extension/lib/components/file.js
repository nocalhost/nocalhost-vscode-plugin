const puppeteer = require("puppeteer-core");

/**
 *
 * @param {puppeteer.Page} page
 * @param {string} path
 */
async function selectPath(page, path) {
  const input = await page.waitForSelector(".quick-input-widget .input");

  await input.evaluate((input) => (input.value = ""), input);

  await input.click();
  await input.type(path);

  const actions = await page.waitForSelector(".quick-input-action");
  await (await actions.$("a")).click();
}

module.exports = { selectPath };
