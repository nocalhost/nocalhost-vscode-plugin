const { editConfig } = require("./configEdit");
const { connectTests } = require("./connect.test");

describe("connect", connectTests);
describe("Config Edit", () => {
  it("save", async () => {
    await editConfig(page);
  });
});
