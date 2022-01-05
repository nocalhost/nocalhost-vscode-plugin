const { list, stop, add } = require("./portForward");

const portForwardTests = () => {
  it("add", add);
  it("list", list);
  it("stop", stop);
};

module.exports = { portForwardTests };
