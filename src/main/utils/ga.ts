import { Analytics } from "@dineug/vscode-google-analytics";

import { v4 as uuidv4 } from "uuid";

import host from "../host";

const analytics = new Analytics("UA-185969461-1");

export function getUUID() {
  let uuid = host.getGlobalState("UUID");
  if (uuid) {
    return uuid;
  }

  uuid = uuidv4();
  host.setGlobalState("UUID", uuid);
  return uuid;
}

export default analytics;
