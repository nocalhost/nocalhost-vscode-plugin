const { getTreeView } = require("./index");

async function editConfig(page) {
  const sidebar = await page.waitForSelector("#workbench\\.parts\\.sidebar");
  // cluster
  const cluster = await sidebar.$$('div[aria-label="develop Active"]');
  // namespace
  debugger;
  await cluster.click();
  await page.waitForTimeout(300);
  const namespace = await sidebar.$('div[aria-label="nh115klbi "]');
  // application
  await namespace.click();
  await page.waitForTimeout(300);
  const application = sidebar.$(`div[aria-label="bookinfo "]`);

  // workload
  await application.click();
  await page.waitForTimeout(300);
  const workload = sidebar.$(`div[aria-label="Workloads "]`);

  await workload.click();
  await page.waitForTimeout(300);
  const deployment = sidebar.$(`div[aria-label="Deployments "]`);

  // deployment
  await deployment.click();
  await page.waitForTimeout(300);

  const authors = sidebar.$(`div[aria-label="authors "]`);
  const configEditIcon = authors.$(`.action-label`);
  console.log(configEditIcon);
  // modify authors config

  debugger;
  return Promise.resolve();
}

module.exports = {
  editConfig,
};
