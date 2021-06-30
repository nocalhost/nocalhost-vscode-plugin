import * as vscode from "vscode";
import * as _ from "lodash";
import { isExistCluster } from "./clusters/utils";
import { BaseNocalhostNode } from "./nodes/types/nodeType";
import host from "./host";
import logger from "./utils/logger";

class State {
  private login = false;

  private stateMap = new Map<string, any>();
  private nodeMap = new Map<string, BaseNocalhostNode>();
  private dataMap = new Map<string, object>();
  public refreshFolderMap = new Map<string, boolean>();

  private renderMessage = new Map<string, number>();

  private running = false;

  constructor() {
    setInterval(() => {
      this.consume();
    }, 500);
  }

  private consume() {
    this.renderMessage.forEach((item, key) => {
      vscode.commands.executeCommand("Nocalhost.refresh", this.getNode(key));
      this.renderMessage.delete(key);
    });
  }

  public setData(id: string, data: object, isInit?: boolean) {
    const currentData = this.dataMap.get(id);
    const startTime = Date.now();
    const isSame = _.isEqual(currentData, data);

    const endTime = Date.now();
    this.dataMap.set(id, data);
    if (!isSame && !isInit) {
      this.renderMessage.set(id, new Date().getTime());
      logger.info("render node id: " + id);
    }
  }

  public getData(id: string) {
    return this.dataMap.get(id);
  }

  public clearAllData() {
    this.dataMap.clear();
  }

  public getNode(id: string | undefined) {
    if (id) {
      return this.nodeMap.get(id);
    }
  }

  public setNode(id: string, node: BaseNocalhostNode) {
    this.nodeMap.set(id, node);
  }

  public isLogin() {
    return this.login;
  }

  public isRunning() {
    return this.running;
  }

  // async setLogin(state: boolean) {
  //   await vscode.commands.executeCommand("setContext", "visibleTree", state);
  //   await vscode.commands.executeCommand("Nocalhost.refresh");
  //   this.login = state;
  //   if (this.login) {
  //     host.startAutoRefresh();
  //   } else {
  //     host.stopAutoRefresh();
  //   }
  // }

  async refreshTree() {
    if (!isExistCluster()) {
      await vscode.commands.executeCommand("setContext", "emptyCluster", false);
    }

    await vscode.commands.executeCommand(
      "setContext",
      "Nocalhost.visibleTree",
      true
    );
    await vscode.commands.executeCommand("Nocalhost.refresh");
    host.startAutoRefresh();
  }

  setRunning(running: boolean) {
    this.running = running;
  }

  get(key: string) {
    return this.stateMap.get(key);
  }

  delete(key: string, args?: { refresh: boolean; node?: BaseNocalhostNode }) {
    this.stateMap.delete(key);
    if (args && args.refresh) {
      vscode.commands.executeCommand("Nocalhost.refresh", args.node);
    }
  }

  set(
    key: string,
    value: any,
    args?: { refresh: boolean; node?: BaseNocalhostNode }
  ) {
    this.stateMap.set(key, value);
    if (args && args.refresh) {
      vscode.commands.executeCommand("Nocalhost.refresh", args.node);
    }
  }

  getAllAppState(appName: string) {
    let appMap: Map<string, any> = this.get(appName);
    if (!appMap) {
      appMap = new Map<string, any>();
    }

    return appMap;
  }

  async setAppState(
    appName: string,
    key: string,
    value: any,
    args?: { refresh: boolean; nodeStateId?: string }
  ) {
    const appMap = this.getAllAppState(appName);
    appMap.set(key, value);
    if (args && args.refresh) {
      await vscode.commands.executeCommand(
        "Nocalhost.refresh",
        this.getNode(args.nodeStateId)
      );
    }
    this.set(appName, appMap);
  }

  getAppState(appName: string, key: string) {
    const appMap = this.getAllAppState(appName);
    return appMap.get(key);
  }

  async deleteAppState(
    appName: string,
    key: string,
    args?: { refresh: boolean; nodeStateId?: string }
  ) {
    const appMap = this.getAllAppState(appName);
    appMap.delete(key);
    if (args && args.refresh) {
      await vscode.commands.executeCommand(
        "Nocalhost.refresh",
        this.getNode(args.nodeStateId)
      );
    }
    this.set(appName, appMap);
  }
}

export default new State();
