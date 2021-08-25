module.exports = {
  testMatch: ["**/*.spec.js"],
  globalSetup: "./setup.js",
  maxWorkers: 1,
  verbose: true,
  bail: 1,
  setupFilesAfterEnv: ["./jest.setup.js"],
  globalTeardown: "./teardown.js",
  testEnvironment: "./puppeteerEnvironment.js",
};
