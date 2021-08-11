// eslint-disable-next-line @typescript-eslint/naming-convention
const NodeEnvironment = require("jest-environment-node");
const retry = require("async-retry");
const { getPage, openNocalhost } = require("./integration");

class PuppeteerEnvironment extends NodeEnvironment {
  async setup() {
    await super.setup();

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { __BROWSER__ } = global;

    const page = await retry(() => getPage(__BROWSER__), {
      maxRetryTime: 10 * 1000,
    });
    page.setDefaultTimeout(20 * 1000);

    await openNocalhost(page);

    this.global.page = page;
  }

  async teardown() {
    await super.teardown();
  }

  getVmContext() {
    return super.getVmContext();
  }
}

module.exports = PuppeteerEnvironment;
