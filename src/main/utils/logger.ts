import * as log4js from "log4js";
import * as path from "path";
import { PLUGIN_CONFIG_DIR } from "../constants";

const loggerPath = path.resolve(PLUGIN_CONFIG_DIR, "vsc_log");
const debugPath = path.resolve(PLUGIN_CONFIG_DIR, "vsc_log.debug");

const defaultAppender: log4js.Appender = {
  type: "dateFile",
  filename: loggerPath,
  maxLogSize: 10485760,
  daysToKeep: 3,
  pattern: "yyyy-MM-dd",
  backups: 3,
  compress: false,
};

log4js.configure({
  appenders: {
    default: defaultAppender,
    debug: { ...defaultAppender, filename: debugPath },
  },
  categories: {
    default: { appenders: ["default"], level: "info" },
    debug: { appenders: ["debug"], level: "debug" },
  },
});

const logger = log4js.getLogger();

const loggerDebug = log4js.getLogger("debug");
loggerDebug.level = "debug";

export default logger;

export { loggerDebug };
