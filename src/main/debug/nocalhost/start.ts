import * as assert from "assert";
import { QuickPickItem, window, commands } from "vscode";

import { DEBUG } from "../../commands/constants";
import { DISASSOCIATE_ASSOCIATE } from "../../component/syncManage";
import { Associate, associateQuery } from "../../ctl/nhctl";
import host from "../../host";
import { NocalhostRootNode } from "../../nodes/NocalhostRootNode";
import { BaseNocalhostNode } from "../../nodes/types/nodeType";
import logger from "../../utils/logger";

export async function startDebug() {
  const resourceNode = await getResourceNode();

  if (!resourceNode) {
    return;
  }

  commands.executeCommand(DEBUG, resourceNode);
}

async function getAssociate() {
  const queryResult = (await associateQuery({})) as Associate.QueryResult[];

  let associate: Associate.QueryResult;

  if (queryResult.length > 1) {
    let select = await window.showQuickPick(
      queryResult.map((item) => {
        const {
          svc_pack: { svc, svc_type, app, ns },
          server,
        } = item;
        return {
          label: svc,
          description: [server, ns, app, svc_type].join("/"),
        } as QuickPickItem;
      })
    );

    if (!select) {
      return Promise.reject();
    }

    associate = queryResult.find((item) => {
      const {
        svc_pack: { svc, svc_type, app, ns },
        server,
      } = item;

      return (
        svc === select.label &&
        select.description === [server, ns, app, svc_type].join("/")
      );
    });
  } else {
    associate = queryResult[0];
  }

  assert(associate, "No associated workload found, please associate");

  return associate;
}

async function getResourceNode() {
  const associate = await getAssociate();

  const {
    svc_pack: { svc, svc_type, app, ns },
    server,
  } = associate;

  return await host.withProgress(
    {
      title: "Get debugging configuration...",
      cancellable: true,
    },
    async (_, token) => {
      return [
        server,
        ns,
        app === "default.application" ? "default" : app,
        "Workloads",
        svc_type + "s",
        svc,
      ]
        .reduce(async (parent, label) => {
          if (token.isCancellationRequested) {
            return null;
          }

          const children = await (await parent).getChildren();

          return children.find(
            (item) => item.label.toLowerCase() === label.toLowerCase()
          );
        }, Promise.resolve(new NocalhostRootNode(null) as BaseNocalhostNode))
        .catch((error) => {
          logger.error("getResourceNode", error);

          disassociate(associate);

          return null;
        });
    }
  );
}
async function disassociate(associate: Associate.QueryResult) {
  const result = await host.showErrorMessage(
    "Failed to get debugging configuration, whether to disassociate the workload? ",
    "Disassociate",
    "Cancel"
  );
  if (result === "Disassociate") {
    commands.executeCommand(DISASSOCIATE_ASSOCIATE, {
      associate,
      currentPath: host.getCurrentRootPath(),
    });
  }
}
