// eslint-disable-next-line @typescript-eslint/naming-convention
const NodeEnvironment = require("jest-environment-node");
const puppeteer = require("puppeteer-core");
const retry = require("async-retry");
const path = require("path");

const { getPage, openNocalhost } = require("./integration");
const { videoCapture } = require(".");

class PuppeteerEnvironment extends NodeEnvironment {
  async setup() {
    await super.setup();

    this.global.testEnvironment = this;

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { __BROWSER__ } = global;

    const page = await retry(() => getPage(__BROWSER__), {
      retries: 3,
    });

    page.setDefaultTimeout(10 * 1000);

    await this.startVideoCapture(page);

    await openNocalhost(page);

    this.global.page = page;
    this.global.browser = __BROWSER__;
  }

  /**
   *
   * @param {puppeteer.Page} page
   */
  async startVideoCapture(page) {
    const client = await page.target().createCDPSession();
    let canScreenshot = true;

    client.on("Page.screencastFrame", async (frameObject) => {
      if (canScreenshot) {
        await videoCapture.writeVideoFrame(
          Buffer.from(frameObject.data, "base64")
        );

        try {
          await client.send("Page.screencastFrameAck", {
            sessionId: frameObject.sessionId,
          });
        } catch (e) {
          canScreenshot = false;
        }
      }
    });

    await videoCapture.start(
      path.join(__dirname, "../../.screenshot/video.mp4")
    );

    await client.send("Page.startScreencast", {
      format: "jpeg",
      everyNthFrame: Number(process.env.CYPRESS_EVERY_NTH_FRAME || 5),
    });

    this.global.client = client;
  }
  async teardown() {
    await super.teardown();
  }

  getVmContext() {
    return super.getVmContext();
  }
}

module.exports = PuppeteerEnvironment;
