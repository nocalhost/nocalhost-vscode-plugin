import * as fs from "fs";
import * as path from "path";
import { isEqual } from "lodash";

import { PLUGIN_CONFIG_DIR } from "../constants";
import host from "../host";
import * as fileUtil from "./fileUtil";

export type EventType = {
  uninstall: {
    devSpaceName: string;
    appName: string;
  };
  install: {
    status: "loading" | "end";
  };
  endDevMode: {
    devSpaceName: string;
    appName: string;
    workloadName: string;
  };
  devStart: {};
  refreshTree: {};
  command: {
    parameter: {
      kubeconfig: string;
      nameSpace: string;
      app: string;
      service: string;
      resourceType: string;
    };
    name: string;
  };
};

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
  private eventMap = new Map<
    string,
    Array<(value: MessageBusInfo & { isCurrentWorkspace: boolean }) => void>
  >();
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
        if (!isEqual(this.content[key], value)) {
          if (
            this.content[key] &&
            this.content[key].timestamp < value.timestamp
          ) {
            arr.forEach((callback) => {
              callback({
                ...value,
                isCurrentWorkspace: host.getCurrentRootPath() === value.source,
              });
            });
            this.content[key] = value;
          }
        }
      });
    });
  }

  on<T extends keyof EventType, K extends EventType[T]>(
    eventName: T,
    callback: (
      value: MessageBusInfo & K & { isCurrentWorkspace: boolean }
    ) => void
  ) {
    let arr = this.eventMap.get(eventName);
    if (!arr) {
      arr = [];
      this.eventMap.set(eventName, arr);
    }

    arr.push(callback as any);
  }

  emit<T extends keyof EventType, K extends EventType[T]>(
    eventName: T,
    value: K,
    destination?: string
  ) {
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
