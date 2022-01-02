const puppeteer = require("puppeteer-core");

/**
 *
 * @param {puppeteer.Page} page
 * @param {string} text
 */
async function selectAction(page, text) {
  const dialog = await page.waitForSelector(".dialog-buttons");

  await dialog.evaluate((el, text) => {
    const button = Array.from(el.childNodes).find(
      (item) => item.textContent === text
    );

    button.click();
  }, text);

  await page.waitForTimeout(1_000);
}

module.exports = { selectAction };
