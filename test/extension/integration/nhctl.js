const { waitForMessage } = require("./index");
const path = require("path");
const { homedir } = require("os");
const shell = require("shelljs");

/**
 * @param {puppeteer.Page} page
 */
async function dowload(page) {
  const result = shell.which(path.resolve(homedir(), ".nh", "bin", "nhctl"));
  if (result && result.code === 0) {
    return;
  }

  page.setDefaultTimeout(60 * 1000);

  await waitForMessage(page, "Downloading nhctl");

  await waitForMessage(page, "Download completed");

  page.setDefaultTimeout(20 * 1000);
}
module.exports = { dowload };
