const { installTests } = require("./install.test");
const { connectTests } = require("./connect.test");
jest.setTimeout(30 * 60 * 1000);

describe("Connect", connectTests);
describe("Install", installTests);
