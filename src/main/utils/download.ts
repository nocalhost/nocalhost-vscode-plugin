import * as fs from "fs";
import * as path from "path";
import { PLUGIN_TEMP_DIR } from "../constants";
import host from "../host";
import logger from "./logger";
import Axios, { AxiosResponse } from "axios";
import { Readable } from "stream";

const lockDir = path.resolve(PLUGIN_TEMP_DIR, "config_vsc.lock");
const processDir = path.resolve(lockDir, `${process.pid}`);

export const lock = async function (): Promise<void> {
  return new Promise((res, rej) => {
    fs.mkdir(lockDir, function (error) {
      if (error) {
        rej(error);
      }
      fs.writeFile(processDir, "true", function (err) {
        if (err) {
          rej(err);
        }
        res();
      });
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
  destinationPath: string,
  onDownloadProgress: (progress: number) => void
) => {
  return new Promise((res, rej) => {
    Axios.get(downloadUrl, {
      responseType: "stream",
    })
      .then((response: AxiosResponse<Readable>) => {
        const { data, headers } = response;

        const totalLength = headers["content-length"];
        data
          .on("data", (chunk: Buffer) => {
            onDownloadProgress((chunk.length / totalLength) * 100);
          })
          .on("close", res)
          .on("error", (error: Error) => {
            host.log(error.message + "\n" + error.stack, true);
            rej(error);
          })
          .pipe(fs.createWriteStream(destinationPath, { mode: 0o755 }));
      })
      .catch(rej);
  });
};
