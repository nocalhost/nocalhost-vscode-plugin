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

module.exports = { selectAction };
