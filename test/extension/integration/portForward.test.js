const { list, stop, add } = require("./portForward");

const portForwardTests = () => {
  describe("port forward", () => {
    it("add", add.bind(null, page));
    it("list", list.bind(null, page));
    it("stop", stop.bind(null, page));
  });
};

module.exports = { portForwardTests };
