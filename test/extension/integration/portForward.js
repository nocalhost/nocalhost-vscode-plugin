const puppeteer = require("puppeteer-core");
const { getTreeItemByChildName, checkPort, getItemMenu } = require("./index");

/**
 *
 * @param {puppeteer.Page} page
 * @description
const element=document.querySelector(`#workbench\\.parts\\.sidebar .monaco-list-row[aria-level='6'`)
const ev = document.createEvent('HTMLEvents');
ev.initEvent('contextmenu', true, false);
element.dispatchEvent(ev);

const node=document.querySelector(`.action-label[aria-label='Port Forward']`)
const portForward=node.parentNode.parentNode


const mouseEvents = document.createEvent("MouseEvents");
mouseEvents.initEvent("mouseup", true, true);
portForward.dispatchEvent(mouseEvents);
 */
async function add(page) {
  const authors = await getTreeItemByChildName(
    page,
    "default",
    "bookinfo",
    "Workloads",
    "Deployments",
    "productpage"
  );

  await authors.click({
    button: "right",
  });

  const action = await getItemMenu(page, "Port Forward");
  await action.element.click();
}
module.exports = { add };
