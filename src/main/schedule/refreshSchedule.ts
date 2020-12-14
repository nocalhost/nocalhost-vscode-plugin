import NocalhostAppProvider from "../appProvider";
import { BaseNocalhostNode } from "../nodes/types/nodeType";
import { ISchedule } from "./schedule.type";

const REFRESH_FOLDER_NAMES: string[] = [
  "Deployments",
  "StatefulSets",
  "DaemonSets",
  "Jobs",
  "CronJobs",
  "Pods",
  "Services",
];
const TIMEOUT_MS: number = 8000;
enum ScheduleStatus {
  running = "running",
  pending = "pending",
  stop = "stop",
}

let instance: RefreshSchedule;

class RefreshSchedule implements ISchedule {
  private appProvider: NocalhostAppProvider | null = null;
  private nodeMap: Map<string, any> = new Map<string, any>();
  private status = ScheduleStatus.stop;
  private taskTimer: NodeJS.Timer | null = null;

  constructor(appProvider?: NocalhostAppProvider) {
    if (appProvider) {
      this.appProvider = appProvider;
    }
  }

  getNode(key: string): BaseNocalhostNode | undefined {
    return this.nodeMap.get(key);
  }

  addNode(node: BaseNocalhostNode): boolean {
    if (
      !node.label ||
      !REFRESH_FOLDER_NAMES.includes(node.label) ||
      typeof node.getNodeStateId !== "function"
    ) {
      return false;
    }
    this.nodeMap.set(node.getNodeStateId(), node);
    return true;
  }

  removeNode(node: BaseNocalhostNode): boolean {
    if (
      !node.label ||
      !REFRESH_FOLDER_NAMES.includes(node.label) ||
      typeof node.getNodeStateId !== "function" ||
      !this.nodeMap.has(node.getNodeStateId())
    ) {
      return false;
    }
    this.nodeMap.delete(node.getNodeStateId());
    return true;
  }

  excuteTask(timeout?: number) {
    this.taskTimer = setTimeout(() => {
      this.task.call(this);
      this.excuteTask();
    }, timeout || TIMEOUT_MS);
  }

  task() {
    if (this.status === ScheduleStatus.running) {
      for (const node of this.nodeMap.values()) {
        if (this.appProvider) {
          process.nextTick(() => {
            if (this.appProvider) {
              this.appProvider.refresh(node);
            }
          });
        }
      }
    }
  }

  terminate(timeout = TIMEOUT_MS) {
    if (this.status === ScheduleStatus.running && this.taskTimer) {
      this.status = ScheduleStatus.running;
      clearTimeout(this.taskTimer);
      process.nextTick(() => {
        this.status = ScheduleStatus.running;
        this.excuteTask.call(this, timeout);
      });
    }
  }

  start() {
    this.status = ScheduleStatus.running;
    this.excuteTask();
  }

  stop() {
    this.status = ScheduleStatus.stop;
    if (this.taskTimer) {
      clearTimeout(this.taskTimer);
    }
  }
}

export type IRefreshSchedule = RefreshSchedule;
export default {
  getInstance(appProvider?: NocalhostAppProvider): IRefreshSchedule {
    if (!instance) {
      instance = new RefreshSchedule(appProvider);
    }
    return instance;
  },
};
