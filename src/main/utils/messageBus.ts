import * as fs from "fs";
import * as path from "path";
import * as _ from "lodash";

import { PLUGIN_CONFIG_DIR } from "../constants";
import host from "../host";

import * as fileUtil from "./fileUtil";

export interface MessageBusInfo {
  source: string;
  destination: string;
  value: object;
  timestamp: number;
}

export interface FileMessageInfo {
  [key: string]: MessageBusInfo;
}

class MessageBus {
  private static filePath: string = path.resolve(
    PLUGIN_CONFIG_DIR,
    "eventMessage"
  );
  private eventMap = new Map<string, Array<(value: MessageBusInfo) => void>>();
  private content: FileMessageInfo = {};
  async init() {
    const isExist = await fileUtil.isExist(MessageBus.filePath);

    if (!isExist) {
      fileUtil.writeFile(MessageBus.filePath, JSON.stringify({}));
    }

    const content = await fileUtil.readFile(MessageBus.filePath);
    if (content) {
      this.content = JSON.parse(content);
    }

    fs.watchFile(MessageBus.filePath, { interval: 1000 }, (curr, prev) => {
      const contentstr = fs.readFileSync(MessageBus.filePath);
      const content = JSON.parse(contentstr.toString()) as FileMessageInfo;
      this.eventMap.forEach((arr, key) => {
        const value = content[key];
        if (!_.isEqual(this.content[key], value)) {
          if (this.content[key]) {
            if (this.content[key].timestamp < value.timestamp) {
              host.log(`${key}, chuckie`, true);
              arr.forEach((callback) => {
                callback(value);
              });
              this.content[key] = value;
            }
          } else {
            host.log(`${key}, chuckie`, true);
            arr.forEach((callback) => {
              callback(value);
            });
            this.content[key] = value;
          }
        }
      });
    });
  }

  on(eventName: string, callback: (value: MessageBusInfo) => void) {
    let arr = this.eventMap.get(eventName);
    if (!arr) {
      arr = [];
      this.eventMap.set(eventName, arr);
    }

    arr.push(callback);
  }

  emit(eventName: string, value: object, destination?: string) {
    // read file
    const content = fs.readFileSync(MessageBus.filePath).toString("utf-8");
    const obj = JSON.parse(content) as FileMessageInfo;

    obj[eventName] = {
      source: host.getCurrentRootPath() || "",
      destination: destination || "",
      timestamp: new Date().getTime(),
      value,
    };

    fs.writeFileSync(MessageBus.filePath, JSON.stringify(obj, undefined, 2));
  }
}

export default new MessageBus();
