const { performance, PerformanceObserver } = require("perf_hooks");
const { tree } = require("../lib/components");
const { waitForMessage } = require("./index");
const logger = require("../lib/log");

const treeItemPath = [
  "",
  "default",
  "bookinfo",
  "Workloads",
  "Deployments",
  "ratings",
];

const resetPod = async () => {
  // add performance mark
  /* * /
  const obs = new PerformanceObserver((items) => {
    const entry = items.getEntries()[0];
    logger.info(entry.duration);
    performance.clearMarks();
    obs.disconnect();
  });
  obs.observe({ entryTypes: ["measure"] });
  // performance.measure("Start to Now");
  performance.mark("tree-start-time");
  
  performance.mark("tree-end-time");
  performance.measure("tree-time", {
    start: "tree-start-time",
    end: "tree-end-time",
  });
  /** */
  const ratings = await tree.getItem(...treeItemPath);
  const resetNode = await ratings.$(".action-label[title='Reset Pod']");

  await resetNode.click();
  return waitForMessage("reset service ratings", 60 * 1000);
};

module.exports = {
  resetPod,
};
