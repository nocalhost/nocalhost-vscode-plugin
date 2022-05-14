const log4js = require("log4js");

log4js.configure({
  appenders: { out: { type: "stdout" } },
  categories: {
    default: { appenders: ["out"], level: process.env.LOGGER_LEVEL || "INFO" },
  },
});

function log(str1, ...args) {
  const str = `${str1} ${args.join(" ")}`;

  const write = process.stdout.write.bind(process.stdout);

  write(str);
}
// const logger = log4js.getLogger();
const logger = {
  debug: log,
  warn: log,
  info: process.stderr.write,
};

module.exports = logger;
