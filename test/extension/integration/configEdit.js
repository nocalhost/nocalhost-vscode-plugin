const puppeteer = require("puppeteer-core");
// const ncp = require("copy-paste");

/**
 *
 * @param {puppeteer.Page} page
 */
async function editConfig(page, browser) {
  await page.waitForFunction(function () {
    return (
      document
        .querySelector("#workbench\\.parts\\.sidebar")
        ?.querySelectorAll(".monaco-list-row")?.length > 0
    );
  });

  const sidebar = await page.waitForSelector("#workbench\\.parts\\.sidebar");
  // cluster
  const cluster = await sidebar.$('div[aria-label="develop Active"]');

  // namespace
  await cluster.click();
  await page.waitForTimeout(300);
  const namespace = await sidebar.$('div[aria-label="nh115klbi "]');
  // application
  await namespace.click();
  await page.waitForTimeout(300);
  const application = await sidebar.$(`div[aria-label="bookinfo "]`);
  // workload
  await application.click();
  await page.waitForTimeout(300);
  const workload = await sidebar.$(`div[aria-label="Workloads "]`);

  await workload.click();
  await page.waitForTimeout(300);
  const deployment = await sidebar.$(`div[aria-label="Deployments "]`);

  // deployment
  await deployment.click();
  await page.waitForTimeout(3000);

  const authors = await sidebar.$(`div[aria-label="authors "]`);
  await authors.click();
  await page.waitForTimeout(300);

  const configEditIcon = await authors.$(`a[title="View Dev Configs"]`);
  console.log(configEditIcon);
  // modify authors config
  await configEditIcon.click();

  // copy config
  await page.waitForTimeout(3000);
  await page.keyboard.down("Meta");
  await page.keyboard.down("A");
  await page.keyboard.up("A");
  await page.keyboard.down("C");
  await page.keyboard.up("C");
  await page.keyboard.up("Meta");

  // const context = browser.defaultBrowserContext();
  // await context.overridePermissions("vscode-file://vscode-app", [
  //   "clipboard-read",
  //   "clipboard-write",
  // ]);

  const content = await page.evaluate(async () => {
    const text = await navigator.clipboard.readText();
    console.warn("text", text);
    // return navigator.clipboard.readText();
  });

  // const content = await navigator.clipboard.readText();

  debugger;
}

module.exports = {
  editConfig,
};
