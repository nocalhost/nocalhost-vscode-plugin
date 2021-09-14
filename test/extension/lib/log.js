const log4js = require("log4js");

log4js.configure({
  appenders: { out: { type: "stdout" } },
  categories: {
    default: { appenders: ["out"], level: process.env.LOGGER_LEVEL || "INFO" },
  },
});

const logger = log4js.getLogger();

module.exports = logger;
