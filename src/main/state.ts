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
    const isSame = _.isEqual(currentData, data);

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

  async refreshTree() {
    const isExist = isExistCluster();

    await vscode.commands.executeCommand(
      "setContext",
      "emptyCluster",
      !isExist
    );

    await vscode.commands.executeCommand(
      "setContext",
      "Nocalhost.visibleTree",
      isExist
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

  private getAllAppState(appId: string) {
    let appMap: Map<string, any> = this.get(appId);
    if (!appMap) {
      appMap = new Map<string, any>();
    }

    return appMap;
  }

  async setAppState(
    appId: string,
    key: string,
    value: any,
    args?: { refresh: boolean; nodeStateId?: string }
  ) {
    const appMap = this.getAllAppState(appId);
    appMap.set(key, value);
    if (args && args.refresh) {
      await vscode.commands.executeCommand(
        "Nocalhost.refresh",
        this.getNode(args.nodeStateId)
      );
    }
    this.set(appId, appMap);
  }

  getAppState(appId: string, key: string) {
    const appMap = this.getAllAppState(appId);
    return appMap.get(key);
  }

  async deleteAppState(
    appId: string,
    key: string,
    args?: { refresh: boolean; nodeStateId?: string }
  ) {
    const appMap = this.getAllAppState(appId);
    appMap.delete(key);
    if (args && args.refresh) {
      await vscode.commands.executeCommand(
        "Nocalhost.refresh",
        this.getNode(args.nodeStateId)
      );
    }
    this.set(appId, appMap);
  }
  async cleanAutoRefresh(node: BaseNocalhostNode) {
    for (let key of this.refreshFolderMap.keys()) {
      if ((key as string).startsWith(node.getNodeStateId())) {
        logger.debug("cleanAutoRefresh", key);
        this.refreshFolderMap.delete(key);
      }
    }
  }
}

export default new State();
