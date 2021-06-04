import * as fs from "fs";
import * as path from "path";
import { PLUGIN_TEMP_DIR } from "../constants";
import * as request from "request";
import { accessFile } from "../utils/fileUtil";
import host from "../host";
import logger from "./logger";

let hasLock = false;
const lockDir = path.resolve(PLUGIN_TEMP_DIR, "config.lock");
const processDir = path.resolve(lockDir, `${process.pid}`);
export const lock = function (cb: (err?: any) => void) {
  if (hasLock) {
    return cb();
  }
  fs.mkdir(lockDir, function (error) {
    if (error) {
      return cb(error);
    }
    fs.writeFile(processDir, "true", function (err) {
      if (err) console.error(err);
      hasLock = true;
      return cb();
    });
  });
};

export const unlock = async function (callback: (err?: any) => void) {
  try {
    if (!hasLock) {
      callback(null);
      logger.info(`file lock  ${hasLock}`);
      return;
    }
    if ((await accessFile(processDir)) === true) {
      fs.unlinkSync(processDir);
    }
    fs.rmdir(lockDir, (err) => {
      if (err) {
        console.log(err);
        logger.info(`rmdir error`);
        return callback(err);
      }
      logger.info(`rmdir success `);
      hasLock = false;
      callback(null);
    });
  } catch (e) {
    logger.error(e);
  }
};

export const downloadNhctl = async (
  downloadUrl: string,
  destinationPath: string
) => {
  return new Promise((res, rej) => {
    request(downloadUrl)
      .pipe(
        fs.createWriteStream(destinationPath as fs.PathLike, {
          mode: 0o755,
        })
      )
      .on("close", () => {
        host.removeGlobalState("Downloading");
        res(true);
      })
      .on("error", (error: Error) => {
        host.removeGlobalState("Downloading");
        host.log(error.message + "\n" + error.stack, true);
        rej(error);
      });
  });
};
