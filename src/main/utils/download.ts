import * as fs from "fs";
import * as path from "path";
import * as request from "request";
import host from "../host";
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
