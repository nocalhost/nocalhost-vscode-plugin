import * as fs from "fs";
import * as path from "path";
import { PLUGIN_TEMP_DIR } from "../constants";
import * as request from "request";
import { isExist } from "./fileUtil";
import host from "../host";
import logger from "./logger";

const lockDir = path.resolve(PLUGIN_TEMP_DIR, "config_vsc.lock");
const processDir = path.resolve(lockDir, `${process.pid}`);
export const lock = function (cb?: (err?: any) => void) {
  fs.mkdir(lockDir, function (error) {
    if (error) {
      return cb(error);
    }
    fs.writeFile(processDir, "true", function (err) {
      if (err) {
        console.error(err);
      }
      return cb();
    });
  });
};

export const unlock = async function (callback?: (err?: any) => void) {
  try {
    const files = fs.readdirSync(lockDir);
    for (let i = 0; i < (files || []).length; i++) {
      const file = path.resolve(lockDir, files[i]);
      fs.unlinkSync(file);
    }
    fs.rmdirSync(lockDir);

    if (callback) {
      callback(true);
    }
  } catch (e) {
    logger.error(e);
    callback(e);
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
        res(true);
      })
      .on("error", (error: Error) => {
        host.log(error.message + "\n" + error.stack, true);
        rej(error);
      });
  });
};
