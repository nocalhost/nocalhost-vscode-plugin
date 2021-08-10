const { installTests } = require("./install.test");

jest.setTimeout(30 * 60 * 1000);
describe("Install", installTests);
