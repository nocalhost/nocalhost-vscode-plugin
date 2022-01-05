const { list, stop, add } = require("./portForward");

const portForwardTests = () => {
  it("add", add, 15 * 60 * 1000);
  it("list", list);
  it("stop", stop);
};

module.exports = { portForwardTests };
