import { QuickPickItem, window, commands } from "vscode";
import { DEBUG } from "../../commands/constants";
import { Associate, associateQuery } from "../../ctl/nhctl";
import { KubernetesResourceNode } from "../../nodes/abstract/KubernetesResourceNode";
import { NocalhostRootNode } from "../../nodes/NocalhostRootNode";

export async function startDebug() {
  const queryResult = (await associateQuery({})) as Associate.QueryResult[];

  let associate: Associate.QueryResult;

  if (queryResult.length > 1) {
    let item = window.showQuickPick(
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

    if (!item) {
      return;
    }
  } else {
    associate = queryResult[0];
  }
  const {
    svc_pack: { svc, svc_type, app, ns },
    server,
  } = associate;

  const rootNode = new NocalhostRootNode(null);
  const clusters = await rootNode.getChildren();

  const clusterNode = clusters.find((item) => item.label === server);

  const nameSpaces = await clusterNode.getChildren();

  const namespace = nameSpaces.find((item) => item.label === ns);
  const apps = await namespace.getChildren();
  const application = apps.find((item) => item.label === app);

  const appChildren = await application.getChildren();

  const workloads = appChildren.find((item) => item.label === "Workloads");
  const workload = (await workloads.getChildren()).find(
    (item) => item.label.toLowerCase() === svc_type + "s"
  );

  const node = ((await workload.getChildren()) as KubernetesResourceNode[]).find(
    (item) => item.name === svc
  );
  commands.executeCommand(DEBUG, node);
}
