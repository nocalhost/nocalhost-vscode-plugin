module.exports = {
  testMatch: ["**/*.spec.js"],
  globalSetup: "./setup.js",
  maxWorkers: 1,
  verbose: true,
  globalTeardown: "./teardown.js",
  testEnvironment: "./puppeteerEnvironment.js",
};
