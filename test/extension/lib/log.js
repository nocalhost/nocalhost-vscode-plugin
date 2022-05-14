const log4js = require("log4js");

log4js.configure({
  appenders: { out: { type: "stdout" } },
  categories: {
    default: { appenders: ["out"], level: process.env.LOGGER_LEVEL || "INFO" },
  },
});

function log(str1, ...args) {
  const str = `${str1} ${args.join(" ")}\n`;

  const write = process.stdout.write.bind(process.stdout);

  write(str);
}
// const logger = log4js.getLogger();
const logger = {
  debug: log.bind(process.stdout),
  warn: log.bind(process.stdout),
  info: log.bind(process.stdout),
  err: log.bind(process.stdout),
};

module.exports = logger;
