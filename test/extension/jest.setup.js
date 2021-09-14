// jest.setTimeout(5 * 60 * 1000);

jasmine.getEnv().addReporter({
  specStarted: (result) => (jasmine.currentTest = result),
  specDone: (result) => (jasmine.currentTest = result),
});
