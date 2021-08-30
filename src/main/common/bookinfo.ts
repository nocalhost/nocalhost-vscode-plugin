import { AppNode } from "../nodes/AppNode";
import { DevSpaceNode } from "../nodes/DevSpaceNode";
import state from "../state";
import logger from "../utils/logger";
import host from "../host";
import * as vscode from "vscode";
import { NhctlCommand } from "../ctl/nhctl";
import { INhCtlGetResult, IResourceStatus } from "../domain";
import { NocalhostFolderNode } from "../nodes/abstract/NocalhostFolderNode";

class Bookinfo {
  app: AppNode;
  startTime: number;
  timeoutId: NodeJS.Timeout;
  port: string;
  callBack: {
    cancell: Function;
    succes: Function;
  };

  private static checkList: Bookinfo[] = [];

  constructor(app: AppNode) {
    this.app = app;
    this.startTime = new Date().getTime();
  }

  static checkInstall(app: AppNode) {
    const isBookInfo =
      [
        "https://github.com/nocalhost/bookinfo.git",
        "git@github.com:nocalhost/bookinfo.git",
        "https://e.coding.net/codingcorp/nocalhost/bookinfo.git",
        "git@e.coding.net:codingcorp/nocalhost/bookinfo.git",
      ].includes(app.url) && app.name === "bookinfo";

    if (!isBookInfo) {
      return;
    }

    let bookinfo = new Bookinfo(app);
    this.checkList.push(bookinfo);

    host.showProgressingToken(
      {
        title: "Waiting for deployment ready.",
        cancellable: true,
        location: vscode.ProgressLocation.Notification,
      },
      async (progress, token) => {
        token.onCancellationRequested(() => {
          Bookinfo.cleanCheck(bookinfo.app);
          bookinfo.callBack.cancell();
        });
        return new Promise((succes, cancell) => {
          bookinfo.timeoutId = setTimeout(
            () => bookinfo.checkState(),
            2 * 1000
          );
          bookinfo.callBack = {
            cancell,
            succes,
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
          clearTimeout(bookinfo.timeoutId);
          bookinfo.callBack.cancell();
        }

        this.checkList.splice(index, 1);
      }
    });
  }
  private async checkBookInfoStatus(appNode: AppNode) {
    const result = (await NhctlCommand.get({
      kubeConfigPath: appNode.getKubeConfigPath(),
      namespace: appNode.namespace,
    })
      .addArgument("Deployments")
      .addArgument("-a", appNode.name)
      .addArgument("-o", "json")
      .toJson()
      .exec()) as INhCtlGetResult[];

    const productpage = result.find(
      (item) => item.description?.actualName === "productpage"
    );

    const status = productpage.info?.status as IResourceStatus;

    if (status?.conditions) {
      return status?.conditions.some(
        (item) => item.type === "Available" && item.status === "True"
      );
    }

    return false;
  }
  async getProt() {
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

        return false;
      }

      this.port = port;

      return port;
    }

    return true;
  }
  async openUrl() {
    const url = `http://127.0.0.1:${this.port}/productpage`;

    const res = await host.showInformationMessage(
      "Do you want to open the browser to access application?",
      { modal: true },
      "go"
    );

    if (res === "go") {
      const uri = vscode.Uri.parse(url);
      vscode.env.openExternal(uri);
    }
  }
  async checkState() {
    const devSpaceNode = this.app.parent as DevSpaceNode;

    if (
      state.getAppState(devSpaceNode.getNodeStateId(), "uninstalling") === true
    ) {
      this.callBack.cancell();
      return;
    }

    const MAX_TIME = 1 * 60 * 1000;
    const diff = new Date().getTime() - this.startTime;

    if (diff > MAX_TIME) {
      const message = "Waiting time out";

      logger.info(message);
      this.callBack.cancell(message);

      return;
    }

    if (!(await this.getProt())) {
      return;
    }

    if (await this.checkBookInfoStatus(this.app).catch(() => {})) {
      this.openUrl();
      Bookinfo.cleanCheck(this.app);
      this.callBack.succes();
      return;
    }
    this.timeoutId = setTimeout(() => this.checkState(), 2 * 1000);
  }
}

export default Bookinfo;
