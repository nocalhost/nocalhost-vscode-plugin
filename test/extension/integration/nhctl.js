const { waitForMessage } = require("./index");
const path = require("path");
const { homedir } = require("os");
const shell = require("shelljs");

/**
 * @param {puppeteer.Page} page
 */
async function download() {
  const result = shell.which(path.resolve(homedir(), ".nh", "bin", "nhctl"));
  if (result && result.code === 0) {
    return;
  }

  await waitForMessage("Downloading nhctl");

  await waitForMessage("Download completed", 10 * 60 * 1000);
}
module.exports = { download };
