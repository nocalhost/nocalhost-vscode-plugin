/**
 *
 * @param {string} text
 */
async function selectAction(text) {
  const dialog = await page.waitForSelector(".dialog-buttons");

  await dialog.evaluate((el, text) => {
    const button = Array.from(el.childNodes).find(
      (item) => item.textContent === text
    );

    button.click();
  }, text);

  await page.waitForTimeout(500);
}

/**
 *
 * @returns {Array<string>}
 */
async function getActionTexts() {
  const dialog = await page.waitForSelector(".dialog-buttons");

  const buttons = await dialog.$$("a");

  const texts = await Promise.all(
    buttons.map((button) => button.evaluate((el) => el.textContent))
  );

  return texts;
}
module.exports = { selectAction, getActionTexts };
