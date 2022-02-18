import * as vscode from "vscode";
import Axios from "axios";
import AsyncRetry = require("async-retry");

import { AppNode } from "../nodes/AppNode";
import { DevSpaceNode } from "../nodes/DevSpaceNode";
import state from "../state";
import logger from "../utils/logger";
import host from "../host";
import { NocalhostFolderNode } from "../nodes/abstract/NocalhostFolderNode";

class Bookinfo {
  app: AppNode;
  port: string;
  callBack: {
    canceled: Function;
    success: Function;
  };

  private static checkList: Bookinfo[] = [];

  constructor(app: AppNode) {
    this.app = app;
  }

  static checkInstall(app: AppNode) {
    if (process.env.puppeteer) {
      return;
    }

    const isBookInfo =
      [
        "https://github.com/nocalhost/bookinfo.git",
        "git@github.com:nocalhost/bookinfo.git",
        "https://e.coding.net/nocalhost/nocalhost/bookinfo.git",
        "git@e.coding.net:nocalhost/nocalhost/bookinfo.git",
      ].includes(app.url) && app.name === "bookinfo";

    if (!isBookInfo) {
      return;
    }

    let bookinfo = new Bookinfo(app);
    this.checkList.push(bookinfo);

    host.withProgress(
      {
        title: "Waiting for deployment ready.",
        cancellable: true,
        location: vscode.ProgressLocation.Notification,
      },
      async (_, token) => {
        token.onCancellationRequested(() => {
          Bookinfo.cleanCheck(bookinfo.app);
          bookinfo.callBack.canceled();
        });
        return new Promise((success, canceled) => {
          bookinfo.checkConnect();
          bookinfo.callBack = {
            canceled,
            success,
          };
        }).catch((err) => {
          host.showWarnMessage(err);
          return;
        });
      }
    );
  }
  static cleanCheck(node: NocalhostFolderNode) {
    this.checkList.forEach((item, index) => {
      if (item.app.getNodeStateId().startsWith(node.getNodeStateId())) {
        const bookinfo = this.checkList[index];
        if (bookinfo) {
          bookinfo.callBack.canceled();
        }

        this.checkList.splice(index, 1);
      }
    });
  }
  static existCheck(node: NocalhostFolderNode) {
    return (
      this.checkList.findIndex((item) =>
        item.app.getNodeStateId().startsWith(node.getNodeStateId())
      ) > -1
    );
  }

  async getUrl() {
    if (!this.port) {
      let port: string;
      const nocalhostConfig = await this.app.getNocalhostConfig();

      if (nocalhostConfig?.services?.length) {
        const productpage = nocalhostConfig.services.find(
          (item) => item.name === "productpage"
        );

        if (productpage.containers.length) {
          const ports = productpage.containers
            .map((item) => item.install?.portForward ?? [])
            .flat();

          if (ports.length) {
            port = ports[0].split(":")[0];
          }
        }
      } else {
        logger.info("appname: " + this.app.name + "not service config");

        throw new Error("appname: " + this.app.name + "not service config");
      }

      this.port = port;
    }

    return `http://127.0.0.1:${this.port}/productpage`;
  }

  async openUrl() {
    const res = await host.showInformationMessage(
      "Do you want to open the browser to access application?",
      { modal: true },
      "go"
    );

    if (res === "go") {
      const uri = vscode.Uri.parse(await this.getUrl());
      vscode.env.openExternal(uri);
    }
  }
  async check() {
    const devSpaceNode = this.app.parent as DevSpaceNode;

    if (
      !Bookinfo.existCheck(this.app) ||
      state.getAppState(devSpaceNode.getNodeStateId(), "uninstalling") === true
    ) {
      return false;
    }

    await Axios.get(await this.getUrl()).then(() => {
      this.openUrl();
      this.callBack.success();
    });
  }
  async checkConnect() {
    const url = await this.getUrl();
    try {
      await AsyncRetry(async () => this.check(), {
        randomize: false,
        retries: 6,
      });
    } catch (err) {
      logger.warn("checkConnect:", url, err);
      this.callBack.canceled("Waiting time out");
    } finally {
      Bookinfo.cleanCheck(this.app);
    }
  }
}

export default Bookinfo;
