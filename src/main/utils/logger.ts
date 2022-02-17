import log4js from "log4js";
import path from "path";
import { PLUGIN_CONFIG_DIR } from "../constants";

const loggerPath = path.resolve(PLUGIN_CONFIG_DIR, "vsc_log");

log4js.configure({
  appenders: {
    everything: {
      type: "dateFile",
      filename: loggerPath,
      maxLogSize: 10485760,
      daysToKeep: 3,
      pattern: "yyyy-MM-dd",
      backups: 3,
      compress: false,
    },
  },
  categories: {
    default: { appenders: ["everything"], level: "debug" },
  },
});

const logger = log4js.getLogger();
logger.level = "debug";

export default logger;
