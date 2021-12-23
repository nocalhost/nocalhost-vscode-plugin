const namespaceName = process.env.NOCALHOST_NAMESPACE ?? "default";
// cls-qnzlf1u0
const clusterName = process.env.NOCALHOST_CLUSTER_NAME ?? "";

const { getTreeView } = require("./index");
/**
 *
 * @param {puppeteer.Page} page
 */
const expandTree = async (page) => {
  await page.waitForFunction(function () {
    return (
      document
        .querySelector("#workbench\\.parts\\.sidebar")
        ?.querySelectorAll(".monaco-list-row")?.length > 0
    );
  });
  const sidebar = await page.waitForSelector("#workbench\\.parts\\.sidebar");
  // cluster
  let cluster;
  if (clusterName) {
    cluster = await sidebar.$(`div[aria-label="${clusterName} Active"]`);
  } else {
    const treeView = await getTreeView(page);
    cluster = treeView[0];
  }
  // namespace
  let namespace = await sidebar.$(`div[aria-label="${namespaceName} "]`);
  if (!namespace) {
    await cluster.click();
    await page.waitForTimeout(300);
    namespace = await sidebar.$(`div[aria-label="${namespaceName} "]`);
  }

  // application
  let application = await sidebar.$(`div[aria-label="bookinfo "]`);
  if (!application) {
    await namespace.click();
    await page.waitForTimeout(1000);
    application = await sidebar.$(`div[aria-label="bookinfo "]`);
  }

  // workload
  let workload = await sidebar.$(`div[aria-label="Workloads "]`);
  if (!workload) {
    await application.click();
    await page.waitForTimeout(300);
    workload = await sidebar.$(`div[aria-label="Workloads "]`);
  }

  // deployment
  let deployment = await sidebar.$(`div[aria-label="Deployments "]`);
  if (!deployment) {
    await workload.click();
    await page.waitForTimeout(300);
    deployment = await sidebar.$(`div[aria-label="Deployments "]`);
  }

  // service
  let authors = await sidebar.$(`div[aria-label="authors "]`);
  if (!authors) {
    await deployment.click();
    await page.waitForTimeout(3000);
    authors = await sidebar.$(`div[aria-label="authors "]`);
  }

  await authors.click();
  await page.waitForTimeout(300);

  return authors;
};

module.exports = {
  expandTree,
};
