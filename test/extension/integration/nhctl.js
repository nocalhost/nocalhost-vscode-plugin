const { waitForMessage } = require("./index");
const path = require("path");
const { homedir } = require("os");
const shellWhich = require("which");

/**
 * @param {puppeteer.Page} page
 */
async function download() {
  const result = !!shellWhich.sync(
    path.resolve(homedir(), ".nh", "bin", "nhctl"),
    { nothrow: true }
  );
  if (result) {
    return;
  }

  await waitForMessage("Downloading nhctl");

  await waitForMessage("Download completed", 2 * 60 * 1000);
}
module.exports = { download };
