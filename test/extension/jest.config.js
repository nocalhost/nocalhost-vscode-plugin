module.exports = {
  testMatch: ["**/*.spec.js"],
  globalSetup: "./setup.js",
  maxWorkers: 1,
  verbose: true,
  setupFilesAfterEnv: ["./jest.setup.js"],
  globalTeardown: "./teardown.js",
  testEnvironment: "./puppeteerEnvironment.js",
};
