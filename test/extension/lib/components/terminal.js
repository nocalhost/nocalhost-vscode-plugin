async function getTerminal() {
  await page.waitForSelector(".terminal-wrapper.active .xterm-screen");

  const terminal = await page.$(".terminal-wrapper.active .xterm-screen");
  await terminal.click();

  return terminal;
}

/**
 * @param {string} text
 */
async function sendText(text) {
  await getTerminal(page);

  await page.keyboard.type(text);
}

module.exports = { sendText, getTerminal };
