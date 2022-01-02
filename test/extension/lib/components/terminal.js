const puppeteer = require("puppeteer-core");

/**
 *
 * @param {puppeteer.Page} page
 */
async function getTerminal(page) {
  await page.waitForSelector(".terminal-wrapper.active .xterm-screen");

  const terminal = await page.$(".terminal-wrapper.active .xterm-screen");
  await terminal.click();

  return terminal;
}

/**
 * @param {puppeteer.Page} page
 * @param {string} text
 */
async function typeTerminal(page, text) {
  await getTerminal(page);

  await page.keyboard.type(text);
}

module.exports = { typeTerminal, getTerminal };
