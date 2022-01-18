const { ElementHandle } = require("puppeteer-core");

async function getNotifications() {
  const toasts = await page.$(".notifications-toasts.visible");

  if (!toasts) {
    return [];
  }

  const notifications = await toasts.$$(".notification-toast-container");

  return notifications.map((el) => new Notification(el));
}
/**
 *
 * @param {object} option - option
 * @param {string} option.message - message
 * @returns
 */
async function getNotification(option) {
  const notifications = await getNotifications();

  const messages = await Promise.all(
    notifications.map((notification) => notification.getMessage())
  );

  const index = messages.indexOf(option.message);

  return notifications[index];
}
// class Action {}
class Notification {
  _el;
  /**
   *
   * @param {ElementHandle<Element>} el
   */
  constructor(el) {
    this._el = el;
  }
  /**
   *
   * @returns {Promise<string>}
   */
  async getMessage() {
    const message = (
      await this._el.$(".notification-list-item-message")
    ).evaluate((el) => el.textContent);

    return message;
  }
  async dismiss() {
    const clear = await this._el.$(".codicon-notifications-clear");

    if (clear) {
      await this._el.hover();
      await clear.click();
    }
  }
  // get type() {}
  // get hasProgress() {}
  // get actions() {}
  // takeAction(title) {}
}
module.exports = { getNotifications, getNotification };
