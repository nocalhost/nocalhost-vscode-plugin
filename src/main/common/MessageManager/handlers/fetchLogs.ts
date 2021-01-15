import { IMessage } from "..";
import NocalhostWebviewPanel from "../../../webview/NocalhostWebviewPanel";
import DataCenter from "../../DataCenter";
import ApplicationMeta from "../../DataCenter/model/ApplicationMeta";
import services from "../../DataCenter/services";

const dataCenter = DataCenter.getInstance();

export default async function fetchLogs(message: IMessage, id: number) {
  const { payload } = message;
  if (
    !payload ||
    !payload.id ||
    !payload.app ||
    !payload.pod ||
    !payload.container
  ) {
    return;
  }
  const applicationMeta:
    | ApplicationMeta
    | undefined = dataCenter.getApplicationMeta(payload.app);
  if (applicationMeta) {
    const kubeConfig: string = applicationMeta.kubeconfig;
    const res: string = await services.fetchLogs(
      payload.pod,
      payload.container,
      payload.tail,
      kubeConfig
    );
    const items: string[] = res.split("\n");
    NocalhostWebviewPanel.postMessage(
      {
        type: "logs/update",
        payload: {
          logs: {
            id: payload.id,
            items,
          },
        },
      },
      id
    );
  }
}
