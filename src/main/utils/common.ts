import * as crypto from "crypto";

export function getStringHash(str: string): string {
  var shasum = crypto.createHash("md5");
  shasum.update(str);
  return shasum.digest("hex");
}
