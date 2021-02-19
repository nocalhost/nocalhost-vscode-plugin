import * as log4js from "log4js";
import * as path from "path";
import { PLUGIN_CONFIG_DIR } from "../constants";

const loggerPath = path.resolve(PLUGIN_CONFIG_DIR, "all-the-logs.log");

log4js.configure({
  appenders: {
    everything: {
      type: "file",
      filename: loggerPath,
      maxLogSize: 10485760,
      backups: 3,
      compress: true,
    },
  },
  categories: {
    default: { appenders: ["everything"], level: "debug" },
  },
});

const logger = log4js.getLogger();
logger.level = "debug";

export default logger;
